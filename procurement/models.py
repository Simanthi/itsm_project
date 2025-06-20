from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone  # Added
from assets.models import Vendor  # Added, assuming this is the correct path to Vendor model

User = get_user_model()


class PurchaseRequestMemo(models.Model):
    iom_id = models.CharField(
        _("IOM ID"),
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
        help_text=_("Unique Internal Office Memo ID (e.g., IM-AA-0001)")
    )
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('po_created', _('PO Created')),  # When a Purchase Order is made from this
        ('cancelled', _('Cancelled')),  # If the requester cancels it
    ]

    item_description = models.TextField(_("Item Description"))
    quantity = models.PositiveIntegerField(_("Quantity"), default=1)
    reason = models.TextField(_("Reason for Purchase"))
    estimated_cost = models.DecimalField(
        _("Estimated Cost"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # If user deleted, their requests are gone
        related_name='purchase_requests',
        verbose_name=_("Requested By")
    )
    request_date = models.DateTimeField(_("Request Date"), auto_now_add=True)
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    # Approval details
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,  # Keep the memo even if approver account is deleted
        related_name='approved_purchase_requests',
        null=True,
        blank=True,
        verbose_name=_("Approver")
    )
    decision_date = models.DateTimeField(_("Decision Date"), null=True, blank=True)
    approver_comments = models.TextField(_("Approver Comments"), blank=True)

    class Meta:
        verbose_name = _("Purchase Request Memo")
        verbose_name_plural = _("Purchase Request Memos")
        ordering = ['-request_date']

    def __str__(self):
        return f"{self.iom_id} - {self.item_description[:50]} by {self.requested_by.username}"

    def save(self, *args, **kwargs):
        if not self.iom_id:
            self.iom_id = PurchaseRequestMemoSequence.get_next_sequence_value(prefix="IM")
        super().save(*args, **kwargs)


