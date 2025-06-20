from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from .models import (
    PurchaseRequestMemo, PurchaseOrder, CheckRequest,  # OrderItem is not directly tested for ID
    PurchaseRequestMemoSequence, PurchaseOrderSequence, CheckRequestSequence
)
from assets.models import Vendor # Assuming Vendor is in assets.models

User = get_user_model()

class ProcurementIDGenerationTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='password123', email='test@example.com')
        # Minimal Vendor setup for PO creation
        # Ensure Vendor can be created; if it has more required fields, this needs adjustment.
        cls.vendor = Vendor.objects.create(name="Test Vendor Ltd.", contact_person="Mr. Test", email="vendor_test@example.com")

    def setUp(self):
        # Clean up sequence model instances before each test to ensure isolation and predictability
        # This is crucial because sequence model instances (pk=1) are stateful.
        PurchaseRequestMemoSequence.objects.all().delete()
        PurchaseOrderSequence.objects.all().delete()
        CheckRequestSequence.objects.all().delete()

    def test_purchase_request_memo_id_generation(self):
        """Test unique ID generation for PurchaseRequestMemo (IOM)."""
        memo1 = PurchaseRequestMemo.objects.create(
            requested_by=self.user,
            item_description="Test Item 1 for IOM",
            quantity=1,
            reason="Testing IOM ID gen"
        )
        self.assertEqual(memo1.iom_id, "IM-AA-0001")

        memo2 = PurchaseRequestMemo.objects.create(
            requested_by=self.user,
            item_description="Test Item 2 for IOM",
            quantity=2,
            reason="Testing IOM ID gen again"
        )
        self.assertEqual(memo2.iom_id, "IM-AA-0002")

    def test_purchase_order_id_generation(self):
        """Test unique ID generation for PurchaseOrder (PO)."""
        po1 = PurchaseOrder.objects.create(
            vendor=self.vendor,
            created_by=self.user,
            shipping_address="123 Test St, PO"
        )
        self.assertEqual(po1.po_number, "PO-AA-0001")

        po2 = PurchaseOrder.objects.create(
            vendor=self.vendor,
            created_by=self.user,
            shipping_address="456 Test Ave, PO"
        )
        self.assertEqual(po2.po_number, "PO-AA-0002")

    def test_check_request_id_generation(self):
        """Test unique ID generation for CheckRequest (CR)."""
        cr1 = CheckRequest.objects.create(
            requested_by=self.user,
            amount=Decimal("100.00"),
            payee_name="Test Payee CR1",
            reason_for_payment="Test Payment CR1"
        )
        self.assertEqual(cr1.cr_id, "CR-AA-0001")

        cr2 = CheckRequest.objects.create(
            requested_by=self.user,
            amount=Decimal("250.50"),
            payee_name="Test Payee CR2",
            reason_for_payment="Test Payment CR2"
        )
        self.assertEqual(cr2.cr_id, "CR-AA-0002")

    def test_id_sequence_rollover_numeric_to_alpha_char2(self):
        """Test numeric part rolls over and increments second alpha character."""
        # Setup sequence to be at X-AA-9999
        seq, _ = PurchaseRequestMemoSequence.objects.get_or_create(pk=1)
        seq.current_numeric_part = 9998
        seq.current_alpha_part_char1 = "A"
        seq.current_alpha_part_char2 = "A"
        seq.save()

        # This will create IM-AA-9999
        PurchaseRequestMemo.objects.create(requested_by=self.user, item_description="Item 9999")

        # This should roll over to IM-AB-0001
        memo_rollover = PurchaseRequestMemo.objects.create(requested_by=self.user, item_description="Item Rollover")
        self.assertEqual(memo_rollover.iom_id, "IM-AB-0001")

    def test_id_sequence_rollover_alpha_char2_to_alpha_char1(self):
        """Test second alpha char rolls over and increments first alpha character."""
        # Setup sequence to be at X-AZ-9999
        seq, _ = PurchaseOrderSequence.objects.get_or_create(pk=1)
        seq.current_numeric_part = 9998
        seq.current_alpha_part_char1 = "A"
        seq.current_alpha_part_char2 = "Z"
        seq.save()

        # This will create PO-AZ-9999
        PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)

        # This should roll over to PO-BA-0001
        po_rollover = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        self.assertEqual(po_rollover.po_number, "PO-BA-0001")

    def test_id_sequence_full_rollover_exhaustion(self):
        """Test that sequence exhaustion (ZZ-9999) raises a ValueError."""
        # Setup sequence to be at X-ZZ-9999
        seq, _ = CheckRequestSequence.objects.get_or_create(pk=1)
        seq.current_numeric_part = 9998
        seq.current_alpha_part_char1 = "Z"
        seq.current_alpha_part_char2 = "Z"
        seq.save()

        # This will create CR-ZZ-9999
        CheckRequest.objects.create(requested_by=self.user, amount="1.00", payee_name="Almost Last Payee")

        # Attempting to create one more should raise ValueError
        with self.assertRaisesRegex(ValueError, "CR ID sequence exhausted"):
            CheckRequest.objects.create(requested_by=self.user, amount="2.00", payee_name="Too Many Payees")

    def test_concurrent_id_generation_safety(self):
        """
        Basic check for concurrency safety. This test doesn't truly simulate concurrency
        but ensures that rapid sequential creations don't lead to duplicate IDs.
        Proper concurrency testing requires more advanced tools or database-level checks.
        """
        # This test relies on the atomicity provided by `select_for_update()` in `get_next_sequence_value`.
        # It's hard to test true concurrency in Django unit tests without external tools.
        # We are checking for sequential consistency.

        # Create a batch of IOMs
        iom_ids = set()
        for i in range(50): # Create 50 IOMs
            memo = PurchaseRequestMemo.objects.create(
                requested_by=self.user,
                item_description=f"Concurrent Test IOM {i+1}",
                quantity=1,
                reason="Concurrency Test"
            )
            iom_ids.add(memo.iom_id)

        self.assertEqual(len(iom_ids), 50, "Generated IOM IDs are not unique.")

        # Create a batch of POs
        po_ids = set()
        for i in range(50): # Create 50 POs
            po = PurchaseOrder.objects.create(
                vendor=self.vendor,
                created_by=self.user,
                shipping_address=f"Addr {i+1}"
            )
            po_ids.add(po.po_number)
        self.assertEqual(len(po_ids), 50, "Generated PO IDs are not unique.")

        # Create a batch of CRs
        cr_ids = set()
        for i in range(50): # Create 50 CRs
            cr = CheckRequest.objects.create(
                requested_by=self.user,
                amount=Decimal(f"{i+1}.00"),
                payee_name=f"Concurrent Payee {i+1}",
                reason_for_payment="Concurrency Test"
            )
            cr_ids.add(cr.cr_id)
        self.assertEqual(len(cr_ids), 50, "Generated CR IDs are not unique.")

        # Verify the next expected sequence numbers after these batches
        # For IOM (IM-AA-0001 to IM-AA-0050 were created)
        next_iom = PurchaseRequestMemo.objects.create(requested_by=self.user, item_description="Next IOM")
        self.assertEqual(next_iom.iom_id, "IM-AA-0051")

        # For PO (PO-AA-0001 to PO-AA-0050 were created)
        next_po = PurchaseOrder.objects.create(vendor=self.vendor, created_by=self.user)
        self.assertEqual(next_po.po_number, "PO-AA-0051")

        # For CR (CR-AA-0001 to CR-AA-0050 were created)
        next_cr = CheckRequest.objects.create(requested_by=self.user, amount="100.00", payee_name="Next CR")
        self.assertEqual(next_cr.cr_id, "CR-AA-0051")
