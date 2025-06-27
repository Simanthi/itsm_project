from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q

# Attempt to import ProcurementIDSequence.
try:
    from procurement.sequence_models import ProcurementIDSequence
except ImportError:
    ProcurementIDSequence = None

# Import ApprovalRule and ApprovalStep from procurement.models
# This creates a dependency. Ensure procurement app is correctly set up.
try:
    from procurement.models import ApprovalRule, ApprovalStep
except ImportError as e:
    # This is a critical dependency for the advanced workflow.
    # If it fails, the advanced workflow part cannot function.
    # We'll raise a more specific error or warning at runtime if used.
    print(f"Could not import ApprovalRule/ApprovalStep from procurement.models: {e}. Advanced workflow for GenericIOM will not function.")
    ApprovalRule = None
    ApprovalStep = None


User = get_user_model()

class IOMCategory(models.Model):
    name = models.CharField(_("Category Name"), max_length=100, unique=True)
    description = models.TextField(_("Description"), blank=True, null=True)

    class Meta:
        verbose_name = _("IOM Category")
        verbose_name_plural = _("IOM Categories")
        ordering = ['name']

    def __str__(self):
        return self.name

class IOMTemplate(models.Model):
    name = models.CharField(
        _("Template Name"),
        max_length=150,
        unique=True,
        help_text=_("e.g., Scheduled System Maintenance, Policy Update, New Software Request")
    )
    description = models.TextField(
        _("Description"),
        blank=True,
        null=True,
        help_text=_("Brief explanation of what this template is for.")
    )
    category = models.ForeignKey(
        IOMCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='templates',
        verbose_name=_("Category")
    )
    fields_definition = models.JSONField(
        _("Fields Definition"),
        help_text=_("JSON schema defining the form fields for this IOM type."),
        default=list
    )

    APPROVAL_TYPE_CHOICES = [
        ('none', _('No Approval Required')),
        ('simple', _('Simple Single Approver')),
        ('advanced', _('Advanced Workflow (via Approval Rules)')),
    ]
    approval_type = models.CharField(
        _("Approval Type"),
        max_length=20,
        choices=APPROVAL_TYPE_CHOICES,
        default='none'
    )
    simple_approval_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='iom_template_simple_approvals_user',
        verbose_name=_("Simple Approver User (if type is 'simple')")
    )
    simple_approval_group = models.ForeignKey(
        'auth.Group',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='iom_template_simple_approvals_group',
        verbose_name=_("Simple Approver Group (if type is 'simple')")
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_iom_templates',
        verbose_name=_("Created By")
    )
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)
    is_active = models.BooleanField(
        _("Is Active"),
        default=True,
        help_text=_("Only active templates can be used to create new IOMs.")
    )

    class Meta:
        verbose_name = _("IOM Template")
        verbose_name_plural = _("IOM Templates")
        ordering = ['category', 'name']

    def __str__(self):
        return self.name

