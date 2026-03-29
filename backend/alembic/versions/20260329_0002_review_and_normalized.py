"""add review state and normalized profile

Revision ID: 20260329_0002
Revises: 20260329_0001
Create Date: 2026-03-29 11:20:00
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260329_0002"
down_revision = "20260329_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("extracted_data", sa.Column("reviewed_data_json", sa.JSON(), nullable=True))
    op.add_column(
        "extracted_data",
        sa.Column("review_status", sa.String(length=32), nullable=False, server_default="pending"),
    )
    op.add_column(
        "extracted_data",
        sa.Column(
            "review_metadata_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
    )
    op.add_column(
        "extracted_data",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("extracted_data", "review_status", server_default=None)
    op.alter_column("extracted_data", "review_metadata_json", server_default=None)

    op.create_table(
        "normalized_profile",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("data_json", sa.JSON(), nullable=False),
        sa.Column("audit_json", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("normalized_profile")
    op.drop_column("extracted_data", "reviewed_at")
    op.drop_column("extracted_data", "review_metadata_json")
    op.drop_column("extracted_data", "review_status")
    op.drop_column("extracted_data", "reviewed_data_json")
