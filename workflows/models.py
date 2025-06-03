# itsm_project/workflows/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

class ApprovalRequest(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=255, help_text="Summary of the item requiring approval")
    description = models.TextField(blank=True, help_text="Details of the item needing approval")
    
    # Generic Foreign Key to link to any model (ChangeRequest, ServiceRequest, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    initiated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_approvals')
    current_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional: Link to the specific workflow definition if you have complex, configurable workflows
    # workflow_definition = models.ForeignKey(WorkflowDefinition, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Approval Request"
        verbose_name_plural = "Approval Requests"
        ordering = ['-created_at']

    def __str__(self):
        return f"APR-{self.id}: {self.title} ({self.current_status})"


class ApprovalStep(models.Model):
    STEP_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('skipped', 'Skipped'),
    ]

    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='steps')
    step_order = models.PositiveIntegerField(help_text="Order of this step in the workflow")
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approval_steps')
    status = models.CharField(max_length=20, choices=STEP_STATUS_CHOICES, default='pending')
    comments = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Approval Step"
        verbose_name_plural = "Approval Steps"
        # Ensure a request only has one step at a given order for a given approver
        unique_together = ('approval_request', 'step_order', 'approver')
        ordering = ['step_order']

    def __str__(self):
        return f"Step {self.step_order} for APR-{self.approval_request.id} by {self.approver.username}"