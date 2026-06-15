from rest_framework import permissions


class IsSeller(permissions.BasePermission):
    """
    GET برای همه
    POST/PUT/DELETE فقط seller و admin
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return (
            request.user.is_authenticated and
            (
                request.user.role == "seller" or
                request.user.is_admin
            )
        )