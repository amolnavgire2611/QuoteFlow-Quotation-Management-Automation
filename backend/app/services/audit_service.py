from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    quotation_id: int | None,
    action: str,
    description: str,
    user_name: str = "Administrator",
):
    audit_log = AuditLog(
        quotation_id=quotation_id,
        action=action,
        description=description,
        user_name=user_name,
    )

    db.add(audit_log)

    return audit_log