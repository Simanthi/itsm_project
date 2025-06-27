from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q # Added to fix Pylance error

from generic_iom.models import IOMCategory, IOMTemplate, GenericIOM
# For testing advanced workflow, we'll need ApprovalRule and ApprovalStep
# For now, ensure ProcurementIDSequence is available for ID generation testing
try:
    from procurement.models import ApprovalRule, ApprovalStep
    from procurement.sequence_models import ProcurementIDSequence
    APPROVAL_SYSTEM_AVAILABLE = True
except ImportError:
    APPROVAL_SYSTEM_AVAILABLE = False
    ProcurementIDSequence = None # To prevent NameError if import fails

User = get_user_model()

class IOMCategoryModelTest(TestCase):
    def test_create_iom_category(self):
        category = IOMCategory.objects.create(name="Test Category", description="A test category.")
        self.assertEqual(str(category), "Test Category")
        self.assertEqual(category.name, "Test Category")

class IOMTemplateModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='password123')
        cls.category = IOMCategory.objects.create(name="General")

    def test_create_iom_template(self):
        template = IOMTemplate.objects.create(
            name="Test Template",
            category=self.category,
            created_by=self.user,
            fields_definition=[{"name": "title", "label": "Title", "type": "text", "required": True}],
            approval_type='simple',
            simple_approval_user=self.user
        )
        self.assertEqual(str(template), "Test Template")
        self.assertTrue(template.is_active)
        self.assertEqual(template.approval_type, 'simple')
        self.assertIsNotNone(template.created_at)

class GenericIOMModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='password123')
        cls.category = IOMCategory.objects.create(name="HR")
        cls.template_no_approval = IOMTemplate.objects.create(
            name="No Approval Template",
            category=cls.category,
            created_by=cls.user,
            fields_definition=[{"name": "message", "label": "Message", "type": "textarea"}],
            approval_type='none'
        )
        cls.template_simple_approval = IOMTemplate.objects.create(
            name="Simple Approval Template",
            category=cls.category,
            created_by=cls.user,
            simple_approval_user=cls.user,
            fields_definition=[{"name": "request_detail", "label": "Detail", "type": "text"}],
            approval_type='simple'
        )
        if APPROVAL_SYSTEM_AVAILABLE and ProcurementIDSequence:
            # Ensure GIM sequence exists for reliable ID testing
            # In a real test setup, this might be part of fixtures or a global setup
            ProcurementIDSequence.objects.get_or_create(
                prefix="GIM",
                defaults={
                    "current_alpha_part_char1": "A",
                    "current_alpha_part_char2": "A",
                    "current_numeric_part": 0,
                }
            )
            cls.template_advanced_approval = IOMTemplate.objects.create(
                name="Advanced Approval Template",
                category=cls.category,
                created_by=cls.user,
                fields_definition=[{"name": "critical_note", "label": "Note", "type": "text"}],
                approval_type='advanced'
            )
        else:
            cls.template_advanced_approval = None


    def test_create_generic_iom_no_approval(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Test No Approval IOM",
            created_by=self.user,
            data_payload={"message": "This is a test message."}
        )
        self.assertTrue(str(iom.gim_id).startswith("GIM-") or str(iom.gim_id).startswith("GIM-FALLBACK-"))
        self.assertEqual(iom.status, 'draft')
        self.assertEqual(iom.subject, "Test No Approval IOM")
        self.assertEqual(iom.data_payload["message"], "This is a test message.")

    def test_generic_iom_publish_no_approval(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Publish Test",
            created_by=self.user,
            status='draft'
        )
        iom.status = 'published'
        iom.save()
        self.assertIsNotNone(iom.published_at)

    def test_create_generic_iom_simple_approval(self):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple_approval,
            subject="Test Simple Approval IOM",
            created_by=self.user,
            data_payload={"request_detail": "Simple request."}
        )
        self.assertEqual(iom.status, 'draft') # Stays draft until submitted via action

    @unittest.skipIf(not APPROVAL_SYSTEM_AVAILABLE, "Procurement approval models not available")
    def test_generic_iom_advanced_approval_workflow_trigger(self):
        if not self.template_advanced_approval:
            self.skipTest("Advanced approval template not created due to missing dependencies.")

        # Create a dummy rule for this template
        rule = ApprovalRule.objects.create(
            name="Test Generic IOM Rule",
            order=1,
            rule_type='generic_iom', # Important
            approver_user=self.user, # Assign an approver
            is_active=True
        )
        rule.applicable_iom_templates.add(self.template_advanced_approval)

        iom = GenericIOM.objects.create( # This save will trigger the workflow
            iom_template=self.template_advanced_approval,
            subject="Test Advanced Approval IOM",
            created_by=self.user,
            data_payload={"critical_note": "This is critical."},
            status='draft' # Explicitly draft to trigger workflow via save()
        )
        # iom.save() # The create() call itself triggers save().

        iom_content_type = ContentType.objects.get_for_model(GenericIOM)
        approval_steps_count = ApprovalStep.objects.filter(
            content_type=iom_content_type,
            object_id=iom.pk
        ).count()

        self.assertEqual(iom.status, 'pending_approval')
        self.assertEqual(approval_steps_count, 1)
        step = ApprovalStep.objects.get(content_type=iom_content_type, object_id=iom.pk)
        self.assertEqual(step.assigned_approver_user, self.user)

    def test_gim_id_generation_fallback(self):
        # Simulate ProcurementIDSequence not being available or failing for "GIM"
        original_proc_id_seq = None
        if 'procurement.sequence_models' in sys.modules:
            original_proc_id_seq = sys.modules['procurement.sequence_models'].ProcurementIDSequence
            sys.modules['procurement.sequence_models'].ProcurementIDSequence = None

        # Or if ProcurementIDSequence is None from the start due to import error
        # This test path is tricky to force if the import succeeded globally.
        # For now, we rely on the print statements in the model's save if it hits fallback.
        # A more robust test would mock ProcurementIDSequence.get_next_id to raise an Exception.

        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Fallback ID Test",
            created_by=self.user
        )
        self.assertTrue(iom.gim_id.startswith("GIM-FALLBACK-"))

        if original_proc_id_seq: # Restore if we mocked it
            sys.modules['procurement.sequence_models'].ProcurementIDSequence = original_proc_id_seq

    # TODO: Add tests for simple approval status changes (via simulated view actions if needed)
    # TODO: Add tests for parent_record GFK assignment and retrieval
    # TODO: Add tests for M2M fields to_users, to_groups

# Need to import sys and unittest for skipIf and potential mocking
import sys
import unittest
