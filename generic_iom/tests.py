from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from unittest.mock import patch, MagicMock

from .models import IOMCategory, IOMTemplate, GenericIOM
from django.contrib.auth.models import Group
from django.urls import reverse # Make sure reverse is imported if used standalone
from rest_framework import status # Only needed for APITestCase usually, but fine here
from rest_framework.test import APITestCase, APIClient # For API tests if any were in this file
from django.db.models import Q


User = get_user_model()

class IOMCategoryTests(TestCase):
    def test_category_creation(self):
        initial_category_count = IOMCategory.objects.count()
        # Using a more unique name to avoid potential clashes if tests run multiple times or data isn't perfectly clean
        category_name = f"IT Operations Test Category {initial_category_count + 1}"
        category = IOMCategory.objects.create(name=category_name, description="Category for IT Ops IOMs")
        self.assertEqual(str(category), category_name)
        self.assertEqual(IOMCategory.objects.count(), initial_category_count + 1)


class IOMTemplateTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Using unique names for categories and users created here to avoid clashes with data migrations
        cls.user = User.objects.create_user(username="testuser_iomtemplate_model", password="password")
        # Create category if it doesn't exist from data migration, or use existing one if name matches
        cls.hr_category_name = "HR (Templates Model Test)" # Unique name
        cls.category, _ = IOMCategory.objects.get_or_create(name=cls.hr_category_name, defaults={'description': 'HR related templates for model tests'})


    def test_template_creation(self):
        initial_template_count = IOMTemplate.objects.count()
        template = IOMTemplate.objects.create(
            name="New Hire Onboarding Template Model Test", # Unique name
            category=self.category,
            created_by=self.user,
            fields_definition=[{"name": "employee_name", "label": "Employee Name", "type": "text"}]
        )
        self.assertEqual(str(template), "New Hire Onboarding Template Model Test")
        self.assertEqual(template.approval_type, "none")
        self.assertTrue(template.is_active)
        self.assertEqual(IOMTemplate.objects.count(), initial_template_count + 1)


    def test_template_clean_simple_approval_validation(self):
        template = IOMTemplate(
            name="Leave Request Template Model Test", # Unique name
            category=self.category,
            created_by=self.user,
            approval_type='simple'
        )
        with self.assertRaises(ValidationError) as context:
            template.full_clean()
        self.assertTrue("Simple Approver User or Group must be specified" in str(context.exception))

        template.simple_approval_user = self.user
        template.full_clean()
        self.assertIsNotNone(template.simple_approval_user)

    def test_template_clean_clears_simple_approvers(self):
        template = IOMTemplate.objects.create(
            name="Announcement Template Model Test", # Unique name
            category=self.category,
            created_by=self.user,
            approval_type='simple',
            simple_approval_user=self.user
        )
        self.assertIsNotNone(template.simple_approval_user)

        template.approval_type = 'none'
        template.full_clean()
        self.assertIsNone(template.simple_approval_user)
        template.save()
        updated_template = IOMTemplate.objects.get(pk=template.pk)
        self.assertIsNone(updated_template.simple_approval_user)

    def test_template_creation_with_allowed_groups(self):
        group1, _ = Group.objects.get_or_create(name="Testers Group Alpha Model")
        group2, _ = Group.objects.get_or_create(name="Developers Group Beta Model")
        initial_template_count = IOMTemplate.objects.count()
        template = IOMTemplate.objects.create(
            name="Group Restricted Template Model Test", # Unique name
            category=self.category,
            created_by=self.user
        )
        template.allowed_groups.add(group1, group2)
        self.assertEqual(template.allowed_groups.count(), 2)
        self.assertIn(group1, template.allowed_groups.all())
        self.assertEqual(IOMTemplate.objects.count(), initial_template_count + 1)


class GenericIOMTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="testcreator_giom_model", password="password")
        cls.category_general_name = "General (GIOM Model Test)" # Unique name
        cls.category, _ = IOMCategory.objects.get_or_create(name=cls.category_general_name)

        cls.template_no_approval = IOMTemplate.objects.create(
            name="General Memo Model Test Template", # Unique name
            category=cls.category, created_by=cls.user, approval_type='none'
        )
        cls.template_simple_approval = IOMTemplate.objects.create(
            name="Simple Approval Memo Model Test Template", # Unique name
            category=cls.category, created_by=cls.user, approval_type='simple',
            simple_approval_user=cls.user
        )
        cls.template_advanced_approval = IOMTemplate.objects.create(
            name="Advanced Approval Memo Model Test Template", # Unique name
            category=cls.category, created_by=cls.user, approval_type='advanced'
        )

    def test_generic_iom_creation_and_gim_id(self):
        initial_giom_count = GenericIOM.objects.count()
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval, subject="Test Subject GIOM Model",
            created_by=self.user, data_payload={"message": "Hello"}
        )
        self.assertIsNotNone(iom.gim_id)
        # Assuming prefix is from settings or a fixed part of the sequence model logic
        # For this test, let's just check it's not empty and is a string.
        self.assertIsInstance(iom.gim_id, str)
        self.assertTrue(len(iom.gim_id) > 0)
        # self.assertTrue(iom.gim_id.startswith("GIM-AA-")) # This depends on sequence logic
        self.assertEqual(str(iom), f"{iom.gim_id}: Test Subject GIOM Model")
        self.assertEqual(GenericIOM.objects.count(), initial_giom_count + 1)


    def test_published_at_set_on_publish(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval, subject="Publish Test GIOM Model",
            created_by=self.user, status='draft'
        )
        self.assertIsNone(iom.published_at)
        iom.status = 'published'
        iom.save()
        self.assertIsNotNone(iom.published_at)

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_calls_advanced_workflow_on_draft(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_advanced_approval, subject="Advanced Workflow Test GIOM Model",
            created_by=self.user, status='draft'
        )
        mock_trigger_workflow.assert_called_once()

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_calls_advanced_workflow_on_new_pending(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_advanced_approval, subject="Advanced Workflow New Pending GIOM Model",
            created_by=self.user, status='pending_approval'
        )
        mock_trigger_workflow.assert_called_once()

    @patch('generic_iom.models.GenericIOM.trigger_advanced_approval_workflow')
    def test_save_does_not_call_advanced_workflow_for_simple_template(self, mock_trigger_workflow):
        GenericIOM.objects.create(
            iom_template=self.template_simple_approval, subject="Simple Workflow Test GIOM Model",
            created_by=self.user, status='draft'
        )
        mock_trigger_workflow.assert_not_called()

    @patch('procurement.models.ApprovalStep.objects.create')
    @patch('procurement.models.ApprovalRule.objects.filter')
    def test_trigger_advanced_approval_workflow_logic(self, mock_approval_rule_filter, mock_approval_step_create):
        mock_rule = MagicMock()
        mock_rule.order = 10
        mock_rule.approver_user = self.user
        mock_rule.approver_group = None
        mock_approval_rule_filter.return_value.distinct.return_value.order_by.return_value = [mock_rule]

        iom = GenericIOM.objects.create(
            iom_template=self.template_advanced_approval, subject="Trigger Test Rule Match GIOM Model",
            created_by=self.user, status='draft'
        )
        mock_approval_rule_filter.assert_called()
        self.assertTrue(mock_approval_rule_filter.call_args_list)
        args, kwargs = mock_approval_rule_filter.call_args_list[-1]
        self.assertEqual(args[0], Q(rule_type='generic_iom'))
        self.assertEqual(args[2], Q(is_active=True))
        mock_approval_step_create.assert_called_once()
        called_step_args, called_step_kwargs = mock_approval_step_create.call_args_list[0]
        self.assertEqual(called_step_kwargs['content_object'], iom)
        self.assertEqual(called_step_kwargs['approval_rule'], mock_rule)
        self.assertEqual(called_step_kwargs['status'], 'pending')
        iom.refresh_from_db()
        self.assertEqual(iom.status, 'pending_approval')

    @patch('procurement.models.ApprovalStep.objects.filter')
    @patch('procurement.models.ApprovalStep.objects.create')
    @patch('procurement.models.ApprovalRule.objects.filter')
    def test_trigger_advanced_approval_workflow_no_rules_match(self, mock_approval_rule_filter, mock_approval_step_create, mock_approval_step_filter_delete):
        mock_approval_rule_filter.return_value.order_by.return_value = []
        iom = GenericIOM.objects.create(
            iom_template=self.template_advanced_approval, subject="No Rules Match Test GIOM Model",
            created_by=self.user, status='draft'
        )
        self.assertEqual(iom.status, 'draft')
        mock_approval_step_create.assert_not_called()


from .serializers import IOMCategorySerializer, IOMTemplateSerializer, GenericIOMSerializer
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request


class IOMTemplateSerializerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="serializeruser_templates_model", password="password")
        cls.finance_category_name = "Finance (Template Serializer Model Test)" # Unique name
        cls.category, _ = IOMCategory.objects.get_or_create(name=cls.finance_category_name)

        cls.template_attributes = {
            "name": "Budget Proposal Template Serializer Model Test", # Unique name
            "description": "Template for submitting budget proposals.",
            "category": cls.category.pk,
            "fields_definition": [{"name": "amount", "label": "Amount", "type": "number"}],
            "approval_type": "simple",
            "simple_approval_user": cls.user.pk,
            "is_active": True
        }
        cls.template = IOMTemplate.objects.create(
            name="Existing Template Serializer Model Test", # Unique name
            category=cls.category,
            created_by=cls.user,
            approval_type='none'
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        cls.serializer_context = {'request': Request(request)}


    def test_iom_template_serialize(self):
        serializer = IOMTemplateSerializer(instance=self.template, context=self.serializer_context)
        data = serializer.data
        self.assertEqual(data['name'], self.template.name)
        self.assertEqual(data['category'], self.category.pk)
        self.assertEqual(data['category_name'], self.category.name)
        self.assertEqual(data['created_by_username'], self.user.username)

    def test_iom_template_deserialize_create_valid(self):
        serializer = IOMTemplateSerializer(data=self.template_attributes, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        template = serializer.save(created_by=self.user)
        self.assertEqual(template.name, self.template_attributes['name'])
        self.assertEqual(template.approval_type, 'simple')
        self.assertEqual(template.simple_approval_user, self.user)

    def test_iom_template_deserialize_simple_approval_validation_fail(self):
        invalid_data = self.template_attributes.copy()
        invalid_data['approval_type'] = 'simple'
        invalid_data.pop('simple_approval_user', None)
        invalid_data.pop('simple_approval_group', None)

        serializer = IOMTemplateSerializer(data=invalid_data, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('simple_approval_user', serializer.errors)
        self.assertIn('simple_approval_group', serializer.errors)

    def test_iom_template_deserialize_update_clear_simple_approvers(self):
        template = IOMTemplate.objects.create(
            name="Update Test Template Serializer Model", category=self.category, created_by=self.user, # Unique name
            approval_type='simple', simple_approval_user=self.user
        )
        update_data = {"approval_type": "none"}
        serializer = IOMTemplateSerializer(instance=template, data=update_data, partial=True, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_template = serializer.save()
        self.assertEqual(updated_template.approval_type, "none")
        self.assertIsNone(updated_template.simple_approval_user)


class GenericIOMSerializerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="gimuser_serializer_model", password="password")
        cls.operations_category_name = "Operations (GIOM Serializer Model Test)" # Unique name
        cls.category, _ = IOMCategory.objects.get_or_create(name=cls.operations_category_name)
        cls.template = IOMTemplate.objects.create(
            name="Ops Report Template Serializer Model Test", category=cls.category, created_by=cls.user # Unique name
        )
        cls.iom_attributes = {
            "iom_template": cls.template.pk,
            "subject": "Daily Ops Report GIOM Serializer Model", # Unique name
            "data_payload": {"tasks_completed": 5, "issues": ["Printer jam"]},
            "status": "draft",
        }
        cls.gim = GenericIOM.objects.create(
            iom_template=cls.template,
            subject="Existing GIM Serializer Model Test", # Unique name
            created_by=cls.user,
            data_payload={"key": "value"}
        )
        factory = APIRequestFactory()
        request = factory.get('/')
        cls.serializer_context = {'request': Request(request)}


    def test_generic_iom_serialize(self):
        serializer = GenericIOMSerializer(instance=self.gim, context=self.serializer_context)
        data = serializer.data
        self.assertEqual(data['subject'], self.gim.subject)
        self.assertEqual(data['iom_template'], self.template.pk)
        self.assertEqual(data['iom_template_name'], self.template.name)
        self.assertEqual(data['data_payload']['key'], "value")

    def test_generic_iom_deserialize_create_valid(self):
        serializer = GenericIOMSerializer(data=self.iom_attributes, context=self.serializer_context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        gim = serializer.save(created_by=self.user)
        self.assertEqual(gim.subject, self.iom_attributes['subject'])
        self.assertEqual(gim.data_payload['tasks_completed'], 5)

    def test_generic_iom_deserialize_gfk_valid(self):
        linked_category_name = "Linked Category for GFK Model Test" # Unique name
        linked_category, _ = IOMCategory.objects.get_or_create(name=linked_category_name)
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
        data_with_gfk['parent_content_type_id'] = 99999
        data_with_gfk['parent_object_id'] = 1
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_content_type_id', serializer.errors)

    def test_generic_iom_deserialize_gfk_invalid_object_id(self):
        content_type = ContentType.objects.get_for_model(IOMCategory)
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = content_type.id
        data_with_gfk['parent_object_id'] = 99999
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_object_id', serializer.errors)

    def test_generic_iom_deserialize_gfk_ct_without_obj_id(self):
        content_type = ContentType.objects.get_for_model(IOMCategory)
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_content_type_id'] = content_type.id
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_object_id', serializer.errors)


    def test_generic_iom_deserialize_gfk_obj_id_without_ct(self):
        linked_category_name = "Another Linked Cat for GFK Model Test" # Unique name
        linked_category, _ = IOMCategory.objects.get_or_create(name=linked_category_name)
        data_with_gfk = self.iom_attributes.copy()
        data_with_gfk['parent_object_id'] = linked_category.id
        serializer = GenericIOMSerializer(data=data_with_gfk, context=self.serializer_context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('parent_content_type', serializer.errors)
