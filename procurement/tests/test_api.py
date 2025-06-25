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

    # --- PurchaseOrderViewSet Tests ---
    def test_list_purchase_orders(self):
        # Create a couple of POs to list
        PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user, order_date=datetime.date.today())
        PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user, order_date=datetime.date.today() - datetime.timedelta(days=1))

        url = '/api/procurement/purchase-orders/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2) # Checks if at least the created POs are listed

    def test_retrieve_purchase_order(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user, order_date=datetime.date.today())
        url = f'/api/procurement/purchase-orders/{po.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], po.id)
        self.assertIsNotNone(response.data['po_number']) # Check auto-generated field

    def test_create_po_invalid_data_api(self):
        url = '/api/procurement/purchase-orders/'
        # Missing vendor (required field)
        data_no_vendor = {
            'order_date': str(datetime.date.today()),
            'order_items_json': json.dumps([{'item_description': 'Test', 'quantity': 1, 'unit_price': '10.00'}])
        }
        response = self.client.post(url, data_no_vendor, format='json') # Using json format for this test
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vendor', response.data)

        # Invalid order_items_json (badly formatted JSON)
        data_bad_json = {
            'vendor': self.vendor.id,
            'order_date': str(datetime.date.today()),
            'order_items_json': "{'item_description': 'Test', quantity: 1}" # Not valid JSON
        }
        response = self.client.post(url, data_bad_json, format='multipart') # Multipart can also carry bad json string
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('order_items_json', response.data) # Serializer should catch JSONDecodeError

    def test_delete_purchase_order(self):
        po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user, order_date=datetime.date.today())
        url = f'/api/procurement/purchase-orders/{po.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        with self.assertRaises(PurchaseOrder.DoesNotExist):
            PurchaseOrder.objects.get(id=po.id)

    # --- PurchaseRequestMemoViewSet Tests ---
    def test_list_ioms(self):
        url = '/api/procurement/memos/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # self.iom_for_po_api is created in setUp
        self.assertTrue(any(item['id'] == self.iom_for_po_api.id for item in response.data['results']))

    def test_retrieve_iom(self):
        url = f'/api/procurement/memos/{self.iom_for_po_api.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.iom_for_po_api.id)

    def test_iom_cancel_action(self):
        # Create a draft IOM to cancel
        draft_iom = PurchaseRequestMemo.objects.create(
            item_description='Draft IOM to cancel', requested_by=self.user, status='draft'
        )
        url = f'/api/procurement/memos/{draft_iom.id}/cancel/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], 'cancelled')
        draft_iom.refresh_from_db()
        self.assertEqual(draft_iom.status, 'cancelled')

        # Try cancelling an already approved IOM (should fail)
        url_approved = f'/api/procurement/memos/{self.iom_for_po_api.id}/cancel/' # self.iom_for_po_api is 'approved'
        response_approved = self.client.post(url_approved)
        self.assertEqual(response_approved.status_code, status.HTTP_400_BAD_REQUEST)


    # --- CheckRequestViewSet Tests ---
    def test_list_check_requests(self):
        # Create a CR to list
        po_for_cr = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        cr = CheckRequest.objects.create(purchase_order=po_for_cr, requested_by=self.user, amount=50.00, payee_name="Test Payee", reason_for_payment="Test Reason")

        url = '/api/procurement/check-requests/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == cr.id for item in response.data['results']))

    def test_retrieve_check_request(self):
        po_for_cr = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        cr = CheckRequest.objects.create(purchase_order=po_for_cr, requested_by=self.user, amount=50.00, payee_name="Test Payee", reason_for_payment="Test Reason")
        url = f'/api/procurement/check-requests/{cr.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], cr.id)

    def test_check_request_actions(self):
        po_for_cr = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        cr = CheckRequest.objects.create(
            purchase_order=po_for_cr, requested_by=self.user, amount=100.00,
            payee_name="Action Payee", reason_for_payment="CR Actions Test",
            status='pending_submission' # Start here
        )

        # Submit for approval
        url_submit = f'/api/procurement/check-requests/{cr.id}/submit_for_approval/'
        response_submit = self.client.post(url_submit)
        self.assertEqual(response_submit.status_code, status.HTTP_200_OK, response_submit.data)
        self.assertEqual(response_submit.data['status'], 'pending_approval')
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'pending_approval')

        # Accounts Approve
        url_approve = f'/api/procurement/check-requests/{cr.id}/accounts_approve/'
        response_approve = self.client.post(url_approve, {'comments': 'Approved by API test'})
        self.assertEqual(response_approve.status_code, status.HTTP_200_OK, response_approve.data)
        self.assertEqual(response_approve.data['status'], 'approved')
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'approved')
        self.assertEqual(cr.approved_by_accounts, self.user)
        self.assertEqual(cr.accounts_comments, 'Approved by API test')

        # Mark Payment Processing (from 'approved')
        url_processing = f'/api/procurement/check-requests/{cr.id}/mark_payment_processing/'
        response_processing = self.client.post(url_processing)
        self.assertEqual(response_processing.status_code, status.HTTP_200_OK, response_processing.data)
        self.assertEqual(response_processing.data['status'], 'payment_processing')
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'payment_processing')

        # Confirm Payment
        url_confirm_payment = f'/api/procurement/check-requests/{cr.id}/confirm_payment/'
        payment_data = {
            'payment_method': 'check',
            'transaction_id': 'CHK12345',
            'payment_date': str(datetime.date.today()),
            'payment_notes': 'Paid via API test'
        }
        response_payment = self.client.post(url_confirm_payment, payment_data)
        self.assertEqual(response_payment.status_code, status.HTTP_200_OK, response_payment.data)
        self.assertEqual(response_payment.data['status'], 'paid')
        cr.refresh_from_db()
        self.assertEqual(cr.status, 'paid')
        self.assertEqual(cr.payment_method, 'check')
        self.assertEqual(cr.transaction_id, 'CHK12345')

        # Test Reject (create a new one for this flow)
        cr_for_reject = CheckRequest.objects.create(
            purchase_order=po_for_cr, requested_by=self.user, amount=200.00, status='pending_approval'
        )
        url_reject = f'/api/procurement/check-requests/{cr_for_reject.id}/accounts_reject/'
        response_reject = self.client.post(url_reject, {'comments': 'Rejected by API test - insufficient funds'})
        self.assertEqual(response_reject.status_code, status.HTTP_200_OK, response_reject.data)
        self.assertEqual(response_reject.data['status'], 'rejected')
        cr_for_reject.refresh_from_db()
        self.assertEqual(cr_for_reject.status, 'rejected')
        self.assertEqual(cr_for_reject.accounts_comments, 'Rejected by API test - insufficient funds')

        # Test Cancel (create a new one for this flow)
        cr_for_cancel = CheckRequest.objects.create(
            purchase_order=po_for_cr, requested_by=self.user, amount=200.00, status='pending_submission'
        )
        url_cancel = f'/api/procurement/check-requests/{cr_for_cancel.id}/cancel/'
        response_cancel = self.client.post(url_cancel)
        self.assertEqual(response_cancel.status_code, status.HTTP_200_OK, response_cancel.data)
        self.assertEqual(response_cancel.data['status'], 'cancelled')

    # TODO: Add tests for ApprovalRuleViewSet and ApprovalStepViewSet (listing, creating if allowed, actions)
    # These will require more setup for rules and steps.
