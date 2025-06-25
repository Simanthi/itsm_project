from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
import datetime
import os # For path manipulations

from procurement.models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment
)
# Note: The original tests.py imported Vendor from assets.models directly for Contract.
# Assuming common_models.Vendor (which is assets.models.Vendor) is used by Contract model.
from assets.models import Vendor as AssetVendor
from procurement.sequence_models import ProcurementIDSequence

User = get_user_model()

class ProcurementModelsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.vendor = AssetVendor.objects.create(name='Test Vendor Assets')
        self.department = Department.objects.create(name='IT Department', department_code='IT')
        self.project = Project.objects.create(name='New System Implementation', project_code='NSI24')
        self.gl_account = GLAccount.objects.create(account_code='6000', name='Office Supplies')
        self.expense_category = ExpenseCategory.objects.create(name='General Expenses')

        self.contract = Contract.objects.create(
            contract_id='CTR-001',
            title='Service Agreement',
            vendor=self.vendor,
            start_date=datetime.date.today()
        )
        self.recurring_payment_setup = RecurringPayment.objects.create(
            payment_name='Monthly Software Subscription',
            vendor=self.vendor,
            amount=100.00,
            currency='USD',
            frequency='monthly',
            next_due_date=datetime.date.today() + datetime.timedelta(days=30),
            start_date=datetime.date.today()
        )
        # self.attachment = SimpleUploadedFile("test_file.txt", b"file_content", content_type="text/plain") # Not used directly in model tests below
        self.iom_for_po = PurchaseRequestMemo.objects.create(
            item_description='IOM for PO', quantity=1, reason='Test', requested_by=self.user, status='approved' # Assume approved for PO creation
        )
        # ApprovalRule and ApprovalStep related setup will be done in specific test methods
        # as they are not needed for all model tests.


    def test_create_purchase_request_memo(self):
        memo = PurchaseRequestMemo.objects.create(
            item_description='Need new keyboards',
            quantity=5,
            reason='Old ones are broken',
            requested_by=self.user,
            department=self.department,
            project=self.project,
            priority='high',
            required_delivery_date=datetime.date.today() + datetime.timedelta(days=10),
            suggested_vendor=self.vendor,
            attachments=SimpleUploadedFile("iom_attach.txt", b"iom_content", content_type="text/plain"),
            status='draft' # Start with draft for workflow
        )
        self.assertIsNotNone(memo.iom_id) # save() method generates it
        self.assertRegex(memo.iom_id, r'^IM-[A-Z]{2}-\d{4}$')
        self.assertEqual(memo.priority, 'high')
        self.assertTrue(os.path.basename(memo.attachments.name).startswith("iom_attach"))
        self.assertEqual(memo.status, 'draft') # Default status

    def test_purchase_request_memo_save_triggers_workflow(self):
        # Mock trigger_approval_workflow to check if it's called
        # This is a basic way to check. More advanced mocking can be used if needed.
        original_trigger_workflow = PurchaseRequestMemo.trigger_approval_workflow
        PurchaseRequestMemo.trigger_approval_workflow = lambda self, force_retrigger=False: setattr(self, '_workflow_triggered_test', True)

        memo = PurchaseRequestMemo(
            item_description='Test Workflow Trigger',
            quantity=1,
            reason='Test',
            requested_by=self.user,
            department=self.department,
            estimated_cost=100
        )
        # Should trigger on initial save if status is draft (which is default)
        memo.save()
        self.assertTrue(hasattr(memo, '_workflow_triggered_test') and memo._workflow_triggered_test)
        self.assertEqual(memo.status, 'draft') # Status might change if actual workflow runs and creates steps

        # Reset for next part of test
        delattr(memo, '_workflow_triggered_test')
        memo.status = 'approved' # Change status
        memo.save() # Should not trigger if status is not 'draft' and not new
        self.assertFalse(hasattr(memo, '_workflow_triggered_test'))

        # Restore original method
        PurchaseRequestMemo.trigger_approval_workflow = original_trigger_workflow


    def test_create_purchase_order(self):
        po = PurchaseOrder.objects.create(
            vendor=self.vendor,
            created_by=self.user,
            internal_office_memo=self.iom_for_po, # IOM should exist and preferably be approved
            payment_terms='Net 30',
            shipping_method='Courier',
            billing_address='123 Test St',
            po_type='goods',
            related_contract=self.contract,
            currency='KES',
            attachments=SimpleUploadedFile("po_attach.txt", b"po_content", content_type="text/plain"),
            revision_number=1
        )
        self.assertIsNotNone(po.po_number) # save() method generates it
        self.assertRegex(po.po_number, r'^PO-[A-Z]{2}-\d{4}$')
        self.assertEqual(po.currency, 'KES')
        self.assertEqual(po.revision_number, 1)
        self.assertTrue(os.path.basename(po.attachments.name).startswith("po_attach"))


    def test_create_order_item(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        order_item = OrderItem.objects.create(
            purchase_order=po,
            item_description='Keyboard',
            quantity=2,
            unit_price=25.00,
            product_code='KB123',
            gl_account=self.gl_account,
            received_quantity=1,
            line_item_status='partially_received',
            tax_rate=16.0,
            discount_type='fixed',
            discount_value=5.0
        )
        self.assertEqual(order_item.product_code, 'KB123')
        self.assertEqual(order_item.line_item_status, 'partially_received')

        price = (2 * 25.00)
        price_after_discount = price - 5.00
        expected_price_with_tax = price_after_discount * (1 + 16.0/100)
        self.assertAlmostEqual(order_item.total_price, expected_price_with_tax, places=2)

        order_item_percent_discount = OrderItem.objects.create(
            purchase_order=po, item_description='Mouse', quantity=1, unit_price=30.00,
            discount_type='percentage', discount_value=10.0,
            tax_rate=10.0
        )
        price_mouse = 30.00
        price_after_percentage_discount = price_mouse * (1 - 10.0/100)
        expected_mouse_price_with_tax = price_after_percentage_discount * (1 + 10.0/100)
        self.assertAlmostEqual(order_item_percent_discount.total_price, expected_mouse_price_with_tax, places=2)


    def test_create_check_request(self):
        po_for_cr = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        cr = CheckRequest.objects.create(
            purchase_order=po_for_cr,
            requested_by=self.user,
            amount=150.00,
            payee_name='Utility Company',
            reason_for_payment='Electricity Bill',
            expense_category=self.expense_category,
            is_urgent=True,
            recurring_payment=self.recurring_payment_setup,
            currency='EUR',
            attachments=SimpleUploadedFile("cr_attach.txt", b"cr_content", content_type="text/plain")
        )
        self.assertIsNotNone(cr.cr_id) # save() method generates it
        self.assertRegex(cr.cr_id, r'^CR-[A-Z]{2}-\d{4}$')
        self.assertTrue(cr.is_urgent)
        self.assertEqual(cr.currency, 'EUR')
        self.assertTrue(os.path.basename(cr.attachments.name).startswith("cr_attach"))

    def test_id_sequence_rollover(self):
        ProcurementIDSequence.objects.create(prefix='T1', current_alpha_part_char1='A', current_alpha_part_char2='A', current_numeric_part=9998)
        id1 = ProcurementIDSequence.get_next_id('T1')
        self.assertEqual(id1, 'T1-AA-9999')
        id2 = ProcurementIDSequence.get_next_id('T1')

        seq_t1 = ProcurementIDSequence.objects.get(prefix='T1')
        self.assertEqual(seq_t1.current_alpha_part_char1, 'A')
        self.assertEqual(seq_t1.current_alpha_part_char2, 'B')
        self.assertEqual(seq_t1.current_numeric_part, 1)
        self.assertEqual(id2, 'T1-AB-0001')

        ProcurementIDSequence.objects.create(prefix='T2', current_alpha_part_char1='A', current_alpha_part_char2='Z', current_numeric_part=9999)
        id3 = ProcurementIDSequence.get_next_id('T2')
        self.assertEqual(id3, 'T2-BA-0001')

        seq_t2 = ProcurementIDSequence.objects.get(prefix='T2')
        self.assertEqual(seq_t2.current_alpha_part_char1, 'B')
        self.assertEqual(seq_t2.current_alpha_part_char2, 'A')
        self.assertEqual(seq_t2.current_numeric_part, 1)

        exhaust_seq, _ = ProcurementIDSequence.objects.get_or_create(prefix='T3')
        exhaust_seq.current_alpha_part_char1 = 'Z'
        exhaust_seq.current_alpha_part_char2 = 'Z'
        exhaust_seq.current_numeric_part = 9999
        exhaust_seq.save()
        with self.assertRaises(ValueError):
            ProcurementIDSequence.get_next_id('T3')

    def test_order_item_total_price_no_tax_no_discount(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00)
        item.save()
        self.assertEqual(item.total_price, 20.00)

    def test_order_item_total_price_with_fixed_discount(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(
            purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00,
            discount_type='fixed', discount_value=2.00
        )
        item.save()
        self.assertEqual(item.total_price, 18.00) # (2*10) - 2

    def test_order_item_total_price_with_percentage_discount(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(
            purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00,
            discount_type='percentage', discount_value=10.00 # 10%
        )
        item.save()
        self.assertEqual(item.total_price, 18.00) # (2*10) * 0.9

    def test_order_item_total_price_with_tax(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(
            purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00,
            tax_rate=10.00 # 10%
        )
        item.save()
        self.assertEqual(item.total_price, 22.00) # (2*10) * 1.1

    def test_order_item_total_price_with_tax_and_fixed_discount(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(
            purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00,
            discount_type='fixed', discount_value=2.00,
            tax_rate=10.00 # 10%
        )
        item.save()
        # Price after discount: (2*10) - 2 = 18. Tax on 18: 1.8. Total: 18 + 1.8 = 19.8
        self.assertAlmostEqual(item.total_price, 19.80, places=2)

    def test_order_item_total_price_with_tax_and_percentage_discount(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        item = OrderItem(
            purchase_order=po, item_description="Test Item", quantity=2, unit_price=10.00,
            discount_type='percentage', discount_value=10.00, # 10% discount
            tax_rate=10.00 # 10% tax
        )
        item.save()
        # Price after discount: (2*10) * 0.9 = 18. Tax on 18: 1.8. Total: 18 + 1.8 = 19.8
        self.assertAlmostEqual(item.total_price, 19.80, places=2)

# Note: The ID regex checks like r'^IM-[A-Z]{2}-\d{4}$' assume a specific format from ProcurementIDSequence.
# The current sequence generator uses YYMMDD, so this regex would need adjustment if that part is critical.
# For example: r'^IM-\d{6}-\d{4}$' if YYMMDD is used.
# The current get_next_id just uses two alpha chars, so the original regex is fine for that part.
# The sequence model in sequence_models.py is: IM-AA-0001.
# The tests are correct for the current sequence model.
# It seems the YYMMDD part was a help_text example but not actual implementation in sequence_models.py.
# The actual sequence generation: `f"{self.prefix}-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{next_numeric_str}"`
# My regex `r'^IM-[A-Z]{2}-\d{4}$'` is correct for this.


# Tests for Approval Workflow Models
from procurement.models import ApprovalRule, ApprovalStep, ApprovalDelegation
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone

class ApprovalWorkflowModelsTestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='approver1', password='password')
        self.user2 = User.objects.create_user(username='approver2', password='password')
        self.group1 = Group.objects.create(name='Approver Group 1')
        self.group1.user_set.add(self.user1)

        self.dept1 = Department.objects.create(name='Sales')
        self.proj1 = Project.objects.create(name='Q1 Campaign')

        self.iom = PurchaseRequestMemo.objects.create(
            item_description='Test IOM for Approval',
            quantity=1, reason='Test', requested_by=self.user1,
            estimated_cost=1000.00, department=self.dept1, project=self.proj1,
            status='draft' # Start as draft to trigger workflow
        )

    def test_approval_rule_clean_validation(self):
        # Both user and group
        with self.assertRaises(ValidationError) as context:
            rule = ApprovalRule(name='Test Rule Both', order=1, approver_user=self.user1, approver_group=self.group1)
            rule.clean()
        self.assertIn("cannot have both a specific approver user and an approver group", str(context.exception))

        # Neither user nor group
        with self.assertRaises(ValidationError) as context:
            rule = ApprovalRule(name='Test Rule None', order=1)
            rule.clean()
        self.assertIn("must specify either an approver user or an approver group", str(context.exception))

        # Valid: user only
        rule_user = ApprovalRule(name='Test Rule User', order=1, approver_user=self.user1)
        rule_user.clean() # Should not raise

        # Valid: group only
        rule_group = ApprovalRule(name='Test Rule Group', order=1, approver_group=self.group1)
        rule_group.clean() # Should not raise

    def test_approval_step_save_snapshot(self):
        rule = ApprovalRule.objects.create(name='Initial Rule Name', order=1, approver_user=self.user1)
        step = ApprovalStep(
            purchase_request_memo=self.iom,
            approval_rule=rule,
            step_order=rule.order,
            assigned_approver_user=rule.approver_user
        )
        step.save()
        self.assertEqual(step.rule_name_snapshot, 'Initial Rule Name')

        # Test that snapshot doesn't change if rule name changes after step creation
        rule.name = 'Updated Rule Name'
        rule.save()
        step.refresh_from_db()
        self.assertEqual(step.rule_name_snapshot, 'Initial Rule Name')


    def test_approval_delegation_clean_validation(self):
        # Delegator same as delegatee
        with self.assertRaises(ValidationError) as context:
            delegation = ApprovalDelegation(
                delegator=self.user1, delegatee=self.user1,
                start_date=timezone.now(), end_date=timezone.now() + timezone.timedelta(days=1)
            )
            delegation.clean()
        self.assertIn("Delegator and Delegatee cannot be the same user", str(context.exception))

        # End date before start date
        with self.assertRaises(ValidationError) as context:
            delegation = ApprovalDelegation(
                delegator=self.user1, delegatee=self.user2,
                start_date=timezone.now(), end_date=timezone.now() - timezone.timedelta(days=1)
            )
            delegation.clean()
        self.assertIn("End date must be after start date", str(context.exception))

        # Valid delegation
        delegation_valid = ApprovalDelegation(
            delegator=self.user1, delegatee=self.user2,
            start_date=timezone.now(), end_date=timezone.now() + timezone.timedelta(days=1)
        )
        delegation_valid.clean() # Should not raise

    def test_get_active_delegate(self):
        now = timezone.now()
        # Active delegation
        delegation1 = ApprovalDelegation.objects.create(
            delegator=self.user1, delegatee=self.user2,
            start_date=now - timezone.timedelta(days=1),
            end_date=now + timezone.timedelta(days=1),
            is_active=True
        )
        self.assertEqual(ApprovalDelegation.get_active_delegate(self.user1), self.user2)

        # Inactive delegation
        delegation2 = ApprovalDelegation.objects.create(
            delegator=self.user1, delegatee=self.user2,
            start_date=now - timezone.timedelta(days=1),
            end_date=now + timezone.timedelta(days=1),
            is_active=False # Inactive
        )
        # get_active_delegate should still return user2 because delegation1 is active and more recent
        # Let's test with a new user or make delegation1 inactive
        delegation1.is_active = False
        delegation1.save()
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.user1))

        delegation2.is_active = True # Activate this one
        delegation2.save()
        self.assertEqual(ApprovalDelegation.get_active_delegate(self.user1), self.user2)


        # Past delegation
        ApprovalDelegation.objects.create(
            delegator=self.user2, delegatee=self.user1, # Different user to avoid conflict
            start_date=now - timezone.timedelta(days=2),
            end_date=now - timezone.timedelta(days=1),
            is_active=True
        )
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.user2))

        # Future delegation
        ApprovalDelegation.objects.create(
            delegator=self.user2, delegatee=self.user1,
            start_date=now + timezone.timedelta(days=1),
            end_date=now + timezone.timedelta(days=2),
            is_active=True
        )
        self.assertIsNone(ApprovalDelegation.get_active_delegate(self.user2))

    def test_purchase_request_memo_trigger_approval_workflow_actual_run(self):
        # Create some rules
        rule1 = ApprovalRule.objects.create(
            name="Dept Head Approval", order=10, approver_user=self.user1,
            min_amount=500, applies_to_all_projects=True
            # Departments will be set after creation
        )
        rule1.departments.set([self.dept1])

        rule2 = ApprovalRule.objects.create(
            name="Finance Approval", order=20, approver_group=self.group1, # group1 contains user1
            min_amount=100, applies_to_all_departments=True, applies_to_all_projects=True
        )

        # IOM from setUp: estimated_cost=1000.00, department=self.dept1
        # It should match both rules. Rule1 applies because of department and amount. Rule2 applies due to amount.
        self.iom.save() # This should call trigger_approval_workflow as status is 'draft'

        self.assertEqual(self.iom.status, 'pending_approval')
        steps = self.iom.approval_steps.all().order_by('step_order')
        self.assertEqual(steps.count(), 2)

        self.assertEqual(steps[0].approval_rule, rule2) # rule2 has lower order (10) if rule1 order was 20
        self.assertEqual(steps[0].assigned_approver_group, self.group1)
        self.assertEqual(steps[0].status, 'pending')
        self.assertEqual(steps[0].rule_name_snapshot, rule2.name)

        self.assertEqual(steps[1].approval_rule, rule1) # rule1 has higher order (20) if rule1 order was 20
        self.assertEqual(steps[1].assigned_approver_user, self.user1)
        self.assertEqual(steps[1].status, 'pending')
        self.assertEqual(steps[1].rule_name_snapshot, rule1.name)

        # Test no matching rules
        iom_no_match = PurchaseRequestMemo.objects.create(
            item_description='Low value IOM', quantity=1, reason='Test', requested_by=self.user1,
            estimated_cost=50.00, # Below min_amount of rule2
            status='draft'
        )
        iom_no_match.save() # Trigger workflow
        self.assertEqual(iom_no_match.status, 'draft') # Should remain draft
        self.assertEqual(iom_no_match.approval_steps.count(), 0)

        # Test force_retrigger
        iom_no_match.status = 'approved' # Change status so it wouldn't normally trigger
        iom_no_match.save()
        iom_no_match.trigger_approval_workflow(force_retrigger=True)
        self.assertEqual(iom_no_match.approval_steps.count(), 0) # Still no matching rules
        self.assertEqual(iom_no_match.status, 'approved') # Status should not change if no steps created

        # Test retrigger deletes old pending steps
        step_to_delete = ApprovalStep.objects.create(purchase_request_memo=self.iom, step_order=5, status='pending')
        self.iom.status = 'draft' # Set to draft to allow re-trigger without force
        self.iom.save() # This will re-trigger
        with self.assertRaises(ApprovalStep.DoesNotExist):
            ApprovalStep.objects.get(pk=step_to_delete.pk)
        self.assertTrue(self.iom.approval_steps.filter(status='pending').exists()) # New steps should exist
