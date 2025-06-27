from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from assets.models import Vendor # Assuming Vendor model is in assets app
from .common_models import Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment
from .sequence_models import ProcurementIDSequence

# For GFK support in ApprovalStep and M2M in ApprovalRule
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
# Need to import from generic_iom app. This creates a dependency.
# Ensure 'generic_iom' is listed before 'procurement' in INSTALLED_APPS if generic_iom.models
# are needed at the time procurement.models are loaded (e.g. for direct FK, not string ref).
# For M2M, string references are fine.
# from generic_iom.models import IOMTemplate, IOMCategory # Using string reference for M2M to avoid import order issues

User = get_user_model()


class PurchaseRequestMemo(models.Model):
    PRIORITY_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
    ]
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('pending_approval', _('Pending Approval')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('po_created', _('PO Created')),
        ('cancelled', _('Cancelled')),
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
        on_delete=models.CASCADE,
        related_name='purchase_requests',
        verbose_name=_("Requested By")
    )
    request_date = models.DateTimeField(_("Request Date"), auto_now_add=True)
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='approved_purchase_requests',
        null=True,
        blank=True,
        verbose_name=_("Approver (Final Decider)") # Clarified role
    )
    decision_date = models.DateTimeField(_("Decision Date"), null=True, blank=True)
    approver_comments = models.TextField(_("Approver Comments"), blank=True)

    iom_id = models.CharField(_("IOM ID"), max_length=20, unique=True, editable=False, blank=True, null=True, help_text="System-generated ID, e.g., IM-AA-0001.")
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

    # Generic relation to ApprovalSteps
    # approval_steps_gfk = GenericRelation('procurement.ApprovalStep', content_type_field='content_type', object_id_field='object_id')
    # No, the GFK is on ApprovalStep. We access it via related_name from ApprovalStep if needed, or filter ApprovalStep by content_type and object_id.

    class Meta:
        verbose_name = _("Purchase Request Memo (IOM)")
        verbose_name_plural = _("Purchase Request Memos (IOMs)")
        ordering = ['-request_date']

    def __str__(self):
        return f"IOM {self.iom_id if self.iom_id else '(Unsaved)'}: {self.item_description[:50]} by {self.requested_by.username}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_status = None
        if not is_new and self.pk:
            try:
                old_status_instance = PurchaseRequestMemo.objects.get(pk=self.pk)
                old_status = old_status_instance.status
            except PurchaseRequestMemo.DoesNotExist:
                pass

        if not self.iom_id:
            self.iom_id = ProcurementIDSequence.get_next_id("IM")

        if is_new and not self.status:
            self.status = 'draft'

        super().save(*args, **kwargs)

        if self.status == 'draft' and (is_new or (old_status and old_status != 'draft')):
             self.trigger_approval_workflow()
        elif is_new and self.status == 'pending_approval':
            self.trigger_approval_workflow()

    def trigger_approval_workflow(self, force_retrigger=False):
        if self.status != 'draft' and not force_retrigger:
            return

        # Delete existing 'pending' or 'delegated' approval steps for this PRM
        prm_content_type = ContentType.objects.get_for_model(self)
        ApprovalStep.objects.filter(content_type=prm_content_type, object_id=self.pk, status__in=['pending', 'delegated']).delete()

        # Filter for rules specific to PurchaseRequestMemo
        applicable_rules = ApprovalRule.objects.filter(
            rule_type='procurement_memo', # Ensure rule is for PRMs
            is_active=True
        ).order_by('order')

        created_steps_count = 0
        for rule in applicable_rules:
            # Conditions specific to PurchaseRequestMemo
            if rule.min_amount is not None and (self.estimated_cost is None or self.estimated_cost < rule.min_amount):
                continue
            if rule.max_amount is not None and (self.estimated_cost is None or self.estimated_cost > rule.max_amount):
                continue
            if not rule.applies_to_all_departments:
                if not self.department or not rule.departments.filter(pk=self.department.pk).exists():
                    continue
            if not rule.applies_to_all_projects:
                if not self.project or not rule.projects.filter(pk=self.project.pk).exists():
                    continue

            ApprovalStep.objects.create(
                content_object=self, # Use GFK
                approval_rule=rule,
                step_order=rule.order,
                assigned_approver_user=rule.approver_user,
                assigned_approver_group=rule.approver_group,
                status='pending'
            )
            created_steps_count += 1

        if created_steps_count > 0:
            if self.status == 'draft':
                self.status = 'pending_approval'
                self.save(update_fields=['status'])


class PurchaseOrder(models.Model):
    # ... (No changes to PurchaseOrder model itself) ...
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

    po_number = models.CharField(_("PO Number"), max_length=50, unique=True, editable=False, blank=True, help_text="System-generated PO number, e.g., PO-AA-0001")
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
        return f"PO {self.po_number or '(Unsaved PO)'} to {self.vendor.name}"

    def calculate_total_amount(self):
        total = sum(item.total_price for item in self.order_items.all() if item.total_price is not None)
        return total

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = ProcurementIDSequence.get_next_id("PO")
        super().save(*args, **kwargs)

