from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from assets.models import Vendor # Assuming Vendor model is in assets app
# Import the new common models
from .common_models import Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment

User = get_user_model()


class PurchaseRequestMemo(models.Model):
    PRIORITY_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
    ]
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('po_created', _('PO Created')),
        ('cancelled', _('Cancelled')),
    ]

    # Existing fields
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
        on_delete=models.CASCADE,
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
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='approved_purchase_requests',
        null=True,
        blank=True,
        verbose_name=_("Approver")
    )
    decision_date = models.DateTimeField(_("Decision Date"), null=True, blank=True)
    approver_comments = models.TextField(_("Approver Comments"), blank=True)

    # New fields for PurchaseRequestMemo
    iom_id = models.CharField(_("IOM ID"), max_length=20, unique=True, editable=False, blank=True, null=True, help_text="System-generated ID, e.g., IM-YYMMDD-0001.")
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Department"),
        related_name='purchase_requests_memo'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Project"),
        related_name='purchase_requests_memo'
    )
    priority = models.CharField(
        _("Priority"),
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    required_delivery_date = models.DateField(_("Required Delivery Date"), null=True, blank=True)
    suggested_vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_purchase_requests',
        verbose_name=_("Suggested Vendor")
    )
    attachments = models.FileField(_("Attachments"), upload_to='procurement/iom_attachments/', null=True, blank=True)


    class Meta:
        verbose_name = _("Purchase Request Memo (IOM)")
        verbose_name_plural = _("Purchase Request Memos (IOMs)")
        ordering = ['-request_date']

    def __str__(self):
        return f"IOM {self.iom_id if self.iom_id else '(Unsaved)'}: {self.item_description[:50]} by {self.requested_by.username}"

    # Consider adding a pre_save signal or overriding save() to generate iom_id if it's system-generated.
    def save(self, *args, **kwargs):
        if not self.iom_id:
            # Generate IOM ID, e.g., IM-YYMMDD-XXXX
            today_str = timezone.now().strftime('%y%m%d')
            # This simple count is not robust for high concurrency. Consider UUID or database sequence.
            count = PurchaseRequestMemo.objects.filter(iom_id__startswith=f"IM-{today_str}").count() + 1
            self.iom_id = f"IM-{today_str}-{count:04d}"
        super().save(*args, **kwargs)

