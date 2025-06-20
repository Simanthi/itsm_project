from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it,
    read-only for others.
    Assumes the model instance has a 'requested_by' or 'created_by' attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the snippet.
        # Adapt attribute check based on the model.
        if hasattr(obj, 'requested_by'):
            return obj.requested_by == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access for anyone, but write access only for staff users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsAccountsStaffOrOwnerReadOnly(permissions.BasePermission):
    """
    Allows read-only for owner.
    Allows full access for "accounts_staff" group members or general staff/superusers.
    This is a basic example; group names should be constants or configurable.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            # Check if the user is the owner for read-only access
            if hasattr(obj, 'requested_by') and obj.requested_by == request.user:
                return True
            # Staff/superusers can also read
            if request.user and request.user.is_staff:
                return True
            return False # Or True if any authenticated user can read

        # Write permissions
        if request.user and request.user.is_staff:
            # Further check if user is in 'accounts_staff' group for specific actions if needed
            # For general CRUDS by staff, this is okay.
            # if request.user.groups.filter(name='accounts_staff').exists():
            #     return True
            return True # General staff can edit

        # Allow owner to perform certain "write" actions if defined by view logic (e.g., cancel)
        # This permission primarily gates general editing by staff.
        # Specific action permissions might override this in the view.
        if hasattr(obj, 'requested_by') and obj.requested_by == request.user:
            # e.g., if view's update method checks for specific status for owner updates
            return True # Placeholder, view should enforce specific owner actions

        return False

    def has_permission(self, request, view): # For list/create views
        if request.method == 'POST': # Anyone authenticated can create (e.g. a check request)
            return request.user and request.user.is_authenticated
        return True # Allow list views for any authenticated user or staff


class CanApproveRejectIOM(permissions.BasePermission):
    """
    Permission to check if a user can approve or reject an IOM.
    Typically, this would be a manager or a user in a specific "approvers" group.
    For this example, we'll simplify to is_staff.
    """
    def has_permission(self, request, view): # For the action itself
        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj): # For the specific IOM object
        # Optionally, add logic like: obj.department in user.managed_departments
        return request.user and request.user.is_staff

class CanDecideCheckRequest(permissions.BasePermission):
    """
    Permission for accounts staff to approve/reject check requests.
    """
    def has_permission(self, request, view):
        # Example: Check if user is in 'Accounts Payable' group or is staff
        # return request.user and (request.user.groups.filter(name='Accounts Payable').exists() or request.user.is_staff)
        return request.user and request.user.is_staff # Simplified to is_staff

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view) # Same logic for object level

class CanConfirmPayment(permissions.BasePermission):
    """
    Permission for accounts staff to confirm payment for check requests.
    """
    def has_permission(self, request, view):
        # return request.user and (request.user.groups.filter(name='Accounts Payable').exists() or request.user.is_staff)
        return request.user and request.user.is_staff # Simplified

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
