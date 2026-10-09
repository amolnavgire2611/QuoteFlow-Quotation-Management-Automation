
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.quotation_scheduler import (
    scheduler,
    execute_quotation_reminders,
)

router = APIRouter(
    prefix="/reminder-controls",
    tags=["Reminder Controls"],
)


@router.get("/scheduler")
def get_scheduler_status():
    job = scheduler.get_job("daily_quotation_reminders")

    return {
        "running": scheduler.running,
        "job_configured": job is not None,
        "job_id": job.id if job else None,
        "next_run_time": (
            job.next_run_time.isoformat()
            if job and job.next_run_time
            else None
        ),
        "timezone": "Asia/Kolkata",
        "checked_at": datetime.now(
            ZoneInfo("Asia/Kolkata")
        ).isoformat(),
    }


@router.post("/run")
def run_reminders_now(db: Session = Depends(get_db)):
    if not scheduler.running:
        raise HTTPException(
            status_code=503,
            detail="The quotation reminder scheduler is not running.",
        )

    # Execute synchronously so the response includes the result.
    from app.services.quotation_reminder_service import (
        run_quotation_reminders,
    )

    try:
        result = run_quotation_reminders(db)
        return {
            "message": "Reminder processing completed.",
            "result": result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Reminder processing failed.",
        ) from exc