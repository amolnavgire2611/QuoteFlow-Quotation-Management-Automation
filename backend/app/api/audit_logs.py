from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)


@router.get("/{quotation_id}")
def get_quotation_audit_logs(
    quotation_id: int,
    db: Session = Depends(get_db),
):
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.quotation_id == quotation_id
        )
        .order_by(
            AuditLog.created_at.desc()
        )
        .all()
    )

    return {
        "quotation_id": quotation_id,
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "user_name": log.user_name,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }