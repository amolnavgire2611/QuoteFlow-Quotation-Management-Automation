
import sqlite3
from pathlib import Path

from sqlalchemy import inspect

from app.database import engine


COLUMN_DEFINITIONS = {
    "quotation_date": "DATE",
    "valid_until": "DATE",
    "customer_name": "VARCHAR(200)",
    "customer_address": "TEXT",
    "customer_email": "VARCHAR(200)",
    "customer_gst_number": "VARCHAR(50)",
    "company_name": "VARCHAR(200)",
    "company_address": "TEXT",
    "company_email": "VARCHAR(200)",
    "company_phone": "VARCHAR(50)",
    "company_gst_number": "VARCHAR(50)",
}


def migrate():
    if engine.dialect.name != "sqlite":
        raise RuntimeError("This migration is for SQLite only.")

    database_path = engine.url.database

    if not database_path or database_path == ":memory:":
        raise RuntimeError(
            "Could not determine the SQLite database file."
        )

    database_path = Path(database_path).resolve()

    if not database_path.exists():
        raise FileNotFoundError(
            f"Database file not found: {database_path}"
        )

    # Back up the existing database before changing its schema.
    backup_path = database_path.with_name(
        f"{database_path.stem}.before_revision_migration"
        f"{database_path.suffix}"
    )

    with engine.connect() as connection:
        source = connection.connection.driver_connection

        with sqlite3.connect(str(backup_path)) as backup:
            source.backup(backup)

    print(f"Database backup created: {backup_path}")

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "quotation_revisions" not in existing_tables:
        raise RuntimeError(
            "Table 'quotation_revisions' does not exist."
        )

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("quotation_revisions")
    }

    added_columns = []

    with engine.begin() as connection:
        for column_name, sql_type in COLUMN_DEFINITIONS.items():
            if column_name in existing_columns:
                print(f"Already exists: {column_name}")
                continue

            sql = (
                f'ALTER TABLE quotation_revisions '
                f'ADD COLUMN "{column_name}" {sql_type} NULL'
            )

            connection.exec_driver_sql(sql)
            added_columns.append(column_name)
            print(f"Added column: {column_name}")

    print("\nMigration completed successfully.")
    print(f"New columns added: {len(added_columns)}")
    print("Existing quotation and revision records were preserved.")


if __name__ == "__main__":
    migrate()