import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class App(Base):
    __tablename__ = "app"
    __table_args__ = {"schema": "catalog"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("identity.user.id", ondelete="SET NULL"),
        nullable=False,
    )
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    members: Mapped[list["AppMember"]] = relationship(
        "AppMember", back_populates="app", cascade="all, delete-orphan"
    )
    entities: Mapped[list["app.models.metamodel.Entity"]] = relationship(  # type: ignore[name-defined]
        "Entity", back_populates="app", cascade="all, delete-orphan"
    )


class AppMember(Base):
    """Per-app user roles (app_admin, app_editor, app_viewer)."""
    __tablename__ = "app_member"
    __table_args__ = {"schema": "catalog"}

    app_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("catalog.app.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("identity.user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # 'owner' | 'admin' | 'editor' | 'viewer'
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    granted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    app: Mapped["App"] = relationship("App", back_populates="members")