class OrderItem(models.Model):
    # ... (No changes to OrderItem model itself) ...
    LINE_ITEM_STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('partially_received', _('Partially Received')),
        ('fully_received', _('Fully Received')),
        ('cancelled', _('Cancelled')),
        ('invoiced', _('Invoiced')),
    ]
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='order_items',
        verbose_name=_("Purchase Order")
    )
    item_description = models.CharField(_("Item Description"), max_length=255)
    quantity = models.PositiveIntegerField(_("Quantity"))
    unit_price = models.DecimalField(_("Unit Price"), max_digits=10, decimal_places=2, null=True, blank=True)
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
        null=True, blank=True
    )
    discount_value = models.DecimalField(
        _("Discount Value"),
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Value of the discount, either fixed amount or percentage (e.g., 10 for 10%)"
    )
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
    def total_price(self):
        price = self.total_price_before_tax_discount
        if self.discount_value is not None and self.discount_type:
            if self.discount_type == 'fixed':
                price -= self.discount_value
            elif self.discount_type == 'percentage':
                price -= (price * self.discount_value / 100)
        if self.tax_rate is not None:
            price += (price * self.tax_rate / 100)
        return max(price, 0)

class CheckRequest(models.Model):
    # ... (No changes to CheckRequest model itself) ...
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
    cr_id = models.CharField(_("CR ID"), max_length=20, unique=True, editable=False, blank=True, null=True, help_text="System-generated ID, e.g., CR-AA-0001.")
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

    def save(self, *args, **kwargs):
        if not self.cr_id:
            self.cr_id = ProcurementIDSequence.get_next_id("CR")
        super().save(*args, **kwargs)

class ApprovalRule(models.Model):
    name = models.CharField(_("Rule Name"), max_length=255, help_text="Descriptive name for the rule, e.g., 'Dept Head Approval for > $1000'.")
    order = models.PositiveIntegerField(
        _("Order/Sequence"),
        default=10,
        help_text="The order in which this rule/step should be evaluated or applied. Lower numbers come first."
    )

    RULE_TYPE_CHOICES = [
        ('procurement_memo', _('Procurement Memo (Purchase Request IOM)')),
        ('generic_iom', _('Generic IOM')),
    ]
    rule_type = models.CharField(
        _("Rule Type"),
        max_length=20,
        choices=RULE_TYPE_CHOICES,
        default='procurement_memo',
        help_text=_("Specify if this rule applies to Procurement Memos or Generic IOMs.")
    )

    # Fields for 'procurement_memo' type
    min_amount = models.DecimalField(
        _("Minimum Amount (for Procurement Memo)"),
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text="Minimum IOM estimated cost for this rule to apply. Relevant if type is 'Procurement Memo'."
    )
    max_amount = models.DecimalField(
        _("Maximum Amount (for Procurement Memo)"),
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text="Maximum IOM estimated cost for this rule to apply. Relevant if type is 'Procurement Memo'."
    )
    applies_to_all_departments = models.BooleanField(_("Applies to All Departments (for Procurement Memo)"), default=True)
    departments = models.ManyToManyField(
        Department,
        blank=True,
        verbose_name=_("Specific Departments (for Procurement Memo)"),
        help_text="If 'Applies to All Departments' is unchecked, select applicable departments. Relevant if type is 'Procurement Memo'."
    )
    applies_to_all_projects = models.BooleanField(_("Applies to All Projects (for Procurement Memo)"), default=True)
    projects = models.ManyToManyField(
        Project,
        blank=True,
        verbose_name=_("Specific Projects (for Procurement Memo)"),
        help_text="If 'Applies to All Projects' is unchecked, select applicable projects. Relevant if type is 'Procurement Memo'."
    )

    # Fields for 'generic_iom' type
    # Using string references for models in 'generic_iom' app to avoid direct import issues at model loading time.
    applicable_iom_templates = models.ManyToManyField(
        'generic_iom.IOMTemplate',
        blank=True,
        verbose_name=_("Applicable Specific IOM Templates (for Generic IOM)"),
        help_text="If Rule Type is 'Generic IOM', select specific templates this rule applies to. Leave blank if applying via category."
    )
    applicable_iom_categories = models.ManyToManyField(
        'generic_iom.IOMCategory',
        blank=True,
        verbose_name=_("Applicable IOM Categories (for Generic IOM)"),
        help_text="If Rule Type is 'Generic IOM', select categories this rule applies to."
    )
    # Future: json_path_condition, expected_value_condition for data_payload in GenericIOM

    approver_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approval_rules_user',
        verbose_name=_("Specific Approver User")
    )
    approver_group = models.ForeignKey(
        'auth.Group',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approval_rules_group',
        verbose_name=_("Approver Group")
    )
    approval_level_name = models.CharField(
        _("Approval Level Name"),
        max_length=100,
        blank=True, null=True,
        help_text="e.g., 'Department Head', 'Budget Holder', 'Director'. For display/logging."
    )
    is_active = models.BooleanField(_("Is Active"), default=True, help_text="Uncheck to disable this rule.")

    class Meta:
        verbose_name = _("Approval Rule")
        verbose_name_plural = _("Approval Rules")
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} (Order: {self.order}, Type: {self.get_rule_type_display()})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.approver_user and self.approver_group:
            raise ValidationError(_("An approval rule cannot have both a specific approver user and an approver group. Please choose one."))
        if not self.approver_user and not self.approver_group:
            raise ValidationError(_("An approval rule must specify either an approver user or an approver group."))
        # Add more validation, e.g. if rule_type is 'procurement_memo', then generic_iom fields should be blank, and vice-versa.