class GenericIOM(models.Model):
    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('pending_approval', _('Pending Approval')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('published', _('Published')),
        ('archived', _('Archived')),
        ('cancelled', _('Cancelled')),
    ]

    iom_template = models.ForeignKey(
        IOMTemplate,
        on_delete=models.PROTECT,
        related_name='instances',
        verbose_name=_("IOM Template")
    )
    gim_id = models.CharField(
        _("GIM ID"),
        max_length=20,
        unique=True,
        editable=False,
        blank=True,
        null=True,
        help_text=_("System-generated ID, e.g., GIM-AA-0001.")
    )
    subject = models.CharField(_("Subject/Title"), max_length=255)
    data_payload = models.JSONField(
        _("Data Payload"),
        help_text=_("Stores the actual data entered by the user, matching the template's fields_definition."),
        default=dict
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_generic_ioms',
        verbose_name=_("Created By")
    )
    to_users = models.ManyToManyField(
        User,
        related_name='received_generic_ioms',
        blank=True,
        verbose_name=_("To Users")
    )
    to_groups = models.ManyToManyField(
        'auth.Group',
        related_name='received_generic_ioms_group',
        blank=True,
        verbose_name=_("To Groups")
    )
    parent_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_("Parent Record Type")
    )
    parent_object_id = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name=_("Parent Record ID")
    )
    parent_record = GenericForeignKey('parent_content_type', 'parent_object_id')

    simple_approver_action_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='actioned_simple_generic_ioms',
        verbose_name=_("Actioned By (Simple Approval)")
    )
    simple_approval_action_at = models.DateTimeField(
        _("Action At (Simple Approval)"),
        null=True, blank=True
    )
    simple_approval_comments = models.TextField(
        _("Comments (Simple Approval)"),
        blank=True
    )

    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)
    published_at = models.DateTimeField(_("Published At"), null=True, blank=True)

    class Meta:
        verbose_name = _("Generic IOM")
        verbose_name_plural = _("Generic IOMs")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.gim_id or '(Unsaved GIM)'}: {self.subject}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_status = None
        if not is_new and self.pk:
            try:
                old_status_instance = GenericIOM.objects.get(pk=self.pk)
                old_status = old_status_instance.status
            except GenericIOM.DoesNotExist:
                pass

        if not self.gim_id: # Ensure ID is generated only if not already set
            if ProcurementIDSequence:
                try:
                    self.gim_id = ProcurementIDSequence.get_next_id("GIM")
                except Exception as e:
                    print(f"Error generating GIM ID via ProcurementIDSequence: {e}. Using fallback.")
                    self.gim_id = f"GIM-FALLBACK-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
            else:
                 print("ProcurementIDSequence not available. Using fallback GIM ID (NOT FOR PRODUCTION).")
                 self.gim_id = f"GIM-FALLBACK-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"

        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()

        # Use transaction.atomic to ensure that if workflow triggering fails,
        # the main save operation can also be rolled back if desired,
        # though workflow trigger is often a post-save signal or action.
        # For now, simple save then trigger.
        super().save(*args, **kwargs)

        # Post-save logic for workflow triggering
        if self.status == 'draft' and (is_new or (old_status and old_status != 'draft')):
            if self.iom_template.approval_type == 'advanced':
                self.trigger_advanced_approval_workflow()
        elif is_new and self.status == 'pending_approval' and self.iom_template.approval_type == 'advanced':
             self.trigger_advanced_approval_workflow(force_retrigger=True) # Force if created directly as pending

    def trigger_advanced_approval_workflow(self, force_retrigger=False):
        if not ApprovalRule or not ApprovalStep:
            print(f"GIM {self.gim_id}: ApprovalRule or ApprovalStep not imported. Advanced workflow cannot proceed.")
            return

        if self.iom_template.approval_type != 'advanced':
            # print(f"GIM {self.gim_id}: Adv. approval not applicable for template type '{self.iom_template.approval_type}'.")
            return

        if self.status != 'draft' and not force_retrigger:
            # print(f"GIM {self.gim_id}: Adv. approval not triggered. Status is '{self.status}' (needs 'draft' or force_retrigger).")
            return

        # print(f"GIM {self.gim_id}: Triggering advanced approval workflow.")

        current_content_type = ContentType.objects.get_for_model(self)

        # Delete existing 'pending' or 'delegated' approval steps for this GIM
        ApprovalStep.objects.filter(
            content_type=current_content_type,
            object_id=self.pk,
            status__in=['pending', 'delegated']
        ).delete()

        # Query applicable ApprovalRules
        # Q object for template OR category matching.
        # If category is null on template, it won't match by category.
        template_q = Q(applicable_iom_templates=self.iom_template)
        category_q = Q() # Empty Q object
        if self.iom_template.category:
            category_q = Q(applicable_iom_categories=self.iom_template.category)

        applicable_rules = ApprovalRule.objects.filter(
            Q(rule_type='generic_iom'),
            (template_q | category_q), # Rule must apply to this template OR this template's category
            Q(is_active=True)
        ).distinct().order_by('order')
        # distinct() is important if a rule matches both template and category.

        created_steps_count = 0
        for rule in applicable_rules:
            # Placeholder for data_payload based conditions on 'rule'
            # if rule.json_path_condition and rule.expected_value_condition:
            #     try:
            #         # Simplified extraction - assumes data_payload is a dict and path is dot-separated
            #         actual_value = self.data_payload
            #         for key_part in rule.json_path_condition.split('.'):
            #             actual_value = actual_value.get(key_part)
            #             if actual_value is None: break
            #         # TODO: Type conversion for comparison might be needed based on rule.expected_value_condition
            #         if str(actual_value) != str(rule.expected_value_condition):
            #             continue
            #     except: # Broad except for issues accessing path
            #         continue # Skip rule if path is invalid or value not found

            ApprovalStep.objects.create(
                content_object=self,
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
                # Need to call super().save() to avoid recursion within the save method itself.
                # This is tricky. A common pattern is to use signals for this (post_save).
                # For now, let's update and save, but be mindful of recursion.
                # A flag could prevent re-triggering if save is called again for status update.
                # Simplest: just update status and save. The initial check in save() for old_status should prevent re-trigger.
                super().save(update_fields=['status'])
                # print(f"GIM {self.gim_id} status changed to 'pending_approval'. {created_steps_count} steps created.")
        # else:
            # print(f"GIM {self.gim_id} - no 'advanced' approval rules applied. Status remains '{self.status}'.")
            # pass
