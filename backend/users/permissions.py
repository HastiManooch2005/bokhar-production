from rest_framework import permissions


class IsAdminOrSeller(permissions.BasePermission):
    """
    فقط ادمین و فروشنده دسترسی دارن
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_admin', False) or
                getattr(request.user, 'role', '') == "seller"
            )
        )