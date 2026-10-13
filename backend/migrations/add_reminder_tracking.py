
from sqlalchemy import inspect, text

from app.database import engine
from app.models.quotation_email import QuotationEmail


def migrate_reminder_tracking():
    table_name = QuotationEmail.__tablename__

    inspector = inspect(engine)

    if not inspector.has_table(table_name):
        raise RuntimeError(
            f"Table '{table_name}' does not exist in the "
            "configured database. Check the database URL "
            "and existing database schema before migrating."
        )

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    preparer = engine.dialect.identifier_preparer
    quoted_table = preparer.quote(table_name)

    with engine.begin() as connection:
        if "reminder_type" not in existing_columns:
            connection.execute(
                text(
                    f"ALTER TABLE {quoted_table} "
                    "ADD COLUMN reminder_type VARCHAR(50)"
                )
            )
            print("Added reminder_type column.")

        if "reminder_key" not in existing_columns:
            connection.execute(
                text(
                    f"ALTER TABLE "
                    f"{quoted_table} "
                    "ADD COLUMN reminder_key VARCHAR(255)"
                )
            )
            print("Added reminder_key column.")

        quoted_reminder_type = preparer.quote(
            "reminder_type"
        )
        quoted_reminder_key = preparer.quote(
            "reminder_key"
        )

        type_index_name = f"ix_{table_name}_reminder_type"
        key_index_name = f"uq_{table_name}_reminder_key"

        quoted_type_index = preparer.quote(type_index_name)
        quoted_key_index = preparer.quote(key_index_name)

        connection.execute(
            text(
                f"CREATE INDEX IF NOT EXISTS "
                f"{quoted_type_index} "
                f"ON {quoted_table} "
                f"({quoted_reminder_type})"
            )
        )

        connection.execute(
            text(
                f"CREATE UNIQUE INDEX IF NOT EXISTS "
                f"{quoted_key_index} "
                f"ON {quoted_table} "
                f"({quoted_reminder_key})"
            )
        )

    print("Reminder tracking migration completed.")


if __name__ == "__main__":
    migrate_reminder_tracking()
