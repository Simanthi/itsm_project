from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase # Using APITestCase for full DRF test setup
from rest_framework import status
import datetime
import json # For JSON string in multipart data

from procurement.models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount # Removed unused ExpenseCategory, RecurringPayment for this test class
)
from assets.models import Vendor as AssetVendor

User = get_user_model()

class ProcurementAPITestCase(APITestCase): # Inherit from APITestCase
    def setUp(self):
        # self.client is automatically available in APITestCase
        self.user = User.objects.create_user(username='apiuser', password='password123', is_staff=True)
        self.client.force_authenticate(user=self.user)

        self.department = Department.objects.create(name='API Test Dept', department_code='APID')
        self.vendor = AssetVendor.objects.create(name='API Vendor')
        self.project = Project.objects.create(name='API Project', project_code='APIP')
        self.gl_account = GLAccount.objects.create(account_code='API6000', name='API Supplies')
        self.contract = Contract.objects.create(contract_id='API-CTR-001', title='API Agr', vendor=self.vendor, start_date=datetime.date.today())

        # Create an IOM that is 'approved' to be linkable to a PO
        # Ensure it has an iom_id (usually generated on save)
        self.iom_for_po_api = PurchaseRequestMemo.objects.create(
            item_description='IOM for PO API',
            quantity=1,
            reason='Test API',
            requested_by=self.user,
            status='approved' # Assuming POs are created from approved IOMs
        )


    def test_create_iom_with_attachment_api(self):
        url = '/api/procurement/memos/'

        attachment_file = SimpleUploadedFile("api_iom_attach.txt", b"api_iom_content", "text/plain")
        data = {
            'item_description': 'API IOM Item', 'quantity': 1, 'reason': 'API test reason',
            'department': self.department.id,
            'project': self.project.id,
            'priority': 'low',
            'required_delivery_date': str(datetime.date.today()),
            'suggested_vendor': self.vendor.id,
            'attachments': attachment_file
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertIn('api_iom_attach', response.data['attachments']) # Check if original name part is in URL

        memo = PurchaseRequestMemo.objects.get(id=response.data['id'])
        self.assertIn('api_iom_attach', memo.attachments.name) # Check if original name part is in stored path
        # New IOMs should start in 'draft' and then go to 'pending_approval' if rules match
        self.assertEqual(memo.status, 'draft') # Or 'pending_approval' if rules were defined and matched

    def test_create_po_with_attachment_and_items_json_api(self):
        url = '/api/procurement/purchase-orders/'
        attachment_file_po = SimpleUploadedFile("api_po_attach.txt", b"api_po_content", "text/plain")

        order_items_data = [
            {'item_description': 'API PO Item 1', 'quantity': 2, 'unit_price': '50.00', 'product_code': 'APIP01', 'gl_account': self.gl_account.id}
        ]
        order_items_json_string = json.dumps(order_items_data)

        data = {
            # 'po_number': 'API-PO-001', # Auto-generated
            'vendor': self.vendor.id,
            'order_date': str(datetime.date.today()),
            'internal_office_memo': self.iom_for_po_api.id,
            'payment_terms': 'Net 15',
            'shipping_method': 'Ground',
            'po_type': 'goods',
            'currency': 'EUR',
            'related_contract': self.contract.id,
            'attachments': attachment_file_po,
            'order_items_json': order_items_json_string # Custom field handled by view
        }

        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertIn('api_po_attach', response.data['attachments'])

        po = PurchaseOrder.objects.get(id=response.data['id'])
        self.assertIn('api_po_attach', po.attachments.name)
        self.assertEqual(po.order_items.count(), 1)
        self.assertEqual(po.order_items.first().product_code, 'APIP01')

    def test_update_po_with_attachment_and_items_json_api(self):
        initial_po = PurchaseOrder.objects.create(
            # po_number is auto-generated
            vendor=self.vendor,
            created_by=self.user,
            order_date=str(datetime.date.today())
        )
        OrderItem.objects.create(purchase_order=initial_po, item_description="Old Item", quantity=1, unit_price="10.00")

        url = f'/api/procurement/purchase-orders/{initial_po.id}/'
        attachment_file_po_updated = SimpleUploadedFile("api_po_attach_updated.txt", b"updated_content", "text/plain")

        updated_order_items_data = [
            {'item_description': 'Updated API PO Item 1', 'quantity': 3, 'unit_price': '75.00', 'product_code': 'APIP02', 'gl_account': self.gl_account.id}
        ]
        updated_order_items_json_string = json.dumps(updated_order_items_data)

        data = {
            'payment_terms': 'Net 45',
            'currency': 'KES',
            'attachments': attachment_file_po_updated,
            'order_items_json': updated_order_items_json_string # Custom field handled by view
        }

        response = self.client.patch(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('attachments', response.data)
        self.assertIn('api_po_attach_updated', response.data['attachments'])

        po_updated = PurchaseOrder.objects.get(id=initial_po.id)
        self.assertIn('api_po_attach_updated', po_updated.attachments.name)
        self.assertEqual(po_updated.payment_terms, 'Net 45')
        self.assertEqual(po_updated.currency, 'KES')
        self.assertEqual(po_updated.order_items.count(), 1)
        self.assertEqual(po_updated.order_items.first().product_code, 'APIP02')
        self.assertEqual(po_updated.order_items.first().quantity, 3)


    def test_create_cr_with_attachment_api(self):
        url = '/api/procurement/check-requests/'
        attachment_file_cr = SimpleUploadedFile("api_cr_attach.txt", b"api_cr_content", "text/plain")
        po_for_cr_api = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user, total_amount=200)
        # po_for_cr_api.save() # Ensure po_number is generated if needed by CR logic/serializer

        data = {
            'purchase_order': po_for_cr_api.id,
            'invoice_number': 'API-INV-001',
            'invoice_date': str(datetime.date.today()),
            'amount': '199.99',
            'payee_name': self.vendor.name,
            'reason_for_payment': 'Payment for API PO',
            'currency': 'USD',
            'is_urgent': True,
            'attachments': attachment_file_cr,
            # 'expense_category' # Add if required and not nullable
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn('attachments', response.data)
        self.assertIn('api_cr_attach', response.data['attachments'])

        cr = CheckRequest.objects.get(id=response.data['id'])
        self.assertIn('api_cr_attach', cr.attachments.name)
        self.assertTrue(cr.is_urgent)
        self.assertEqual(cr.status, 'pending_submission') # Default status
