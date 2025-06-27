from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from generic_iom.models import IOMCategory, IOMTemplate, GenericIOM
# from .serializers import IOMTemplateSerializer, GenericIOMSerializer # Not directly used in test usually

User = get_user_model()

class IOMTemplateAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
        cls.normal_user = User.objects.create_user(username='user', email='user@example.com', password='password123')
        cls.category = IOMCategory.objects.create(name="API Test Category")
        cls.template_data = {
            "name": "API Test Template",
            "category": cls.category.pk,
            "fields_definition": [{"name": "title", "label": "Title", "type": "text", "required": True}],
            "approval_type": "none",
        }
        cls.template = IOMTemplate.objects.create(
            name="Existing Template",
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
        self.assertTrue(len(response.data['results']) >= 1) # Should see 'Existing Template'

    def test_list_templates_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_template_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(reverse('generic_iom:iomtemplate-list'), self.template_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IOMTemplate.objects.count(), 2) # Existing + new one
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
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(reverse('generic_iom:iomtemplate-detail', kwargs={'pk': self.template.pk}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(IOMTemplate.objects.count(), 0) # Initial template deleted

class GenericIOMAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user1 = User.objects.create_user(username='user1', password='password123')
        cls.user2 = User.objects.create_user(username='user2', password='password123') # For simple approval
        cls.admin_user = User.objects.create_superuser(username='adminapi', password='password123')

        cls.category = IOMCategory.objects.create(name="API IOM Category")
        cls.template_no_approval = IOMTemplate.objects.create(
            name="No Approval API Template",
            created_by=cls.admin_user,
            category=cls.category,
            approval_type='none',
            fields_definition=[{"name": "message", "label": "Message", "type": "textarea"}]
        )
        cls.template_simple_approval = IOMTemplate.objects.create(
            name="Simple Approval API Template",
            created_by=cls.admin_user,
            category=cls.category,
            approval_type='simple',
            simple_approval_user=cls.user2, # user2 is the approver
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
        self.assertEqual(response.data['status'], 'draft') # Default status
        self.assertIsNotNone(response.data['gim_id'])

    def test_create_generic_iom_inactive_template_forbidden(self):
        self.template_no_approval.is_active = False
        self.template_no_approval.save()
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(reverse('generic_iom:genericiom-list'), self.iom_data_valid, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # Or specific error from perform_create
        # The actual error might be a ValidationError from perform_create, leading to 400
        self.assertTrue('inactive template' in str(response.data).lower())


    def test_create_generic_iom_missing_required_payload_field(self):
        self.client.force_authenticate(user=self.user1)
        invalid_payload_data = {
            "iom_template": self.template_simple_approval.pk, # This template has "detail" as required
            "subject": "Missing Payload Test",
            "data_payload": {"wrong_field": "some data"} # "detail" is missing
        }
        response = self.client.post(reverse('generic_iom:genericiom-list'), invalid_payload_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('data_payload', response.data)
        self.assertIn('is missing or empty', str(response.data['data_payload']))


    def test_list_generic_ioms_user_sees_own_and_published(self):
        # User1 creates a draft IOM
        GenericIOM.objects.create(iom_template=self.template_no_approval, subject="User1 Draft", created_by=self.user1, status='draft')
        # User2 creates a published IOM
        GenericIOM.objects.create(iom_template=self.template_no_approval, subject="User2 Published", created_by=self.user2, status='published')

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('generic_iom:genericiom-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        subjects_seen = [item['subject'] for item in response.data['results']]
        self.assertIn("User1 Draft", subjects_seen)
        self.assertIn("User2 Published", subjects_seen) # Due to simplified list queryset for published
        # More precise check if CanViewGenericIOM was fully applied at list level would be harder here.
        # For now, this confirms the queryset logic for list view.

    def test_retrieve_generic_iom_owner(self):
        iom = GenericIOM.objects.create(**self.iom_data_valid, created_by=self.user1)
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_generic_iom_non_owner_published(self):
        iom = GenericIOM.objects.create(**self.iom_data_valid, created_by=self.user1, status='published')
        # user2 is not creator, not direct recipient, not in group recipient.
        # but if published, CanViewGenericIOM allows view if they are recipient or staff.
        # For this test, let's assume user2 is a recipient for simplicity to test CanViewGenericIOM.
        iom.to_users.add(self.user2)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_update_generic_iom_owner_draft(self):
        iom = GenericIOM.objects.create(**self.iom_data_valid, created_by=self.user1, status='draft')
        self.client.force_authenticate(user=self.user1)
        update_data = {"subject": "Updated Subject by Owner", "data_payload": {"message": "Updated content"}}
        response = self.client.patch(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}), update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.subject, "Updated Subject by Owner")

    def test_update_generic_iom_owner_not_draft_forbidden(self):
        iom = GenericIOM.objects.create(**self.iom_data_valid, created_by=self.user1, status='published')
        self.client.force_authenticate(user=self.user1)
        update_data = {"subject": "Attempt Update Published"}
        response = self.client.patch(reverse('generic_iom:genericiom-detail', kwargs={'pk': iom.pk}), update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) # Due to IsOwnerOrReadOnlyGenericIOM

    def test_submit_for_simple_approval_owner_draft(self):
        iom = GenericIOM.objects.create(**self.iom_simple_data_valid, created_by=self.user1, status='draft')
        self.client.force_authenticate(user=self.user1)
        url = reverse('generic_iom:genericiom-submit-for-simple-approval', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'pending_approval')

    def test_simple_approve_assigned_user(self):
        iom = GenericIOM.objects.create(**self.iom_simple_data_valid, created_by=self.user1, status='pending_approval')
        self.client.force_authenticate(user=self.user2) # user2 is simple_approval_user
        url = reverse('generic_iom:genericiom-simple-approve', kwargs={'pk': iom.pk})
        response = self.client.post(url, {"comments": "Looks good!"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'approved')
        self.assertEqual(iom.simple_approver_action_by, self.user2)
        self.assertEqual(iom.simple_approval_comments, "Looks good!")

    def test_simple_reject_assigned_user_requires_comments(self):
        iom = GenericIOM.objects.create(**self.iom_simple_data_valid, created_by=self.user1, status='pending_approval')
        self.client.force_authenticate(user=self.user2)
        url = reverse('generic_iom:genericiom-simple-reject', kwargs={'pk': iom.pk})
        response = self.client.post(url, {"comments": ""}, format='json') # No comments
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # Comments required

    def test_publish_iom_no_approval_from_draft_by_owner(self):
        iom = GenericIOM.objects.create(**self.iom_data_valid, created_by=self.user1, status='draft')
        self.client.force_authenticate(user=self.user1)
        url = reverse('generic_iom:genericiom-publish', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'published')
        self.assertIsNotNone(iom.published_at)

    def test_publish_iom_simple_approval_from_approved_by_owner(self):
        iom = GenericIOM.objects.create(
            **self.iom_simple_data_valid,
            created_by=self.user1,
            status='approved', # Assume it went through simple approval
            simple_approver_action_by=self.user2
        )
        self.client.force_authenticate(user=self.user1) # Owner publishes
        url = reverse('generic_iom:genericiom-publish', kwargs={'pk': iom.pk})
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'published')

    # TODO: Add tests for advanced approval workflow through API (harder, involves setting up rules)
    # TODO: Test parent_record GFK creation/update via API
    # TODO: Test to_users, to_groups M2M updates via API
    # TODO: Test permissions more exhaustively for each action and user type.
