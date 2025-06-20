from django.db import models
from django.utils.translation import gettext_lazy as _

class Department(models.Model):
    name = models.CharField(_("Department Name"), max_length=100, unique=True)
    department_code = models.CharField(_("Department Code"), max_length=20, unique=True, blank=True, null=True)
    description = models.TextField(_("Description"), blank=True)

    class Meta:
        verbose_name = _("Department")
        verbose_name_plural = _("Departments")
        ordering = ['name']

    def __str__(self):
        return self.name

class Project(models.Model):
    name = models.CharField(_("Project Name"), max_length=150, unique=True)
    project_code = models.CharField(_("Project Code"), max_length=30, unique=True, blank=True, null=True)
    description = models.TextField(_("Description"), blank=True)
    start_date = models.DateField(_("Start Date"), null=True, blank=True)
    end_date = models.DateField(_("End Date"), null=True, blank=True)
    # budget = models.DecimalField(_("Budget"), max_digits=15, decimal_places=2, null=True, blank=True) # Future consideration

    class Meta:
        verbose_name = _("Project")
        verbose_name_plural = _("Projects")
        ordering = ['name']

    def __str__(self):
        return self.name

class Contract(models.Model):
    contract_id = models.CharField(_("Contract ID"), max_length=100, unique=True)
    title = models.CharField(_("Title"), max_length=200)
    vendor = models.ForeignKey('assets.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='contracts')
    start_date = models.DateField(_("Start Date"))
    end_date = models.DateField(_("End Date"), null=True, blank=True)
    renewal_reminder_date = models.DateField(_("Renewal Reminder Date"), null=True, blank=True)
    # contract_value = models.DecimalField(_("Contract Value"), max_digits=15, decimal_places=2, null=True, blank=True)
    terms_and_conditions = models.TextField(_("Terms & Conditions"), blank=True)
    attachments = models.FileField(_("Attachments"), upload_to='procurement/contract_attachments/', null=True, blank=True)

    class Meta:
        verbose_name = _("Contract")
        verbose_name_plural = _("Contracts")
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.contract_id} - {self.title}"

class GLAccount(models.Model):
    account_code = models.CharField(_("GL Account Code"), max_length=50, unique=True)
    name = models.CharField(_("Account Name"), max_length=150)
    description = models.TextField(_("Description"), blank=True)
    # account_type = models.CharField(_("Account Type"), max_length=50, blank=True) # e.g., Expense, Asset

    class Meta:
        verbose_name = _("GL Account")
        verbose_name_plural = _("GL Accounts")
        ordering = ['account_code']

    def __str__(self):
        return f"{self.account_code} - {self.name}"

class ExpenseCategory(models.Model):
    name = models.CharField(_("Category Name"), max_length=100, unique=True)
    description = models.TextField(_("Description"), blank=True)
    # parent_category = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_categories')

    class Meta:
        verbose_name = _("Expense Category")
        verbose_name_plural = _("Expense Categories")
        ordering = ['name']

    def __str__(self):
        return self.name

class RecurringPayment(models.Model):
    payment_name = models.CharField(_("Payment Name/Description"), max_length=150)
    vendor = models.ForeignKey('assets.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring_payments')
    amount = models.DecimalField(_("Amount"), max_digits=12, decimal_places=2)
    currency = models.CharField(_("Currency"), max_length=3, default='USD')
    frequency_choices = [
        ('daily', _('Daily')),
        ('weekly', _('Weekly')),
        ('monthly', _('Monthly')),
        ('quarterly', _('Quarterly')),
        ('annually', _('Annually')),
    ]
    frequency = models.CharField(_("Frequency"), max_length=20, choices=frequency_choices)
    next_due_date = models.DateField(_("Next Due Date"))
    start_date = models.DateField(_("Start Date"))
    end_date = models.DateField(_("End Date"), null=True, blank=True)
    gl_account = models.ForeignKey(GLAccount, on_delete=models.SET_NULL, null=True, blank=True)
    expense_category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(_("Is Active?"), default=True)
    notes = models.TextField(_("Notes"), blank=True)

    class Meta:
        verbose_name = _("Recurring Payment")
        verbose_name_plural = _("Recurring Payments")
        ordering = ['next_due_date']

    def __str__(self):
        return f"{self.payment_name} - {self.amount} {self.currency} ({self.get_frequency_display()})"
