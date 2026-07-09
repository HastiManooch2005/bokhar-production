from ..models.log_models import *

def create_audit_log(action, user=None, payment=None, old_data=None, new_data=None, ip=None):
    FinancialAuditLog.objects.create(
        action=action,
        user=user,
        payment=payment,
        old_data=old_data or {},
        new_data=new_data or {},
        ip_address=ip,
    )