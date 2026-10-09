
from sqlalchemy import text

from app.database import engine


INDEX_NAME = "uq_quotation_revision_number"


def migrate():
    with engine.begin() as connection:
        duplicates = connection.execute(
            text("""
                SELECT quotation_id, revision_number, COUNT(*) AS total
                FROM quotation_revisions
                GROUP BY quotation_id, revision_number
                HAVING COUNT(*) > 1
            """)
        ).fetchall()

        if duplicates:
            print("Migration stopped: duplicate revisions already exist.")
            for row in duplicates:
                print(
                    f"Quotation ID: {row[0]}, "
                    f"Revision: {row[1]}, Count: {row[2]}"
                )
            return

        connection.execute(
            text(f"""
                CREATE UNIQUE INDEX IF NOT EXISTS {INDEX_NAME}
                ON quotation_revisions (quotation_id, revision_number)
            """)
        )

    print("Unique revision index created successfully.")


if __name__ == "__main__":
    migrate()