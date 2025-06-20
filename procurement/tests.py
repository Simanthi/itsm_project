from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import datetime

from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Vendor, Contract, GLAccount, ExpenseCategory, RecurringPayment
)
from assets.models import Vendor as AssetVendor # Since common_models.py for Contract refers to assets.Vendor
from .sequence_models import ProcurementIDSequence # Import the sequence model
from .serializers import (
    PurchaseRequestMemoSerializer, PurchaseOrderSerializer, OrderItemSerializer, CheckRequestSerializer
)

User = get_user_model()

class ProcurementModelsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        # Use AssetVendor for consistency if Contract model links to it
        self.vendor = AssetVendor.objects.create(name='Test Vendor Assets')
        self.department = Department.objects.create(name='IT Department', department_code='IT')
        self.project = Project.objects.create(name='New System Implementation', project_code='NSI24')
        self.gl_account = GLAccount.objects.create(account_code='6000', name='Office Supplies')
        self.expense_category = ExpenseCategory.objects.create(name='General Expenses')

        # Ensure Contract uses the correct Vendor model instance
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
        self.attachment = SimpleUploadedFile("test_file.txt", b"file_content", content_type="text/plain")
        # Create a dummy PurchaseRequestMemo for PO linking
        self.iom_for_po = PurchaseRequestMemo.objects.create(
            item_description='IOM for PO', quantity=1, reason='Test', requested_by=self.user
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
            suggested_vendor=self.vendor, # This should be assets.Vendor
            attachments=SimpleUploadedFile("iom_attach.txt", b"iom_content", content_type="text/plain")
        )
        # Assuming iom_id is auto-generated by a signal or overridden save method (not implemented here)
        # If not, it would be None unless manually set. For now, we'll assume it can be blank/null.
        self.assertIsNotNone(memo.iom_id)
        self.assertRegex(memo.iom_id, r'^IM-[A-Z]{2}-\d{4}$')
        self.assertEqual(memo.priority, 'high')
        self.assertTrue(memo.attachments.name.endswith("iom_attach.txt"))

    def test_create_purchase_order(self):
        po = PurchaseOrder.objects.create(
            # po_number is auto-generated
            vendor=self.vendor, # This should be assets.Vendor
            created_by=self.user,
            internal_office_memo=self.iom_for_po,
            payment_terms='Net 30',
            shipping_method='Courier',
            billing_address='123 Test St',
            po_type='goods',
            related_contract=self.contract,
            currency='KES',
            attachments=SimpleUploadedFile("po_attach.txt", b"po_content", content_type="text/plain"),
            revision_number=1
        )
        self.assertIsNotNone(po.po_number)
        self.assertRegex(po.po_number, r'^PO-[A-Z]{2}-\d{4}$')
        self.assertEqual(po.currency, 'KES')
        self.assertEqual(po.revision_number, 1)
        self.assertTrue(po.attachments.name.endswith("po_attach.txt"))


    def test_create_order_item(self):
        # PO number will be auto-generated on save if not provided
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
            discount_type='fixed', # New field
            discount_value=5.0    # New field
        )
        self.assertEqual(order_item.product_code, 'KB123')
        self.assertEqual(order_item.line_item_status, 'partially_received')

        # Test total_price property with fixed discount
        price = (2 * 25.00) # 50.00
        price_after_discount = price - 5.00 # 45.00
        expected_price_with_tax = price_after_discount * (1 + 16.0/100) # 45.00 * 1.16 = 52.20
        self.assertAlmostEqual(order_item.total_price, expected_price_with_tax, places=2)

        # Test with percentage discount
        order_item_percent_discount = OrderItem.objects.create(
            purchase_order=po, item_description='Mouse', quantity=1, unit_price=30.00,
            discount_type='percentage', discount_value=10.0, # 10% discount
            tax_rate=10.0 # 10% tax
        )
        price_mouse = 30.00
        price_after_percentage_discount = price_mouse * (1 - 10.0/100) # 30 * 0.9 = 27.00
        expected_mouse_price_with_tax = price_after_percentage_discount * (1 + 10.0/100) # 27.00 * 1.1 = 29.70
        self.assertAlmostEqual(order_item_percent_discount.total_price, expected_mouse_price_with_tax, places=2)


    def test_create_check_request(self):
        po_for_cr = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user) # PO Number auto-generated
        cr = CheckRequest.objects.create(
            purchase_order=po_for_cr,
            requested_by=self.user,
            amount=150.00,
            payee_name='Utility Company', # Should ideally come from PO's vendor if linked
            reason_for_payment='Electricity Bill',
            expense_category=self.expense_category,
            is_urgent=True,
            recurring_payment=self.recurring_payment_setup,
            currency='EUR',
            attachments=SimpleUploadedFile("cr_attach.txt", b"cr_content", content_type="text/plain")
        )
        # Assuming cr_id is auto-generated
        self.assertIsNotNone(cr.cr_id)
        self.assertRegex(cr.cr_id, r'^CR-[A-Z]{2}-\d{4}$')
        self.assertTrue(cr.is_urgent)
        self.assertEqual(cr.currency, 'EUR')
        self.assertTrue(cr.attachments.name.endswith("cr_attach.txt"))

    def test_id_sequence_rollover(self):
        # Test numeric rollover
        ProcurementIDSequence.objects.create(prefix='T1', current_alpha_part_char1='A', current_alpha_part_char2='A', current_numeric_part=9998)
        id1 = ProcurementIDSequence.get_next_id('T1') # T1-AA-9999
        self.assertEqual(id1, 'T1-AA-9999')
        id2 = ProcurementIDSequence.get_next_id('T1') # T1-AB-0001 (should be T1-AA-0001 if only numeric part rolls over to char2)
                                                     # Correcting: it should be T1-AB-0001 if char2 increments

        seq_t1 = ProcurementIDSequence.objects.get(prefix='T1')
        self.assertEqual(seq_t1.current_alpha_part_char1, 'A')
        self.assertEqual(seq_t1.current_alpha_part_char2, 'B') # This was the error in my mental model.
        self.assertEqual(seq_t1.current_numeric_part, 1)
        self.assertEqual(id2, 'T1-AB-0001')


        # Test char2 rollover
        ProcurementIDSequence.objects.create(prefix='T2', current_alpha_part_char1='A', current_alpha_part_char2='Z', current_numeric_part=9999)
        id3 = ProcurementIDSequence.get_next_id('T2') # T2-BA-0001
        self.assertEqual(id3, 'T2-BA-0001')

        seq_t2 = ProcurementIDSequence.objects.get(prefix='T2')
        self.assertEqual(seq_t2.current_alpha_part_char1, 'B')
        self.assertEqual(seq_t2.current_alpha_part_char2, 'A')
        self.assertEqual(seq_t2.current_numeric_part, 1)

        # Test exhaustion (optional, as it raises ValueError)
        exhaust_seq, _ = ProcurementIDSequence.objects.get_or_create(prefix='T3')
        exhaust_seq.current_alpha_part_char1 = 'Z'
        exhaust_seq.current_alpha_part_char2 = 'Z'
        exhaust_seq.current_numeric_part = 9999
        exhaust_seq.save()
        with self.assertRaises(ValueError):
            ProcurementIDSequence.get_next_id('T3')


class ProcurementSerializersTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='serializeruser', password='password123')
        self.vendor = AssetVendor.objects.create(name='Serializer Vendor Assets')
        self.department = Department.objects.create(name='Serializer Dept', department_code='SD')
        self.project = Project.objects.create(name='Serializer Project', project_code='SP')
        self.gl_account = GLAccount.objects.create(account_code='S6000', name='Serializer Supplies')
        self.contract = Contract.objects.create(contract_id='CTR-SER-001', title='Ser Agr', vendor=self.vendor, start_date=datetime.date.today())
        self.expense_category = ExpenseCategory.objects.create(name='Ser Expense Cat')
        self.iom_for_po_ser = PurchaseRequestMemo.objects.create(item_description='IOM for PO Ser', quantity=1, reason='Test Ser', requested_by=self.user)


        self.memo_data = {
            'item_description': 'Memo Item', 'quantity': 2, 'reason': 'Serializer test',
            'estimated_cost': '50.00', 'department': self.department.id, 'project': self.project.id,
            'priority': 'medium', 'required_delivery_date': str(datetime.date.today()),
            'suggested_vendor': self.vendor.id,
            # attachments handled separately for multipart in API tests
        }
        self.po_data = {
            'po_number': 'PO-SER-001', 'vendor': self.vendor.id, 'order_date': str(datetime.date.today()),
            'internal_office_memo': self.iom_for_po_ser.id,
            'payment_terms': 'Net 30', 'shipping_method': 'Air Freight', 'po_type': 'services',
            'currency': 'USD', 'related_contract': self.contract.id, 'billing_address': 'Bill here',
            'order_items': [
                {
                    'item_description': 'Service X', 'quantity': 1, 'unit_price': '200.00',
                    'product_code': 'SVC01', 'gl_account': self.gl_account.id, 'line_item_status': 'pending'
                }
            ]
        }
        self.cr_data = {
            'amount': '120.50', 'payee_name': self.vendor.name, 'reason_for_payment': 'Invoice #INV123',
            'currency': 'USD', 'is_urgent': False, 'expense_category': self.expense_category.id,
            'invoice_date': str(datetime.date.today()),
        }

    def test_purchase_request_memo_serializer_create(self):
        serializer = PurchaseRequestMemoSerializer(data=self.memo_data, context={'request': None}) # Add context if serializer uses it
        self.assertTrue(serializer.is_valid(), serializer.errors)
        memo = serializer.save(requested_by=self.user) # Pass user directly if serializer needs it
        self.assertEqual(memo.item_description, self.memo_data['item_description'])
        self.assertEqual(memo.department, self.department)

    def test_purchase_order_serializer_create(self):
        serializer = PurchaseOrderSerializer(data=self.po_data, context={'request': None})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        po = serializer.save(created_by=self.user)
        self.assertEqual(po.po_number, self.po_data['po_number'])
        self.assertEqual(po.order_items.count(), 1)
        self.assertEqual(po.order_items.first().item_description, 'Service X')
        self.assertEqual(po.currency, 'USD')

    def test_check_request_serializer_create(self):
        serializer = CheckRequestSerializer(data=self.cr_data, context={'request': None})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        cr = serializer.save(requested_by=self.user)
        self.assertEqual(cr.payee_name, self.vendor.name)
        self.assertEqual(cr.currency, 'USD')
        self.assertEqual(cr.expense_category, self.expense_category)


class ProcurementAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='apiuser', password='password123', is_staff=True)
        self.client.force_authenticate(user=self.user)

        self.department = Department.objects.create(name='API Test Dept', department_code='APID')
        self.vendor = AssetVendor.objects.create(name='API Vendor') # Use AssetVendor
        self.project = Project.objects.create(name='API Project', project_code='APIP')
        self.gl_account = GLAccount.objects.create(account_code='API6000', name='API Supplies')
        self.contract = Contract.objects.create(contract_id='API-CTR-001', title='API Agr', vendor=self.vendor, start_date=datetime.date.today())
        self.iom_for_po_api = PurchaseRequestMemo.objects.create(item_description='IOM for PO API', quantity=1, reason='Test API', requested_by=self.user)


    def test_create_iom_with_attachment_api(self):
        url = '/procurement/memos/'

        attachment_file = SimpleUploadedFile("api_iom_attach.txt", b"api_iom_content", "text/plain")
        data = {
            'item_description': 'API IOM Item', 'quantity': 1, 'reason': 'API test reason',
            'department': self.department.id, 'project': self.project.id,
            'priority': 'low', 'required_delivery_date': str(datetime.date.today()),
            'suggested_vendor': self.vendor.id,
            'attachments': attachment_file
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertTrue(response.data['attachments'].endswith('api_iom_attach.txt'))

        memo = PurchaseRequestMemo.objects.get(id=response.data['id'])
        self.assertTrue(memo.attachments.name.endswith('api_iom_attach.txt'))

    def test_create_po_with_attachment_and_items_json_api(self):
        url = '/procurement/purchase-orders/'
        attachment_file_po = SimpleUploadedFile("api_po_attach.txt", b"api_po_content", "text/plain")

        order_items_data = [
            {'item_description': 'API PO Item 1', 'quantity': 2, 'unit_price': '50.00', 'product_code': 'APIP01', 'gl_account': self.gl_account.id}
        ]
        import json
        order_items_json_string = json.dumps(order_items_data)

        data = {
            'po_number': 'API-PO-001', 'vendor': self.vendor.id, 'order_date': str(datetime.date.today()),
            'internal_office_memo': self.iom_for_po_api.id,
            'payment_terms': 'Net 15', 'shipping_method': 'Ground', 'po_type': 'goods',
            'currency': 'EUR', 'related_contract': self.contract.id,
            'attachments': attachment_file_po,
            'order_items_json': order_items_json_string
        }

        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertTrue(response.data['attachments'].endswith('api_po_attach.txt'))

        po = PurchaseOrder.objects.get(id=response.data['id'])
        self.assertTrue(po.attachments.name.endswith('api_po_attach.txt'))
        self.assertEqual(po.order_items.count(), 1)
        self.assertEqual(po.order_items.first().product_code, 'APIP01')

    def test_update_po_with_attachment_and_items_json_api(self):
        # First, create a PO to update
        initial_po = PurchaseOrder.objects.create(
            po_number='API-PO-UPD-001',
            vendor=self.vendor,
            created_by=self.user,
            order_date=str(datetime.date.today())
        )
        OrderItem.objects.create(purchase_order=initial_po, item_description="Old Item", quantity=1, unit_price="10.00")

        url = f'/procurement/purchase-orders/{initial_po.id}/'
        attachment_file_po_updated = SimpleUploadedFile("api_po_attach_updated.txt", b"updated_content", "text/plain")

        updated_order_items_data = [
            {'item_description': 'Updated API PO Item 1', 'quantity': 3, 'unit_price': '75.00', 'product_code': 'APIP02', 'gl_account': self.gl_account.id}
        ]
        import json
        updated_order_items_json_string = json.dumps(updated_order_items_data)

        data = {
            'payment_terms': 'Net 45', # Changed field
            'currency': 'KES', # Changed field
            'attachments': attachment_file_po_updated,
            'order_items_json': updated_order_items_json_string
        }

        response = self.client.patch(url, data, format='multipart') # Using PATCH for partial update
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('attachments', response.data)
        self.assertTrue(response.data['attachments'].endswith('api_po_attach_updated.txt'))

        po_updated = PurchaseOrder.objects.get(id=initial_po.id)
        self.assertTrue(po_updated.attachments.name.endswith('api_po_attach_updated.txt'))
        self.assertEqual(po_updated.payment_terms, 'Net 45')
        self.assertEqual(po_updated.currency, 'KES')
        self.assertEqual(po_updated.order_items.count(), 1) # Assuming update replaces items
        self.assertEqual(po_updated.order_items.first().product_code, 'APIP02')
        self.assertEqual(po_updated.order_items.first().quantity, 3)


    def test_create_cr_with_attachment_api(self):
        url = '/procurement/check-requests/'
        attachment_file_cr = SimpleUploadedFile("api_cr_attach.txt", b"api_cr_content", "text/plain")
        po_for_cr_api = PurchaseOrder.objects.create(po_number='API-PO-CR-001', vendor=self.vendor, created_by=self.user, total_amount=200)

        data = {
            'purchase_order': po_for_cr_api.id,
            'invoice_number': 'API-INV-001', 'invoice_date': str(datetime.date.today()),
            'amount': '199.99', 'payee_name': self.vendor.name,
            'reason_for_payment': 'Payment for API PO',
            'currency': 'USD', 'is_urgent': True,
            'attachments': attachment_file_cr,
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertTrue(response.data['attachments'].endswith('api_cr_attach.txt'))

        cr = CheckRequest.objects.get(id=response.data['id'])
        self.assertTrue(cr.attachments.name.endswith('api_cr_attach.txt'))
        self.assertTrue(cr.is_urgent)