class ApprovalStep(models.Model):
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('skipped', _('Skipped')),
        ('delegated', _('Delegated')),
    ]

    # Replaces: purchase_request_memo = models.ForeignKey(PurchaseRequestMemo, ...)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name=_("Content Type of the item being approved (e.g., PurchaseRequestMemo or GenericIOM)")
    )
    object_id = models.PositiveIntegerField(
        verbose_name=_("Object ID of the item being approved")
    )
    content_object = GenericForeignKey('content_type', 'object_id')

    approval_rule = models.ForeignKey(
        ApprovalRule,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Originating Approval Rule")
    )
    rule_name_snapshot = models.CharField(_("Rule Name (Snapshot)"), max_length=255, blank=True, help_text="Snapshot of the rule name at time of step creation.")
    step_order = models.PositiveIntegerField(_("Step Order"))
    assigned_approver_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_approval_steps',
        verbose_name=_("Assigned Approver User")
    )
    assigned_approver_group = models.ForeignKey(
        'auth.Group',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_approval_steps_group',
        verbose_name=_("Assigned Approver Group")
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    approved_by = models.ForeignKey( # This field name might be confusing now, maybe 'actioned_by'?
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='actioned_approval_steps',
        verbose_name=_("Actioned By User")
    )
    decision_date = models.DateTimeField(_("Decision Date"), null=True, blank=True)
    comments = models.TextField(_("Comments"), blank=True)
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    class Meta:
        verbose_name = _("Approval Step")
        verbose_name_plural = _("Approval Steps")
        # Original ordering: ['purchase_request_memo', 'step_order', 'created_at']
        # Need to order by GFK components if possible, or just step_order and created_at within an object.
        # Django doesn't directly support ordering by GenericForeignKey.
        # We can order by content_type_id, object_id, then step_order.
        ordering = ['content_type', 'object_id', 'step_order', 'created_at']
        # unique_together might need reconsideration or a custom validation if we want to ensure
        # unique step per rule for a given content_object.
        # unique_together = ('content_type', 'object_id', 'approval_rule', 'step_order') # If rule can't be null

    def __str__(self):
        obj_display = "N/A"
        if self.content_object:
            if hasattr(self.content_object, 'iom_id') and self.content_object.iom_id:
                obj_display = f"PRM {self.content_object.iom_id}"
            elif hasattr(self.content_object, 'gim_id') and self.content_object.gim_id:
                obj_display = f"GIM {self.content_object.gim_id}"
            else:
                obj_display = f"{self.content_type.model.capitalize()} ID {self.object_id}"
        return f"Step for {obj_display} - Order {self.step_order} - Status: {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if self.approval_rule and not self.rule_name_snapshot:
            self.rule_name_snapshot = self.approval_rule.name
        super().save(*args, **kwargs)

class ApprovalDelegation(models.Model):
    # ... (No changes to ApprovalDelegation model itself) ...
    delegator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='delegations_made',
        verbose_name=_("Delegator User")
    )
    delegatee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='delegations_received',
        verbose_name=_("Delegatee User")
    )
    start_date = models.DateTimeField(_("Start Date"))
    end_date = models.DateTimeField(_("End Date"))
    reason = models.TextField(_("Reason for Delegation"), blank=True)
    is_active = models.BooleanField(
        _("Is Active?"),
        default=True,
        help_text="Delegation is only effective if active and within the date range."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Approval Delegation")
        verbose_name_plural = _("Approval Delegations")
        ordering = ['-start_date']

    def __str__(self):
        return f"Delegation from {self.delegator.username} to {self.delegatee.username} ({self.start_date} - {self.end_date})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.delegator == self.delegatee:
            raise ValidationError(_("Delegator and Delegatee cannot be the same user."))
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValidationError(_("End date must be after start date."))

    @staticmethod
    def get_active_delegate(user, date_check=None):
        if date_check is None:
            date_check = timezone.now()
        delegation = ApprovalDelegation.objects.filter(
            delegator=user,
            start_date__lte=date_check,
            end_date__gte=date_check,
            is_active=True
        ).order_by('-start_date').first()
        return delegation.delegatee if delegation else None
