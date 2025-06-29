from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from unittest.mock import patch, MagicMock

from generic_iom.models import IOMCategory, IOMTemplate, GenericIOM
# Import ApprovalStep if we are testing signals related to it.
# For these tests, we will focus on GenericIOM signals first.
# We might need to create ApprovalStep instances if testing the handle_approval_step_created signal.
try:
    from procurement.models import ApprovalStep, ApprovalRule
    PROCUREMENT_MODELS_AVAILABLE = True
except ImportError:
    PROCUREMENT_MODELS_AVAILABLE = False
    ApprovalStep = None
    ApprovalRule = None


User = get_user_model()

# This path needs to match where send_notification_email is actually located and imported in signals.py
# If signals.py imports it as `from core_api.email_utils import send_notification_email`
# then the path to mock is 'generic_iom.signals.send_notification_email'
EMAIL_UTIL_PATH = 'generic_iom.signals.send_notification_email'

@override_settings(FRONTEND_BASE_URL="http://localhost:3000") # For get_absolute_url if it uses settings
class GenericIOMSignalTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.creator = User.objects.create_user(username='creator', email='creator@example.com', password='password')
        cls.approver_user = User.objects.create_user(username='approver', email='approver@example.com', password='password')
        cls.recipient_user1 = User.objects.create_user(username='recipient1', email='recipient1@example.com', password='password')
        cls.recipient_user2 = User.objects.create_user(username='recipient2', email='recipient2@example.com', password='password')

        cls.approver_group = Group.objects.create(name='Simple Approvers')
        cls.approver_user.groups.add(cls.approver_group) # Add approver_user to the group as well for testing group + individual

        cls.recipient_group = Group.objects.create(name='IOM Recipients Group')
        cls.recipient_user2.groups.add(cls.recipient_group) # recipient_user2 is also in this group

        cls.category = IOMCategory.objects.create(name="Notification Test Category")

        cls.template_simple = IOMTemplate.objects.create(
            name="Simple Approval Notify Template",
            created_by=cls.creator,
            category=cls.category,
            approval_type='simple',
            simple_approval_user=cls.approver_user,
            # simple_approval_group=cls.approver_group # Test with user first, then group
        )
        cls.template_simple_group_approver = IOMTemplate.objects.create(
            name="Simple Group Approval Notify Template",
            created_by=cls.creator,
            category=cls.category,
            approval_type='simple',
            simple_approval_group=cls.approver_group
        )
        cls.template_advanced = IOMTemplate.objects.create(
            name="Advanced Approval Notify Template",
            created_by=cls.creator,
            category=cls.category,
            approval_type='advanced'
        )
        cls.template_no_approval = IOMTemplate.objects.create(
            name="No Approval Notify Template",
            created_by=cls.creator,
            category=cls.category,
            approval_type='none'
        )
        if PROCUREMENT_MODELS_AVAILABLE:
             cls.adv_approval_rule = ApprovalRule.objects.create(
                name="Generic Advanced Rule",
                rule_type='generic_iom',
                order=1,
                approver_user=cls.approver_user
            )
             cls.adv_approval_rule.applicable_iom_templates.add(cls.template_advanced)


    @patch(EMAIL_UTIL_PATH)
    def test_signal_iom_submitted_for_simple_approval_user(self, mock_send_email):
        iom = GenericIOM(
            iom_template=self.template_simple,
            subject="Test Simple Submit User",
            created_by=self.creator,
            status='draft' # Start as draft
        )
        iom.save() # This should set GIM_ID

        # Now change status to trigger notification
        iom.status = 'pending_approval'
        iom.save() # This save should trigger the notification

        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        self.assertIn("Submitted for Your Approval", args[0]) # Subject
        self.assertIn(self.approver_user.email, args[2]) # Recipient list

    @patch(EMAIL_UTIL_PATH)
    def test_signal_iom_submitted_for_simple_approval_group(self, mock_send_email):
        iom = GenericIOM(
            iom_template=self.template_simple_group_approver,
            subject="Test Simple Submit Group",
            created_by=self.creator,
            status='draft'
        )
        iom.save()
        iom.status = 'pending_approval'
        iom.save()

        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        self.assertIn("Submitted for Your Approval", args[0])
        self.assertIn(self.approver_user.email, args[2]) # User is in approver_group

    @patch(EMAIL_UTIL_PATH)
    def test_signal_iom_simple_workflow_outcome_approved(self, mock_send_email):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple,
            subject="Test Simple Outcome Approved",
            created_by=self.creator,
            status='pending_approval', # Start as pending
            simple_approver_action_by=self.approver_user
        )
        iom.status = 'approved'
        iom.save() # Trigger notification

        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        self.assertIn("has been Approved", args[0]) # Subject
        self.assertEqual(args[2], [self.creator.email]) # Recipient is creator

    @patch(EMAIL_UTIL_PATH)
    def test_signal_iom_simple_workflow_outcome_rejected(self, mock_send_email):
        iom = GenericIOM.objects.create(
            iom_template=self.template_simple,
            subject="Test Simple Outcome Rejected",
            created_by=self.creator,
            status='pending_approval',
            simple_approver_action_by=self.approver_user,
            simple_approval_comments="Not good enough"
        )
        iom.status = 'rejected'
        iom.save()

        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        self.assertIn("has been Rejected", args[0])
        self.assertIn("Not good enough", args[1]) # Check for comments in message
        self.assertEqual(args[2], [self.creator.email])

    @patch(EMAIL_UTIL_PATH)
    @unittest.skipIf(not PROCUREMENT_MODELS_AVAILABLE, "Procurement models (ApprovalStep) not available for this test")
    def test_signal_advanced_approval_step_assigned(self, mock_send_email):
        # This test relies on GenericIOM.trigger_advanced_approval_workflow creating an ApprovalStep
        # which then triggers its own post_save signal handled by handle_approval_step_created_for_generic_iom_actual

        # Create the IOM, its save() will trigger workflow and create steps
        iom = GenericIOM.objects.create(
            iom_template=self.template_advanced,
            subject="Test Adv Step Assigned",
            created_by=self.creator,
            status='draft' # This will transition to pending_approval and create steps
        )
        # The signal for ApprovalStep creation should have fired.
        # Note: The mock is on generic_iom.signals.send_notification_email.
        # The handle_approval_step_created_for_generic_iom_actual calls this.

        self.assertTrue(mock_send_email.called)
        # We might have multiple calls if other signals fired too. Let's check the last relevant one.
        # Or check call_args_list
        found_adv_step_email = False
        for call_args_item in mock_send_email.call_args_list:
            args, kwargs = call_args_item
            if "Action Required: Approval Step" in args[0]:
                self.assertIn(self.approver_user.email, args[2])
                self.assertIn(iom.subject, args[1])
                found_adv_step_email = True
                break
        self.assertTrue(found_adv_step_email, "Advanced approval step assignment email not sent.")


    @patch(EMAIL_UTIL_PATH)
    @unittest.skipIf(not PROCUREMENT_MODELS_AVAILABLE, "Procurement models not available for this test")
    def test_signal_iom_advanced_workflow_outcome(self, mock_send_email):
        # Setup: Create IOM, it goes to pending_approval with steps
        iom = GenericIOM.objects.create(
            iom_template=self.template_advanced,
            subject="Test Adv Outcome",
            created_by=self.creator,
            status='draft'
        )
        self.assertEqual(iom.status, 'pending_approval') # From trigger_advanced_approval_workflow
        mock_send_email.reset_mock() # Reset from step assignment email

        # Simulate the IOM being approved via advanced workflow
        # This normally happens when all its ApprovalSteps are completed and a final signal/logic updates GenericIOM.
        # For this test, we manually change the GenericIOM status as if that happened.
        iom.status = 'approved'
        iom.save()

        # We expect one call for the "Advanced Workflow Approved" to creator
        # mock_send_email.assert_called_once() # This might fail if other signals are also triggered by save
        self.assertTrue(mock_send_email.called)
        args, kwargs = mock_send_email.call_args # Check the last call
        self.assertIn("Advanced Workflow Approved", args[0])
        self.assertEqual(args[2], [self.creator.email])


    @patch(EMAIL_UTIL_PATH)
    def test_signal_iom_published(self, mock_send_email):
        iom = GenericIOM.objects.create(
            iom_template=self.template_no_approval,
            subject="Test Published IOM",
            created_by=self.creator,
            status='approved' # Or 'draft' if no approval template
        )
        iom.to_users.add(self.recipient_user1)
        iom.to_groups.add(self.recipient_group) # recipient_user2 is in this group

        iom.status = 'published'
        iom.save()

        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        self.assertIn("New IOM Published", args[0])
        # Expected recipients: recipient_user1, and recipient_user2 (from group)
        # Note: approver_user (self.approver_user) is also in self.recipient_group via setup.
        # So, if self.approver_user has an email, it should be in the list.
        expected_emails = {self.recipient_user1.email, self.recipient_user2.email}
        if self.approver_user.email: # If approver_user (who is in recipient_group) has an email
            expected_emails.add(self.approver_user.email)

        self.assertEqual(set(args[2]), expected_emails)

# Need to import unittest for skipIf
import unittest