class PurchaseOrder(models.Model):
    # po_number will store the new unique ID.
    # Existing: po_number = models.CharField(_("PO Number"), max_length=50, unique=True, help_text="Unique Purchase Order number")
    # To be modified to be blank=True, editable=False initially and populated by save()
    po_number = models.CharField(
        _("PO Number"),
        max_length=20,  # Adjusted length for "PO-XX-NNNN" format
        unique=True,
        blank=True,  # Will be populated by save method
        editable=False,
        help_text="Unique Purchase Order ID (e.g., PO-AA-0001)"
    )
    PO_STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('pending_approval', _('Pending Approval')),
        ('approved', _('Approved')),
        ('partially_received', _('Partially Received')),
        ('fully_received', _('Fully Received')),
        ('invoiced', _('Invoiced')),
        ('paid', _('Paid')),
        ('cancelled', _('Cancelled')),
    ]

    po_number = models.CharField(_("PO Number"), max_length=50, unique=True, help_text="Unique Purchase Order number")
    internal_office_memo = models.OneToOneField(
        PurchaseRequestMemo,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='purchase_order',
        verbose_name=_("Internal Office Memo")
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name='purchase_orders',
        verbose_name=_("Vendor")
    )
    order_date = models.DateField(_("Order Date"), default=timezone.now)
    expected_delivery_date = models.DateField(_("Expected Delivery Date"), null=True, blank=True)
    total_amount = models.DecimalField(_("Total Amount"), max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(_("Status"), max_length=20, choices=PO_STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL, null=True,
        related_name='created_purchase_orders',
        verbose_name=_("Created By")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipping_address = models.TextField(_("Shipping Address"), blank=True)
    notes = models.TextField(_("Notes"), blank=True)

    class Meta:
        verbose_name = _("Purchase Order")
        verbose_name_plural = _("Purchase Orders")
        ordering = ['-order_date', '-po_number']

    def __str__(self):
        return f"PO {self.po_number} to {self.vendor.name}"

    def calculate_total_amount(self):
        # This method should ideally be called via a signal or in the save method
        # when OrderItems are saved or deleted.
        # Directly calling self.save() here can lead to recursion if called from save().
        # For now, it calculates and returns the total. The actual update to self.total_amount
        # should be managed carefully (e.g., in the save() method or by a task).
        total = sum(item.total_price for item in self.order_items.all() if item.total_price is not None)
        # self.total_amount = total # Avoid direct assignment if save() is not handled carefully
        return total

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = PurchaseOrderSequence.get_next_sequence_value(prefix="PO")
        # Ensure total_amount is recalculated if order items might have changed outside of direct PO save.
        # However, this is usually handled by OrderItem signals or PurchaseOrderSerializer.
        # If called from serializer after items are handled, it's fine.
        # If this save is triggered before items are finalized, total_amount might be stale.
        # For now, let's assume total_amount is managed correctly by serializer or explicit calls.
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='order_items',
        verbose_name=_("Purchase Order")
    )
    item_description = models.CharField(_("Item Description"), max_length=255)
    quantity = models.PositiveIntegerField(_("Quantity"))
    unit_price = models.DecimalField(_("Unit Price"), max_digits=10, decimal_places=2, null=True, blank=True)
    # asset = models.ForeignKey('assets.Asset', on_delete=models.SET_NULL, null=True, blank=True, related_name='order_line_item')

    class Meta:
        verbose_name = _("Order Item")
        verbose_name_plural = _("Order Items")

    def __str__(self):
        return f"{self.quantity} x {self.item_description} for PO {self.purchase_order.po_number}"

    @property
    def total_price(self):
        if self.unit_price is not None:
            return self.quantity * self.unit_price
        return 0


class CheckRequest(models.Model):
    CHECK_REQUEST_STATUS_CHOICES = [
        ('pending_submission', _('Pending Submission')),
        ('pending_approval', _('Pending Accounts Approval')),
        ('approved', _('Approved for Payment')),
        ('rejected', _('Rejected')),
        ('payment_processing', _('Payment Processing')),
        ('paid', _('Paid')),
        ('cancelled', _('Cancelled')),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('check', _('Check')),
        ('ach', _('ACH Transfer')),
        ('wire', _('Wire Transfer')),
        ('cash', _('Cash')),
        ('credit_card', _('Credit Card')),
        ('other', _('Other')),
    ]

    cr_id = models.CharField(
        _("CR ID"),
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
        help_text=_("Unique Check Request ID (e.g., CR-AA-0001)")
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name='check_requests',
        verbose_name=_("Purchase Order"),
        null=True, blank=True
    )
    invoice_number = models.CharField(_("Invoice Number"), max_length=100, null=True, blank=True)
    invoice_date = models.DateField(_("Invoice Date"), null=True, blank=True)
    amount = models.DecimalField(_("Amount"), max_digits=12, decimal_places=2)
    payee_name = models.CharField(_("Payee Name"), max_length=255, help_text="Typically the Vendor name, but can be overridden.")
    payee_address = models.TextField(_("Payee Address"), blank=True)
    reason_for_payment = models.TextField(_("Reason for Payment / Description"))
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL, null=True,
        related_name='created_check_requests',
        verbose_name=_("Requested By")
    )
    request_date = models.DateTimeField(_("Request Date"), auto_now_add=True)
    status = models.CharField(
        _("Status"),
        max_length=30,
        choices=CHECK_REQUEST_STATUS_CHOICES,
        default='pending_submission'
    )

    approved_by_accounts = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='approved_check_requests',
        null=True, blank=True,
        verbose_name=_("Approved by Accounts")
    )
    accounts_approval_date = models.DateTimeField(_("Accounts Approval Date"), null=True, blank=True)
    accounts_comments = models.TextField(_("Accounts Comments"), blank=True)

    payment_method = models.CharField(_("Payment Method"), max_length=20, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    payment_date = models.DateField(_("Payment Date"), null=True, blank=True)
    transaction_id = models.CharField(_("Transaction ID / Check Number"), max_length=100, null=True, blank=True)
    payment_notes = models.TextField(_("Payment Notes"), blank=True)

    class Meta:
        verbose_name = _("Check Request")
        verbose_name_plural = _("Check Requests")
        ordering = ['-request_date']

    def __str__(self):
        po_ref = f"(PO: {self.purchase_order.po_number})" if self.purchase_order else "(No PO)"
        return f"{self.cr_id} - {self.amount} to {self.payee_name} {po_ref}"

    def save(self, *args, **kwargs):
        if not self.cr_id:
            self.cr_id = CheckRequestSequence.get_next_sequence_value(prefix="CR")
        super().save(*args, **kwargs)


# --- Sequence Models for Unique ID Generation ---

class AbstractProcurementSequence(models.Model):
    """
    Abstract base model for procurement ID sequences.
    There should only ever be one instance of each concrete sequence model (pk=1).
    """
    current_alpha_part_char1 = models.CharField(
        max_length=1,
        default="A",
        help_text="First character of the alphanumeric part (e.g., 'A' for XX-AA-0001)",
    )
    current_alpha_part_char2 = models.CharField(
        max_length=1,
        default="A",
        help_text="Second character of the alphanumeric part (e.g., 'A' for XX-AA-0001)",
    )
    current_numeric_part = models.IntegerField(
        default=0, help_text="Current numeric value (0-9999)"
    )

    class Meta:
        abstract = True

    @classmethod
    def get_next_sequence_value(cls, prefix: str):
        """
        Atomically increments and retrieves the next sequence value.
        Handles both numeric and alphanumeric parts.
        """
        from django.db import transaction
        with transaction.atomic():
            seq_instance, created = cls.objects.select_for_update().get_or_create(pk=1)

            current_numeric = seq_instance.current_numeric_part
            current_char1_val = ord(seq_instance.current_alpha_part_char1) - ord("A")
            current_char2_val = ord(seq_instance.current_alpha_part_char2) - ord("A")

            next_numeric = current_numeric + 1
            next_char1_val = current_char1_val
            next_char2_val = current_char2_val

            if next_numeric > 9999:
                next_numeric = 1
                next_char2_val += 1
                if next_char2_val >= 26:
                    next_char2_val = 0
                    next_char1_val += 1
                    if next_char1_val >= 26:
                        raise ValueError(
                            f"{prefix} ID sequence exhausted (ZZ-9999 reached). Please implement a larger sequence or reset."
                        )

            seq_instance.current_numeric_part = next_numeric
            seq_instance.current_alpha_part_char1 = chr(ord("A") + next_char1_val)
            seq_instance.current_alpha_part_char2 = chr(ord("A") + next_char2_val)
            seq_instance.save()

            alpha_part = f"{seq_instance.current_alpha_part_char1}{seq_instance.current_alpha_part_char2}"
            numeric_part = f"{seq_instance.current_numeric_part:04d}"
            return f"{prefix}-{alpha_part}-{numeric_part}"


class PurchaseRequestMemoSequence(AbstractProcurementSequence):
    class Meta:
        verbose_name = _("Purchase Request Memo ID Sequence")
        verbose_name_plural = _("Purchase Request Memo ID Sequences")

    def __str__(self):
        return f"Current IOM ID: IM-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{self.current_numeric_part:04d}"


class PurchaseOrderSequence(AbstractProcurementSequence):
    class Meta:
        verbose_name = _("Purchase Order ID Sequence")
        verbose_name_plural = _("Purchase Order ID Sequences")

    def __str__(self):
        return f"Current PO ID: PO-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{self.current_numeric_part:04d}"


class CheckRequestSequence(AbstractProcurementSequence):
    class Meta:
        verbose_name = _("Check Request ID Sequence")
        verbose_name_plural = _("Check Request ID Sequences")

    def __str__(self):
        return f"Current CR ID: CR-{self.current_alpha_part_char1}{self.current_alpha_part_char2}-{self.current_numeric_part:04d}"
