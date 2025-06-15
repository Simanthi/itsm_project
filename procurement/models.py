from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class PurchaseRequestMemo(models.Model):
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('po_created', _('PO Created')), # When a Purchase Order is made from this
        ('cancelled', _('Cancelled')), # If the requester cancels it
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
        on_delete=models.CASCADE, # If user deleted, their requests are gone
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
        on_delete=models.SET_NULL, # Keep the memo even if approver account is deleted
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
        return f"Request for {self.item_description[:50]} by {self.requested_by.username} on {self.request_date.strftime('%Y-%m-%d')}"
