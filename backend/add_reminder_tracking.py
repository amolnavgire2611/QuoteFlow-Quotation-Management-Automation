
import sqlite3
from pathlib import Path

# Update this path if your SQLite database is stored elsewhere.
DATABASE_PATH = (
    Path(__file__).resolve().parents[1] / "quotation.db"
)


def migrate():
    connection = sqlite3.connect(DATABASE_PATH)

    try:
        cursor = connection.cursor()

        cursor.execute("PRAGMA table_info(quotation_emails)")
        columns = {
            row[1] for row in cursor.fetchall()
        }

        if "reminder_type" not in columns:
            cursor.execute(
                """
                ALTER TABLE quotation_emails
                ADD COLUMN reminder_type VARCHAR(50)
                """
            )

        if "reminder_key" not in columns:
            cursor.execute(
                """
                ALTER TABLE quotation_emails
                ADD COLUMN reminder_key VARCHAR(255)
                """
            )

        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS
            uq_quotation_emails_reminder_key
            ON quotation_emails (reminder_key)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS
            ix_quotation_emails_reminder_type
            ON quotation_emails (reminder_type)
            """
        )

        connection.commit()
        print("Reminder tracking migration completed.")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    migrate()
