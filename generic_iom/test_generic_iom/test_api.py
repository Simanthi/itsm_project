from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from django.db.models import Q

from generic_iom.models import IOMCategory, IOMTemplate, GenericIOM

User = get_user_model()

class IOMTemplateAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(username='admin_api_generic', email='admin_api_generic@example.com', password='password123')
        cls.normal_user = User.objects.create_user(username='user_api_generic', email='user_api_generic@example.com', password='password123')

        # Count existing categories due to data migration before creating a new one for tests
        # This avoids clashes if "API Test Category" is created by data migration
        existing_categories_count = IOMCategory.objects.count()
        cls.category_name = f"API Test Category {existing_categories_count + 1}"
        cls.category = IOMCategory.objects.create(name=cls.category_name)

        cls.template_data = {
            "name": "API Test Template",
            "category": cls.category.pk,
            "fields_definition": [{"name": "title", "label": "Title", "type": "text", "required": True}],
            "approval_type": "none",
        }

        # Count existing templates before creating one for tests
        existing_templates_count = IOMTemplate.objects.count()
        cls.template_name = f"Existing Template {existing_templates_count + 1}"
        cls.template = IOMTemplate.objects.create(
            name=cls.template_name,
            category=cls.category,
            created_by=cls.admin_user,
            fields_definition=[{"name": "body", "label": "Body", "type": "textarea"}],
            approval_type='simple',
            simple_approval_user=cls.admin_user
        )

    def test_list_templates_authenticated(self):
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if at least the template created in setUpTestData is present
        # The total number can vary due to data migrations
        self.assertTrue(any(t['name'] == self.template_name for t in response.data['results']))


    def test_list_templates_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_template_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        initial_template_count = IOMTemplate.objects.count()
        response = self.client.post(reverse('generic_iom:iomtemplate-list'), self.template_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(IOMTemplate.objects.count(), initial_template_count + 1)
        self.assertEqual(response.data['name'], "API Test Template")
        self.assertEqual(response.data['created_by'], self.admin_user.pk)


    def test_create_template_normal_user_forbidden(self):
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.post(reverse('generic_iom:iomtemplate-list'), self.template_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_template_authenticated(self):
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get(reverse('generic_iom:iomtemplate-detail', kwargs={'pk': self.template.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.template.name)

    def test_update_template_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        updated_data = {"name": "Updated API Template Name", "is_active": False}
        response = self.client.patch(reverse('generic_iom:iomtemplate-detail', kwargs={'pk': self.template.pk}), updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, "Updated API Template Name")
        self.assertFalse(self.template.is_active)

    def test_delete_template_admin(self):
        # Create a new template specifically for this test to delete
        # to avoid issues with cls.template being used by other tests if tests run in parallel or different order
        template_to_delete = IOMTemplate.objects.create(
            name="Template To Delete For Test",
            category=self.category,
            created_by=self.admin_user
        )
        self.client.force_authenticate(user=self.admin_user)
        initial_template_count = IOMTemplate.objects.count()

        response = self.client.delete(reverse('generic_iom:iomtemplate-detail', kwargs={'pk': template_to_delete.pk}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(IOMTemplate.objects.count(), initial_template_count - 1)
        self.assertFalse(IOMTemplate.objects.filter(pk=template_to_delete.pk).exists())

class GenericIOMAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user1 = User.objects.create_user(username='user1_giom_api', password='password123')
        cls.user2 = User.objects.create_user(username='user2_giom_api', password='password123')
        cls.admin_user = User.objects.create_superuser(username='adminapi_giom_api', password='password123')

        cls.category = IOMCategory.objects.create(name="API IOM Test Category")
        cls.template_no_approval = IOMTemplate.objects.create(
            name="No Approval API Test Template",
            created_by=cls.admin_user,
            category=cls.category,
            approval_type='none',
            fields_definition=[{"name": "message", "label": "Message", "type": "textarea"}]
        )
        cls.template_simple_approval = IOMTemplate.objects.create(
            name="Simple Approval API Test Template",
            created_by=cls.admin_user,
            category=cls.category,
            approval_type='simple',
            simple_approval_user=cls.user2,
            fields_definition=[{"name": "detail", "label": "Detail", "type": "text", "required": True}]
        )
        cls.iom_data_valid = {
            "iom_template": cls.template_no_approval.pk,
            "subject": "API Test IOM Subject",
            "data_payload": {"message": "Test content from API"}
        }
        cls.iom_simple_data_valid = {
            "iom_template": cls.template_simple_approval.pk,
            "subject": "API Simple IOM Subject",
            "data_payload": {"detail": "Needs simple approval"}
        }

    def test_create_generic_iom_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(reverse('generic_iom:genericiom-list'), self.iom_data_valid, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], "API Test IOM Subject")
        self.assertEqual(response.data['created_by'], self.user1.pk)
        self.assertEqual(response.data['status'], 'draft')
        self.assertIsNotNone(response.data['gim_id'])

    def test_create_generic_iom_inactive_template_forbidden(self):
        self.template_no_approval.is_active = False
        self.template_no_approval.save()
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(reverse('generic_iom:genericiom-list'), self.iom_data_valid, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('inactive template' in str(response.data).lower())
        self.template_no_approval.is_active = True # Reset for other tests
        self.template_no_approval.save()


    def test_create_generic_iom_missing_required_payload_field(self):
        self.client.force_authenticate(user=self.user1)
        invalid_payload_data = {
            "iom_template": self.template_simple_approval.pk,
            "subject": "Missing Payload Test",
            "data_payload": {"wrong_field": "some data"}
        }
        response = self.client.post(reverse('generic_iom:genericiom-list'), invalid_payload_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('data_payload', response.data)
        self.assertIn('is missing or empty', str(response.data['data_payload']))


    def test_list_generic_ioms_user_sees_own_and_published(self):
        GenericIOM.objects.create(iom_template=self.template_no_approval, subject="User1 Draft GIOM", created_by=self.user1, status='draft', data_payload={"message": "draft msg"})
        GenericIOM.objects.create(iom_template=self.template_no_approval, subject="User2 Published GIOM", created_by=self.user2, status='published', data_payload={"message": "published msg"})

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('generic_iom:genericiom-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        subjects_seen = [item['subject'] for item in response.data['results']]
        self.assertIn("User1 Draft GIOM", subjects_seen)
        self.assertIn("User2 Published GIOM", subjects_seen)

    def test_retrieve_generic_iom_owner(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject=self.iom_data_valid['subject'],
            data_payload=self.iom_data_valid['data_payload'],
            created_by=self.user1
        )
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_generic_iom_non_owner_published(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject=self.iom_data_valid['subject'],
            data_payload=self.iom_data_valid['data_payload'],
            created_by=self.user1, # Created by user1
            status='published'
        )
        iom.to_users.add(self.user2) # user2 is a recipient

        self.client.force_authenticate(user=self.user2) # Authenticated as user2
        response = self.client.get(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_update_generic_iom_owner_draft(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject=self.iom_data_valid['subject'],
            data_payload=self.iom_data_valid['data_payload'],
            created_by=self.user1,
            status='draft'
        )
        self.client.force_authenticate(user=self.user1)
        update_data = {"subject": "Updated Subject by Owner GIOM", "data_payload": {"message": "Updated content"}}
        response = self.client.patch(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}), update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.subject, "Updated Subject by Owner GIOM")

    def test_update_generic_iom_owner_not_draft_forbidden(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject=self.iom_data_valid['subject'],
            data_payload=self.iom_data_valid['data_payload'],
            created_by=self.user1,
            status='published'
        )
        self.client.force_authenticate(user=self.user1)
        update_data = {"subject": "Attempt Update Published GIOM"}
        response = self.client.patch(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}), update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_for_simple_approval_owner_draft(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject=self.iom_simple_data_valid['subject'],
            data_payload=self.iom_simple_data_valid['data_payload'],
            created_by=self.user1,
            status='draft'
        )
        self.client.force_authenticate(user=self.user1)
        url = reverse('generic_iom:genericiom-submit-for-simple-approval', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'pending_approval')

    def test_simple_approve_assigned_user(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject=self.iom_simple_data_valid['subject'],
            data_payload=self.iom_simple_data_valid['data_payload'],
            created_by=self.user1,
            status='pending_approval'
        )
        self.client.force_authenticate(user=self.user2)
        url = reverse('generic_iom:genericiom-simple-approve', kwargs={'pk': iom.pk})
        response = self.client.post(url, {"comments": "Looks good!"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'approved')
        self.assertEqual(iom.simple_approver_action_by, self.user2)
        self.assertEqual(iom.simple_approval_comments, "Looks good!")

    def test_simple_reject_assigned_user_requires_comments(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject=self.iom_simple_data_valid['subject'],
            data_payload=self.iom_simple_data_valid['data_payload'],
            created_by=self.user1,
            status='pending_approval'
        )
        self.client.force_authenticate(user=self.user2)
        url = reverse('generic_iom:genericiom-simple-reject', kwargs={'pk': iom.pk})
        response = self.client.post(url, {"comments": ""}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_iom_no_approval_from_draft_by_owner(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject=self.iom_data_valid['subject'],
            data_payload=self.iom_data_valid['data_payload'],
            created_by=self.user1,
            status='draft'
        )
        self.client.force_authenticate(user=self.user1)
        url = reverse('generic_iom:genericiom-publish', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'published')
        self.assertIsNotNone(iom.published_at)

    def test_publish_iom_simple_approval_from_approved_by_owner(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject=self.iom_simple_data_valid['subject'],
            data_payload=self.iom_simple_data_valid['data_payload'],
            created_by=self.user1,
            status='approved',
            simple_approver_action_by=self.user2
        )
        self.client.force_authenticate(user=self.user1)
        url = reverse('generic_iom:genericiom-publish', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'published')
