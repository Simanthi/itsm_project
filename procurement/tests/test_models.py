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

# Note: The ID regex checks like r'^IM-[A-Z]{2}-\d{4}$' assume a specific format from ProcurementIDSequence.
# The current sequence generator uses YYMMDD, so this regex would need adjustment if that part is critical.
# For example: r'^IM-\d{6}-\d{4}$' if YYMMDD is used.
# The current get_next_id just uses two alpha chars, so the original regex is fine for that part.
# The sequence model in sequence_models.py is: IM-AA-0001.
# The tests are correct for the current sequence model.
# It seems the YYMMDD part was a help_text example but not actual implementation in sequence_models.py.
# The actual sequence generation: `f"{self.prefix}-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{next_numeric_str}"`
# My regex `r'^IM-[A-Z]{2}-\d{4}$'` is correct for this.