class PurchaseOrder(models.Model):
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
    PO_TYPE_CHOICES = [
        ('goods', _('Goods')),
        ('services', _('Services')),
        ('subscription', _('Subscription')),
        ('framework_agreement', _('Framework Agreement')),
    ]

    # Existing fields
    po_number = models.CharField(_("PO Number"), max_length=50, unique=True, editable=False, blank=True, help_text="System-generated PO number, e.g., PO-YYMMDD-0001")
    internal_office_memo = models.OneToOneField(
        PurchaseRequestMemo,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='purchase_order',
        verbose_name=_("Internal Office Memo")
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT, # Protect vendor from deletion if POs exist
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
    shipping_address = models.TextField(_("Shipping Address"), blank=True) # Consider making this more structured if needed
    notes = models.TextField(_("Notes"), blank=True)

    # New fields for PurchaseOrder
    payment_terms = models.CharField(_("Payment Terms"), max_length=100, blank=True, help_text="e.g., Net 30, Due on Receipt")
    shipping_method = models.CharField(_("Shipping Method"), max_length=100, blank=True)
    billing_address = models.TextField(_("Billing Address"), blank=True, null=True)
    po_type = models.CharField(
        _("PO Type"),
        max_length=30,
        choices=PO_TYPE_CHOICES,
        blank=True,
        null=True
    )
    related_contract = models.ForeignKey(
        Contract,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Related Contract"),
        related_name='purchase_orders'
    )
    attachments = models.FileField(_("Attachments"), upload_to='procurement/po_attachments/', null=True, blank=True)
    revision_number = models.PositiveIntegerField(_("Revision Number"), default=0)
    currency = models.CharField(_("Currency"), max_length=3, default='USD', help_text="e.g., USD, EUR, KES")


    class Meta:
        verbose_name = _("Purchase Order (PO)")
        verbose_name_plural = _("Purchase Orders (POs)")
        ordering = ['-order_date', '-po_number']

    def __str__(self):
        return f"PO {self.po_number} to {self.vendor.name}"

    def calculate_total_amount(self):
        total = sum(item.total_price for item in self.order_items.all() if item.total_price is not None)
        # self.total_amount = total # Best to update this in save() or via signal
        return total

    # Consider adding a pre_save signal or overriding save() to generate po_number if it's system-generated and not user-input.
    def save(self, *args, **kwargs):
        if not self.po_number:
            # Generate PO Number, e.g., PO-YYMMDD-XXXX
            today_str = timezone.now().strftime('%y%m%d')
            count = PurchaseOrder.objects.filter(po_number__startswith=f"PO-{today_str}").count() + 1
            self.po_number = f"PO-{today_str}-{count:04d}"
        # Ensure total_amount is calculated before saving, especially if items changed
        # This might be better handled via signals from OrderItem save/delete
        # or ensure order_items are saved before the PO if creating.
        # For now, let's assume calculate_total_amount is called where needed.
        # If items are managed via inline in admin, admin's save_related handles it.
        # If via serializer, serializer's create/update handles it.
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    LINE_ITEM_STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('partially_received', _('Partially Received')),
        ('fully_received', _('Fully Received')),
        ('cancelled', _('Cancelled')),
        ('invoiced', _('Invoiced')),
    ]

    # Existing fields
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='order_items',
        verbose_name=_("Purchase Order")
    )
    item_description = models.CharField(_("Item Description"), max_length=255)
    quantity = models.PositiveIntegerField(_("Quantity"))
    unit_price = models.DecimalField(_("Unit Price"), max_digits=10, decimal_places=2, null=True, blank=True)
    # asset = models.ForeignKey('assets.Asset', on_delete=models.SET_NULL, null=True, blank=True, related_name='order_line_item') # Keep if asset linking is desired

    # New fields for OrderItem
    product_code = models.CharField(_("Product Code/SKU"), max_length=100, blank=True, null=True)
    gl_account = models.ForeignKey(
        GLAccount,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("GL Account"),
        related_name='order_items'
    )
    received_quantity = models.PositiveIntegerField(_("Received Quantity"), default=0)
    line_item_status = models.CharField(
        _("Line Item Status"),
        max_length=20,
        choices=LINE_ITEM_STATUS_CHOICES,
        default='pending'
    )
    tax_rate = models.DecimalField(_("Tax Rate (%)"), max_digits=5, decimal_places=2, null=True, blank=True, help_text="e.g., 16 for 16%")

    DISCOUNT_TYPE_CHOICES = [
        ('fixed', _('Fixed Amount')),
        ('percentage', _('Percentage')),
    ]
    discount_type = models.CharField(
        _("Discount Type"),
        max_length=10,
        choices=DISCOUNT_TYPE_CHOICES,
        default='fixed',
        null=True, blank=True # Allow null if no discount
    )
    discount_value = models.DecimalField(
        _("Discount Value"),
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Value of the discount, either fixed amount or percentage (e.g., 10 for 10%)"
    )
    # Removed: discount_percentage_or_amount

    class Meta:
        verbose_name = _("Order Item")
        verbose_name_plural = _("Order Items")

    def __str__(self):
        return f"{self.quantity} x {self.item_description} for PO {self.purchase_order.po_number}"

    @property
    def total_price_before_tax_discount(self):
        if self.unit_price is not None:
            return self.quantity * self.unit_price
        return 0

    @property
    def total_price(self): # This could be total price after discount and tax
        price = self.total_price_before_tax_discount

        if self.discount_value is not None and self.discount_type:
            if self.discount_type == 'fixed':
                price -= self.discount_value
            elif self.discount_type == 'percentage':
                price -= (price * self.discount_value / 100)

        if self.tax_rate is not None:
            price += (price * self.tax_rate / 100)
        return max(price, 0) # Ensure price doesn't go below zero


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

    # Existing fields
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name='check_requests',
        verbose_name=_("Related Purchase Order"),
        null=True, blank=True
    )
    invoice_number = models.CharField(_("Invoice Number"), max_length=100, null=True, blank=True)
    invoice_date = models.DateField(_("Invoice Date"), null=True, blank=True)
    amount = models.DecimalField(_("Amount"), max_digits=12, decimal_places=2)
    payee_name = models.CharField(_("Payee Name"), max_length=255, help_text="Typically the Vendor name from PO, but can be overridden.")
    payee_address = models.TextField(_("Payee Address"), blank=True) # Could be pre-filled from Vendor
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

    # New fields for CheckRequest
    cr_id = models.CharField(_("CR ID"), max_length=20, unique=True, editable=False, blank=True, null=True, help_text="System-generated ID, e.g., CR-YYMMDD-0001.")
    expense_category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Expense Category"),
        related_name='check_requests'
    )
    is_urgent = models.BooleanField(_("Is Urgent?"), default=False)
    recurring_payment = models.ForeignKey(
        RecurringPayment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Recurring Payment"),
        related_name='check_requests'
    )
    attachments = models.FileField(_("Attachments"), upload_to='procurement/cr_attachments/', null=True, blank=True)
    currency = models.CharField(_("Currency"), max_length=3, default='USD', help_text="e.g., USD, EUR, KES")


    class Meta:
        verbose_name = _("Check Request (CR)")
        verbose_name_plural = _("Check Requests (CRs)")
        ordering = ['-request_date']

    def __str__(self):
        cr_id_str = self.cr_id if self.cr_id else '(Unsaved)'
        po_number_str = self.purchase_order.po_number if self.purchase_order else 'N/A'
        return f"CR {cr_id_str} for {self.amount} {self.currency} to {self.payee_name} (PO: {po_number_str})"

    # Consider adding a pre_save signal or overriding save() to generate cr_id if it's system-generated.
    def save(self, *args, **kwargs):
        if not self.cr_id:
            # Generate CR ID, e.g., CR-YYMMDD-XXXX
            today_str = timezone.now().strftime('%y%m%d')
            count = CheckRequest.objects.filter(cr_id__startswith=f"CR-{today_str}").count() + 1
            self.cr_id = f"CR-{today_str}-{count:04d}"
        super().save(*args, **kwargs)
