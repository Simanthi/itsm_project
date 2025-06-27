from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAdminUser

class IsTemplateAdmin(IsAdminUser):
    """
    Custom permission to only allow admin users to manage IOMCategories and IOMTemplates.
    Inherits from IsAdminUser for now, which checks user.is_staff.
    """
    pass # IsAdminUser already checks for is_staff

class CanReadIOMTemplate(BasePermission):
    """
    Allows any authenticated user to read (list/retrieve) IOMTemplates.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class CanUseIOMTemplateForCreate(BasePermission):
    """
    Permission to check if a user can create a GenericIOM using a specific template.
    For now, allows any authenticated user if the template is active.
    This could be expanded later to check user roles against template-specific permissions.
    """
    def has_permission(self, request, view):
        # General permission to attempt creation.
        # Specific template check might be better done in the view's perform_create or serializer validation
        # if it depends on the template being chosen.
        return request.user and request.user.is_authenticated

    # def has_object_permission(self, request, view, obj):
    #     # 'obj' here would be the IOMTemplate instance if used for checking against a specific template.
    #     # For create action, this is not typically called with the template object directly.
    #     # This logic is better placed in the view if template ID is part of request data.
    #     return obj.is_active and request.user and request.user.is_authenticated


class IsOwnerOrReadOnlyGenericIOM(BasePermission):
    """
    Object-level permission to only allow owners of a GenericIOM to edit it
    if it's in 'draft' status. Allows read-only for others.
    Admins can always edit.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True # Allow read-only for any authenticated user (or public if IsAuthenticated is not global)

        # Write permissions are only allowed if the user is the owner and status is 'draft', or if user is admin.
        if request.user.is_staff:
            return True
        return obj.created_by == request.user and obj.status == 'draft'

class CanPerformSimpleApproval(BasePermission):
    """
    Allows the designated simple approver (user or group member) to action a GenericIOM.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff: # Admins can override
            return True

        if obj.status == 'pending_approval' and obj.iom_template.approval_type == 'simple':
            template = obj.iom_template
            if template.simple_approval_user == request.user:
                return True
            if template.simple_approval_group and \
               request.user.groups.filter(pk=template.simple_approval_group.pk).exists():
                return True
        return False

class CanSubmitForSimpleApproval(BasePermission):
    """
    Allows the creator of a 'draft' GenericIOM (configured for simple approval) to submit it.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff: # Admins can override
            return True

        return obj.created_by == request.user and \
               obj.status == 'draft' and \
               obj.iom_template.approval_type == 'simple'

class CanPublishGenericIOM(BasePermission):
    """
    Allows publishing a GenericIOM if:
    - Template requires no approval and IOM is draft (owner or admin).
    - Template requires simple approval and IOM is approved (owner or admin).
    - Template requires advanced approval and IOM is approved (owner or admin).
    Admins can always publish if conditions met.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff: # Staff can publish if conditions met
            pass # Continue to status checks
        elif obj.created_by != request.user : # If not staff, must be owner
            return False

        # Check status based on approval type
        template_approval_type = obj.iom_template.approval_type
        if template_approval_type == 'none' and obj.status == 'draft':
            return True
        # For simple/advanced, 'approved' means it passed its respective workflow
        if template_approval_type in ['simple', 'advanced'] and obj.status == 'approved':
            return True

        return False

class CanViewGenericIOM(BasePermission):
    """
    Permission to view a GenericIOM.
    Allows if:
    - User is staff.
    - User is the creator.
    - User is a direct recipient (in to_users).
    - User is in a recipient group (in to_groups).
    - IOM is published (for any authenticated user).
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False # Should be caught by IsAuthenticated global perm usually

        if request.user.is_staff or obj.created_by == request.user:
            return True

        if obj.status == 'published': # Published IOMs are viewable by more people
            # Depending on policy, could be any authenticated user, or still restricted
            # For now, let's say published means viewable by recipients.
            # If "published to all", then just `return True` here for authenticated users.
            pass # Fall through to recipient check for published items too

        if obj.to_users.filter(pk=request.user.pk).exists():
            return True

        if request.user.groups.filter(pk__in=obj.to_groups.all().values_list('pk', flat=True)).exists():
            return True

        return False
