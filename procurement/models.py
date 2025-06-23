from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from assets.models import Vendor # Assuming Vendor model is in assets app
# Import the new common models
from .common_models import Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment
from .sequence_models import ProcurementIDSequence # Import the new sequence model

User = get_user_model()


class PurchaseRequestMemo(models.Model):
    PRIORITY_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
    ]
    STATUS_CHOICES = [
        ('draft', _('Draft')), # New initial state
        ('pending_approval', _('Pending Approval')),
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
        is_new = self._state.adding
        old_status = None
        if not is_new:
            try:
                old_status = PurchaseRequestMemo.objects.get(pk=self.pk).status
            except PurchaseRequestMemo.DoesNotExist:
                pass # Should not happen if self.pk exists

        if not self.iom_id:
            self.iom_id = ProcurementIDSequence.get_next_id("IM")

        # Set default status to 'draft' if new and no status is provided
        if is_new and not self.status:
            self.status = 'draft'

        super().save(*args, **kwargs) # Save first to get an ID for new instances

        # Trigger approval workflow if:
        # 1. It's a new instance and status is 'draft' (or becomes 'pending_approval' directly).
        # 2. Or if relevant fields changed and it's in a state that allows re-triggering (e.g. 'draft', 'rejected').
        # For now, let's trigger if it's new and 'draft', or if status changes to 'draft'.
        # More sophisticated logic for re-triggering on updates can be added.
        if self.status == 'draft' and (is_new or (old_status and old_status != 'draft')):
             self.trigger_approval_workflow()
        elif is_new and self.status == 'pending_approval': # If status set directly to pending_approval
            self.trigger_approval_workflow()


    def trigger_approval_workflow(self, force_retrigger=False):
        """
        Determines and creates necessary ApprovalStep instances based on ApprovalRules.
        Determines and creates necessary ApprovalStep instances based on ApprovalRules
        for a PurchaseRequestMemo (IOM).

        This method is typically called when an IOM is saved in a 'draft' state
        or when its approval process needs to be explicitly re-triggered.

        Behavior:
        - If `force_retrigger` is False (default), the workflow is only triggered if the IOM's
          current status is 'draft'. This prevents accidental re-triggering for IOMs already
          in an approval process or completed.
        - Any existing 'pending' or 'delegated' approval steps for this IOM are deleted
          before new ones are generated. This ensures a clean start for the workflow.
          Completed steps ('approved', 'rejected', 'skipped') are preserved for history.
        - It iterates through all active `ApprovalRule`s, ordered by their `order` field.
        - For each rule, it checks if the IOM's properties (estimated cost, department, project)
          match the rule's conditions.
        - If a rule matches, a new `ApprovalStep` is created and linked to the IOM and the rule.
        - If at least one `ApprovalStep` is created and the IOM was in 'draft' status,
          the IOM's status is updated to 'pending_approval'.
        - If no rules match and the IOM was 'draft', it remains 'draft'.

        Args:
            force_retrigger (bool): If True, the workflow will be triggered regardless of the
                                    IOM's current status. Use with caution.
        """
        # Only proceed if status is 'draft' or if forced
        if self.status != 'draft' and not force_retrigger:
            # Or if status is 'rejected' and we want to allow re-submission with workflow
            # For now, simple condition: only from 'draft' or if forced.
            return

        # Delete existing 'pending' or 'delegated' approval steps before regenerating
        # Approved/rejected steps should remain for history.
        self.approval_steps.filter(status__in=['pending', 'delegated']).delete()

        applicable_rules = ApprovalRule.objects.filter(is_active=True).order_by('order')
        created_steps_count = 0

        for rule in applicable_rules:
            # Check amount condition
            if rule.min_amount is not None and self.estimated_cost < rule.min_amount:
                continue
            if rule.max_amount is not None and self.estimated_cost > rule.max_amount:
                continue

            # Check department condition
            if not rule.applies_to_all_departments:
                if not self.department or not rule.departments.filter(pk=self.department.pk).exists():
                    continue

            # Check project condition
            if not rule.applies_to_all_projects:
                if not self.project or not rule.projects.filter(pk=self.project.pk).exists():
                    continue

            # If all conditions met, create an ApprovalStep
            ApprovalStep.objects.create(
                purchase_request_memo=self,
                approval_rule=rule,
                step_order=rule.order,
                assigned_approver_user=rule.approver_user,
                assigned_approver_group=rule.approver_group,
                status='pending'
                # rule_name_snapshot is handled by ApprovalStep's save method
            )
            created_steps_count += 1

        if created_steps_count > 0:
            if self.status == 'draft': # Only change status if it was draft
                self.status = 'pending_approval'
                self.save(update_fields=['status']) # Save again to update status
                # print(f"IOM {self.iom_id} status changed to 'pending_approval'. {created_steps_count} steps created.")
        else:
            # No rules applied. What should happen?
            # Option 1: Stays 'draft' for manual processing or PO creation.
            # Option 2: Automatically becomes 'approved' (if no approvals needed by default).
            # For now, let's assume it stays 'draft' or the user has to explicitly submit it.
            # If it was 'draft' and no steps, it remains 'draft'.
            # print(f"IOM {self.iom_id} - no approval rules applied. Status remains '{self.status}'.")
            pass


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
            self.po_number = ProcurementIDSequence.get_next_id("PO")
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
            self.cr_id = ProcurementIDSequence.get_next_id("CR")
        super().save(*args, **kwargs)


# New Models for Advanced Workflow & Approval Automation

class ApprovalRule(models.Model):
    """
    Defines a rule for an approval workflow.

    Each rule specifies conditions (e.g., IOM amount, department, project)
    and an approver (a specific user or a group). Rules are ordered to create
    sequential approval chains.
    """
    name = models.CharField(_("Rule Name"), max_length=255, help_text="Descriptive name for the rule, e.g., 'Dept Head Approval for > $1000'.")
    order = models.PositiveIntegerField(
        _("Order/Sequence"),
        default=10,
        help_text="The order in which this rule/step should be evaluated or applied. Lower numbers come first."
    )
    min_amount = models.DecimalField(
        _("Minimum Amount"),
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text="Minimum IOM estimated cost for this rule to apply. Leave blank if no minimum."
    )
    max_amount = models.DecimalField(
        _("Maximum Amount"),
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text="Maximum IOM estimated cost for this rule to apply. Leave blank if no maximum."
    )
    applies_to_all_departments = models.BooleanField(_("Applies to All Departments"), default=True)
    departments = models.ManyToManyField(
        Department,
        blank=True,
        verbose_name=_("Specific Departments"),
        help_text="If 'Applies to All Departments' is unchecked, select applicable departments."
    )
    applies_to_all_projects = models.BooleanField(_("Applies to All Projects"), default=True)
    projects = models.ManyToManyField(
        Project,
        blank=True,
        verbose_name=_("Specific Projects"),
        help_text="If 'Applies to All Projects' is unchecked, select applicable projects."
    )
    approver_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approval_rules_user',
        verbose_name=_("Specific Approver User")
    )
    approver_group = models.ForeignKey(
        'auth.Group',  # Use string to avoid circular import if Group model is not yet loaded
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
        return f"{self.name} (Order: {self.order})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.approver_user and self.approver_group:
            raise ValidationError(_("An approval rule cannot have both a specific approver user and an approver group. Please choose one."))
        if not self.approver_user and not self.approver_group:
            raise ValidationError(_("An approval rule must specify either an approver user or an approver group."))


class ApprovalStep(models.Model):
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('skipped', _('Skipped')),
        ('delegated', _('Delegated')), # Future use: Step has been delegated to another user.
    ]
    purchase_request_memo = models.ForeignKey(
        PurchaseRequestMemo,
        on_delete=models.CASCADE,
        related_name='approval_steps',
        verbose_name=_("Purchase Request Memo (IOM)")
    )
    approval_rule = models.ForeignKey(
        ApprovalRule,
        on_delete=models.SET_NULL, # Keep the step even if rule is deleted, for history
        null=True, blank=True, # Blank=True allows setting it to None if rule is deleted
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
    approved_by = models.ForeignKey(
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
        ordering = ['purchase_request_memo', 'step_order', 'created_at']
        # Unique constraint to prevent duplicate steps for the same IOM and order/rule if re-triggering logic is not careful
        # unique_together = ('purchase_request_memo', 'approval_rule', 'step_order') # Reconsider if rule can be null

    def __str__(self):
        return f"Step for IOM {self.purchase_request_memo.iom_id if self.purchase_request_memo else 'N/A'} - Order {self.step_order} - Status: {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if self.approval_rule and not self.rule_name_snapshot:
            # Store the original rule name in case the rule itself is modified or deleted later.
            self.rule_name_snapshot = self.approval_rule.name
        super().save(*args, **kwargs)


class ApprovalDelegation(models.Model):
    """
    Allows a user (delegator) to delegate their approval responsibilities
    to another user (delegatee) for a specified period.

    Note: The logic to automatically apply these delegations (e.g., by re-assigning
    ApprovalSteps) is not yet implemented in the workflow. This model serves as a
    foundation for that future enhancement. The `get_active_delegate` static method
    can be used as a helper for such logic.
    """
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
        """
        Checks if a given user has an active delegation for the given date (or now if None).
        Returns the delegatee user if an active delegation exists, otherwise None.
        """
        if date_check is None:
            date_check = timezone.now()

        delegation = ApprovalDelegation.objects.filter(
            delegator=user,
            start_date__lte=date_check,
            end_date__gte=date_check,
            is_active=True
        ).order_by('-start_date').first() # Get the most recent active delegation

        return delegation.delegatee if delegation else None
