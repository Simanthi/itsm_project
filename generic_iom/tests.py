from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from unittest.mock import patch, MagicMock
from django.db.models import Q

from .models import GenericIOMIDSequence, IOMCategory, IOMTemplate, GenericIOM
# To test workflow triggering, we need ApprovalRule and ApprovalStep from procurement
# This creates a dependency. For pure unit tests of generic_iom models,
# we might mock these out. For integration-style tests, we'd import them.
# Let's try mocking for now to keep generic_iom tests more isolated.
# from procurement.models import ApprovalRule, ApprovalStep
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase # For API tests

User = get_user_model()

class GenericIOMIDSequenceTests(TestCase):
    def test_get_next_id_creation_and_increment(self):
        first_id = GenericIOMIDSequence.get_next_id("TST")
        self.assertEqual(first_id, "TST-AA-0001")
        second_id = GenericIOMIDSequence.get_next_id("TST")
        self.assertEqual(second_id, "TST-AA-0002")

    def test_get_next_id_numeric_rollover(self):
        # Manually set current_numeric_part to near limit
        seq, _ = GenericIOMIDSequence.objects.get_or_create(prefix="NUM")
        seq.current_numeric_part = 9998
        seq.current_alpha_part_char1 = "A"
        seq.current_alpha_part_char2 = "A"
        seq.save()

        id1 = GenericIOMIDSequence.get_next_id("NUM") # AA-9999
        self.assertEqual(id1, "NUM-AA-9999")
        id2 = GenericIOMIDSequence.get_next_id("NUM") # AB-0001
        self.assertEqual(id2, "NUM-AB-0001")

    def test_get_next_id_alpha_char2_rollover(self):
        seq, _ = GenericIOMIDSequence.objects.get_or_create(prefix="AL2")
        seq.current_numeric_part = 9999
        seq.current_alpha_part_char1 = "A"
        seq.current_alpha_part_char2 = "Y" # Next is Z, then rollover to BA
        seq.save()

        id_az = GenericIOMIDSequence.get_next_id("AL2") # AZ-0001 (as it increments num first from 9999 to 1, then alpha)
        self.assertEqual(id_az, "AL2-AZ-0001")

        seq.current_numeric_part = 9999 # Reset num for next test
        seq.current_alpha_part_char1 = "A"
        seq.current_alpha_part_char2 = "Z"
        seq.save()
        id_ba = GenericIOMIDSequence.get_next_id("AL2") # BA-0001
        self.assertEqual(id_ba, "AL2-BA-0001")


    def test_get_next_id_alpha_char1_rollover(self):
        seq, _ = GenericIOMIDSequence.objects.get_or_create(prefix="AL1")
        seq.current_numeric_part = 9999
        seq.current_alpha_part_char1 = "Y"
        seq.current_alpha_part_char2 = "Z"
        seq.save()
        id_za = GenericIOMIDSequence.get_next_id("AL1") # ZA-0001
        self.assertEqual(id_za, "AL1-ZA-0001")

    def test_get_next_id_exhaustion(self):
        seq, _ = GenericIOMIDSequence.objects.get_or_create(prefix="EXH")
        seq.current_numeric_part = 9999
        seq.current_alpha_part_char1 = "Z"
        seq.current_alpha_part_char2 = "Z"
        seq.save()
        with self.assertRaises(ValueError) as context:
            GenericIOMIDSequence.get_next_id("EXH")
        self.assertTrue("ID sequence exhausted" in str(context.exception))

    def test_default_prefix_gim(self):
        first_id = GenericIOMIDSequence.get_next_id() # Test default "GIM"
        self.assertTrue(first_id.startswith("GIM-AA-"))


class IOMCategoryTests(TestCase):
    def test_category_creation(self):
        category = IOMCategory.objects.create(name="IT Operations", description="Category for IT Ops IOMs")
        self.assertEqual(str(category), "IT Operations")
        self.assertEqual(IOMCategory.objects.count(), 1)


class IOMTemplateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.category = IOMCategory.objects.create(name="HR")

    def test_template_creation(self):
        template = IOMTemplate.objects.create(
            name="New Hire Onboarding",
            category=self.category,
            created_by=self.user,
            fields_definition=[{"name": "employee_name", "label": "Employee Name", "type": "text"}]
        )
        self.assertEqual(str(template), "New Hire Onboarding")
        self.assertEqual(template.approval_type, "none") # Default
        self.assertTrue(template.is_active)

    def test_template_clean_simple_approval_validation(self):
        template = IOMTemplate(
            name="Leave Request",
            category=self.category,
            created_by=self.user,
            approval_type='simple'
        )
        with self.assertRaises(ValidationError) as context:
            template.full_clean() # full_clean calls clean()
        self.assertTrue("Simple Approver User or Group must be specified" in str(context.exception))

        template.simple_approval_user = self.user
        template.full_clean() # Should not raise error now
        self.assertIsNotNone(template.simple_approval_user)

    def test_template_clean_clears_simple_approvers(self):
        template = IOMTemplate.objects.create(
            name="Announcement",
            category=self.category,
            created_by=self.user,
            approval_type='simple',
            simple_approval_user=self.user
        )
        self.assertIsNotNone(template.simple_approval_user)

        template.approval_type = 'none'
        template.full_clean() # clean method should be called
        # Note: clean() modifies the instance but doesn't save.
        # The model's save() method could also enforce this, but clean() is good for form validation.
        self.assertIsNone(template.simple_approval_user)
        # To check if it's actually cleared on save:
        template.save()
        updated_template = IOMTemplate.objects.get(pk=template.pk)
        self.assertIsNone(updated_template.simple_approval_user)

    def test_template_creation_with_allowed_groups(self):
        group1 = Group.objects.create(name="Testers")
        group2 = Group.objects.create(name="Developers")
        template = IOMTemplate.objects.create(
            name="Group Restricted Template",
            category=self.category,
            created_by=self.user
        )
        template.allowed_groups.add(group1, group2)
        self.assertEqual(template.allowed_groups.count(), 2)
        self.assertIn(group1, template.allowed_groups.all())


class GenericIOMTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testcreator", password="password")
        self.category = IOMCategory.objects.create(name="General")
        self.template_no_approval = IOMTemplate.objects.create(
            name="General Memo",
            category=self.category,
            created_by=self.user,
            approval_type='none'
        )
        self.template_simple_approval = IOMTemplate.objects.create(
            name="Simple Approval Memo",
            category=self.category,
            created_by=self.user,
            approval_type='simple',
            simple_approval_user=self.user # Self-approve for test simplicity
        )
        self.template_advanced_approval = IOMTemplate.objects.create(
            name="Advanced Approval Memo",
            category=self.category,
            created_by=self.user,
            approval_type='advanced'
        )

    def test_generic_iom_creation_and_gim_id(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Test Subject",
            created_by=self.user,
            data_payload={"message": "Hello"}
        )
        self.assertIsNotNone(iom.gim_id)
        self.assertTrue(iom.gim_id.startswith("GIM-AA-"))
        self.assertEqual(str(iom), f"{iom.gim_id}: Test Subject")

    def test_published_at_set_on_publish(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Publish Test",
            created_by=self.user,
            status='draft'
        )
        self.assertIsNone(iom.published_at)
        iom.status = 'published'
        iom.save()
        self.assertIsNotNone(iom.published_at)

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_calls_advanced_workflow_on_draft(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_advanced_approval,
            subject="Advanced Workflow Test",
            created_by=self.user,
            status='draft' # This should trigger it
        )
        mock_trigger_workflow.assert_called_once()

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_calls_advanced_workflow_on_new_pending(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_advanced_approval,
            subject="Advanced Workflow New Pending",
            created_by=self.user,
            status='pending_approval' # This should also trigger if new
        )
        mock_trigger_workflow.assert_called_once()

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_does_not_call_advanced_workflow_for_simple_template(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject="Simple Workflow Test",
            created_by=self.user,
            status='draft'
        )
        mock_trigger_workflow.assert_not_called()

    # We need to mock procurement.models.ApprovalRule and ApprovalStep for the next test
    # This is where testing gets more complex due to cross-app dependencies.
    # For a true unit test of trigger_advanced_approval_workflow, we'd mock these.
    # If we want to test the integration, we need actual ApprovalRule instances.

    # Let's try mocking them.
    @patch('procurement.models.ApprovalStep.objects.create')
    @patch('procurement.models.ApprovalRule.objects.filter')
    def test_trigger_advanced_approval_workflow_logic(self, mock_approval_rule_filter, mock_approval_step_create):
        # Setup a mock ApprovalRule
        mock_rule = MagicMock()
        mock_rule.order = 10
        mock_rule.approver_user = self.user
        mock_rule.approver_group = None

        # Configure the mock filter to return our mock rule
        mock_approval_rule_filter.return_value.order_by.return_value = [mock_rule]

        iom = GenericIOM( # Create instance without saving to control when save() is called
            iom_template=self.template_advanced_approval,
            subject="Trigger Test",
            created_by=self.user,
            status='draft'
        )
        # Manually assign a PK as if it's saved, because ContentType queries need it
        iom.pk = 1

        # Call the method directly
        iom.trigger_advanced_approval_workflow()

        mock_approval_rule_filter.assert_called_once()
        # Check some parts of the filter query
        args, kwargs = mock_approval_rule_filter.call_args
        self.assertIn(Q(rule_type='generic_iom'), args[0]) # Check if Q object for rule_type is present
        self.assertTrue(kwargs['is_active'])

        mock_approval_step_create.assert_called_once()
        call_args, call_kwargs = mock_approval_step_create.call_args_list[0]
        self.assertEqual(call_kwargs['content_object'], iom)
        self.assertEqual(call_kwargs['approval_rule'], mock_rule)
        self.assertEqual(call_kwargs['status'], 'pending')

        # Status should not change here because trigger_advanced_approval_workflow
        # itself does not save the status change to 'pending_approval'.
        # The save() method that calls it is responsible for that.
        # However, if we want to test the status update part of the method:
        # We need to save the iom first, then call trigger, then check status.
        # For this isolated test, we're just checking step creation.

        # Test that status would be changed if called from save() context
        iom_for_status_test = GenericIOM.objects.create(
            iom_template=self.template_advanced_approval,
            subject="Status Change Test",
            created_by=self.user,
            status='draft' # This will call save, which calls trigger.
        )
        # mock_approval_rule_filter will be called again here by the create().
        # mock_approval_step_create will also be called again.

        # To verify the status change, we need the trigger to actually run.
        # The mock_approval_step_create needs to be configured such that created_steps_count > 0.
        # Since it's already called, created_steps_count would be > 0.
        # The save method should then update the status.

        # Re-fetch from DB to see if status was updated by the save() method
        # This part is tricky because the save method itself is complex.
        # Let's simplify: if created_steps_count > 0, status becomes pending_approval.
        # We ensured mock_approval_step_create is called, so steps are "created".
        # The GenericIOM.save() method should then update the status.

        # To test the status update part of trigger_advanced_approval_workflow:
        # This part needs careful mocking of the save method itself if we are to isolate the trigger.
        # The current test structure for save() calling trigger() is better.
        # Let's ensure the instance reloaded from DB has the correct status.
        iom_for_status_check = GenericIOM.objects.create(
            iom_template=self.template_advanced_approval,
            subject="Status Check After Trigger",
            created_by=self.user,
            status='draft'
        )
        # Reload to confirm status update by save()->trigger()->super().save(update_fields=['status'])
        iom_reloaded_for_status = GenericIOM.objects.get(pk=iom_for_status_check.pk)
        if mock_approval_step_create.called: # Only if steps were "created"
            self.assertEqual(iom_reloaded_for_status.status, 'pending_approval')
        else: # If somehow no steps were created by the mock
            self.assertEqual(iom_reloaded_for_status.status, 'draft')


    @patch('procurement.models.ApprovalStep.objects.filter') # Mock the delete part
    @patch('procurement.models.ApprovalStep.objects.create')
    @patch('procurement.models.ApprovalRule.objects.filter')
    def test_trigger_advanced_approval_workflow_no_rules_match(self, mock_approval_rule_filter, mock_approval_step_create, mock_approval_step_filter_delete):
        mock_approval_rule_filter.return_value.order_by.return_value = [] # No rules match

        iom = GenericIOM.objects.create(
            iom_template=self.template_advanced_approval,
            subject="No Rules Match Test",
            created_by=self.user,
            status='draft'
        )
        # The save method calls trigger. If no steps created, status should remain draft.
        self.assertEqual(iom.status, 'draft')
        mock_approval_step_create.assert_not_called()


# --- Serializer Tests ---
from .serializers import IOMCategorySerializer, IOMTemplateSerializer, GenericIOMSerializer
from rest_framework.test import APIRequestFactory # Not strictly needed for serializer unit tests but can provide context
from rest_framework.request import Request


class IOMTemplateSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="serializeruser", password="password")
        self.category = IOMCategory.objects.create(name="Finance")
        self.template_attributes = {
            "name": "Budget Proposal Template",
            "description": "Template for submitting budget proposals.",
            "category": self.category.pk,
            "fields_definition": [{"name": "amount", "label": "Amount", "type": "number"}],
            "approval_type": "simple",
            "simple_approval_user": self.user.pk,
            "is_active": True
        }
        self.template = IOMTemplate.objects.create(
            name="Existing Template",
            category=self.category,
            created_by=self.user,
            approval_type='none'
        )
        # For context in serializer if needed (e.g. for request.user)
        factory = APIRequestFactory()
        request = factory.get('/') # dummy request
        self.serializer_context = {'request': Request(request)}


    def test_iom_template_serialize(self):
        serializer = IOMTemplateSerializer(instance=self.template, context=self.serializer_context)
        data = serializer.data
        self.assertEqual(data['name'], self.template.name)
        self.assertEqual(data['category'], self.category.pk)
        self.assertIsNotNone(data['category_details'])
        self.assertEqual(data['category_details']['name'], self.category.name)
        self.assertIsNotNone(data['created_by_details'])
        self.assertEqual(data['created_by_details']['username'], self.user.username)

    def test_iom_template_deserialize_create_valid(self):
        serializer = IOMTemplateSerializer(data=self.template_attributes, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        template = serializer.save(created_by=self.user) # created_by usually set by view
        self.assertEqual(template.name, self.template_attributes['name'])
        self.assertEqual(template.approval_type, 'simple')
        self.assertEqual(template.simple_approval_user, self.user)

    def test_iom_template_deserialize_simple_approval_validation_fail(self):
        invalid_data = self.template_attributes.copy()
        invalid_data['approval_type'] = 'simple'
        invalid_data.pop('simple_approval_user', None) # Remove user
        invalid_data.pop('simple_approval_group', None) # Remove group

        serializer = IOMTemplateSerializer(data=invalid_data, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('simple_approval_user', serializer.errors)
        self.assertIn('simple_approval_group', serializer.errors)

    def test_iom_template_deserialize_update_clear_simple_approvers(self):
        template = IOMTemplate.objects.create(
            name="Update Test", category=self.category, created_by=self.user,
            approval_type='simple', simple_approval_user=self.user
        )
        update_data = {"approval_type": "none"}
        serializer = IOMTemplateSerializer(instance=template, data=update_data, partial=True, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_template = serializer.save()
        self.assertEqual(updated_template.approval_type, "none")
        self.assertIsNone(updated_template.simple_approval_user)


class GenericIOMSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="gimuser", password="password")
        self.category = IOMCategory.objects.create(name="Operations")
        self.template = IOMTemplate.objects.create(
            name="Ops Report Template", category=self.category, created_by=self.user
        )
        self.iom_attributes = {
            "iom_template": self.template.pk,
            "subject": "Daily Ops Report",
            "data_payload": {"tasks_completed": 5, "issues": ["Printer jam"]},
            "status": "draft",
        }
        self.gim = GenericIOM.objects.create(
            iom_template=self.template,
            subject="Existing GIM",
            created_by=self.user,
            data_payload={"key": "value"}
        )
        # For context in serializer if needed
        factory = APIRequestFactory()
        request = factory.get('/')
        self.serializer_context = {'request': Request(request)}


    def test_generic_iom_serialize(self):
        serializer = GenericIOMSerializer(instance=self.gim, context=self.serializer_context)
        data = serializer.data
        self.assertEqual(data['subject'], self.gim.subject)
        self.assertEqual(data['iom_template'], self.template.pk)
        self.assertIsNotNone(data['iom_template_details'])
        self.assertEqual(data['iom_template_details']['name'], self.template.name)
        self.assertEqual(data['data_payload']['key'], "value")

    def test_generic_iom_deserialize_create_valid(self):
        serializer = GenericIOMSerializer(data=self.iom_attributes, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        gim = serializer.save(created_by=self.user)
        self.assertEqual(gim.subject, self.iom_attributes['subject'])
        self.assertEqual(gim.data_payload['tasks_completed'], 5)

    def test_generic_iom_deserialize_gfk_valid(self):
        # Create a dummy object to link to
        linked_category = IOMCategory.objects.create(name="Linked Category")
        content_type = ContentType.objects.get_for_model(IOMCategory)

        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = content_type.id
        data_with_gfk['parent_object_id'] = linked_category.id

        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        gim = serializer.save(created_by=self.user)
        self.assertEqual(gim.parent_content_type, content_type)
        self.assertEqual(gim.parent_object_id, linked_category.id)
        self.assertEqual(gim.parent_record, linked_category)

    def test_generic_iom_deserialize_gfk_invalid_ct(self):
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = 99999 # Invalid CT ID
        data_with_gfk['parent_object_id'] = 1
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_content_type_id', serializer.errors)

    def test_generic_iom_deserialize_gfk_invalid_object_id(self):
        content_type = ContentType.objects.get_for_model(IOMCategory)
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = content_type.id
        data_with_gfk['parent_object_id'] = 99999 # Invalid object ID
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_object_id', serializer.errors)

    def test_generic_iom_deserialize_gfk_ct_without_obj_id(self):
        content_type = ContentType.objects.get_for_model(IOMCategory)
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = content_type.id
        # Missing parent_object_id
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


    def test_generic_iom_deserialize_gfk_obj_id_without_ct(self):
        linked_category = IOMCategory.objects.create(name="Another Linked Cat")
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_object_id'] = linked_category.id
        # Missing parent_content_type_id
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)



# --- API Tests for IOMTemplate allowed_groups ---
class IOMTemplateAPIAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(username='api_admin', email='apiadmin@example.com', password='password123')
        cls.normal_user1 = User.objects.create_user(username='api_user1', email='apiuser1@example.com', password='password123')
        cls.normal_user2 = User.objects.create_user(username='api_user2', email='apiuser2@example.com', password='password123')

        cls.group_a = Group.objects.create(name="Group A")
        cls.group_b = Group.objects.create(name="Group B")

        cls.normal_user1.groups.add(cls.group_a)
        # User2 is not in Group A or B initially for some tests

        cls.category = IOMCategory.objects.create(name="API Access Test Category")

        # Template 1: Public (no groups)
        cls.template_public = IOMTemplate.objects.create(
            name="Public Template", category=cls.category, created_by=cls.admin_user, is_active=True
        )
        # Template 2: Restricted to Group A
        cls.template_group_a = IOMTemplate.objects.create(
            name="Group A Template", category=cls.category, created_by=cls.admin_user, is_active=True
        )
        cls.template_group_a.allowed_groups.add(cls.group_a)

        # Template 3: Restricted to Group B
        cls.template_group_b = IOMTemplate.objects.create(
            name="Group B Template", category=cls.category, created_by=cls.admin_user, is_active=True
        )
        cls.template_group_b.allowed_groups.add(cls.group_b)

        # Template 4: Inactive public template
        cls.template_inactive = IOMTemplate.objects.create(
            name="Inactive Public Template", category=cls.category, created_by=cls.admin_user, is_active=False
        )

    def test_admin_can_set_allowed_groups_on_create(self):
        self.client.force_authenticate(user=self.admin_user)
        template_data = {
            "name": "Admin Created Restricted Template",
            "category": self.category.pk,
            "fields_definition": [],
            "approval_type": "none",
            "allowed_groups": [self.group_a.pk, self.group_b.pk]
        }
        response = self.client.post(reverse('generic_iom:iomtemplate-list'), template_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_template = IOMTemplate.objects.get(pk=response.data['id'])
        self.assertEqual(created_template.allowed_groups.count(), 2)
        self.assertIn(self.group_a, created_template.allowed_groups.all())

    def test_admin_can_update_allowed_groups(self):
        self.client.force_authenticate(user=self.admin_user)
        update_data = {"allowed_groups": [self.group_b.pk]}
        response = self.client.patch(
            reverse('generic_iom:iomtemplate-detail', kwargs={'pk': self.template_group_a.pk}),
            update_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.template_group_a.refresh_from_db()
        self.assertEqual(self.template_group_a.allowed_groups.count(), 1)
        self.assertIn(self.group_b, self.template_group_a.allowed_groups.all())
        self.assertNotIn(self.group_a, self.template_group_a.allowed_groups.all())

    def test_list_templates_for_user_in_group_a(self):
        self.client.force_authenticate(user=self.normal_user1) # Belongs to Group A
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template_names = [t['name'] for t in response.data['results']]

        self.assertIn(self.template_public.name, template_names)
        self.assertIn(self.template_group_a.name, template_names)
        self.assertNotIn(self.template_group_b.name, template_names)
        self.assertNotIn(self.template_inactive.name, template_names) # Inactive templates are not shown

    def test_list_templates_for_user_in_no_relevant_group(self):
        self.client.force_authenticate(user=self.normal_user2) # Not in Group A or B
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template_names = [t['name'] for t in response.data['results']]

        self.assertIn(self.template_public.name, template_names)
        self.assertNotIn(self.template_group_a.name, template_names)
        self.assertNotIn(self.template_group_b.name, template_names)
        self.assertNotIn(self.template_inactive.name, template_names)

    def test_admin_sees_all_templates_including_inactive(self):
        # Current IOMTemplateViewSet get_queryset for staff returns all, including inactive.
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('generic_iom:iomtemplate-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Based on current viewset logic, admin sees all. If it were filtered by active, this would change.
        self.assertEqual(len(response.data['results']), IOMTemplate.objects.count())
        template_names = [t['name'] for t in response.data['results']]
        self.assertIn(self.template_public.name, template_names)
        self.assertIn(self.template_group_a.name, template_names)
        self.assertIn(self.template_group_b.name, template_names)
        self.assertIn(self.template_inactive.name, template_names)



