"""FileService: upload → scan → S3 → DB."""
import uuid
from datetime import UTC, datetime

import structlog
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.antivirus import AntivirusError, ClamAVClient
from app.core.config import settings
from app.core.metrics import file_uploads
from app.core.storage import S3Storage
from app.models.data import RecordFile
from app.schemas.records import RecordFileRead

logger = structlog.get_logger(__name__)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
BLOCKED_EXTENSIONS = {".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".jar"}


class FileError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class FileNotFoundError(Exception):
    pass


class FileService:
    def __init__(self, db: AsyncSession, storage: S3Storage, av: ClamAVClient) -> None:
        self._db = db
        self._storage = storage
        self._av = av

    async def upload_file(
        self,
        app_id: uuid.UUID,
        entity_id: uuid.UUID,
        record_id: uuid.UUID,
        field_name: str,
        upload: UploadFile,
        actor_id: uuid.UUID | None = None,
    ) -> RecordFileRead:
        filename = upload.filename or "unnamed"
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if ext in BLOCKED_EXTENSIONS:
            file_uploads.labels(status="error").inc()
            raise FileError(f"File type {ext!r} is not allowed")

        data = await upload.read()
        if len(data) > MAX_FILE_SIZE:
            file_uploads.labels(status="error").inc()
            raise FileError(f"File exceeds maximum size of {MAX_FILE_SIZE // 1_048_576} MB")

        # ClamAV scan
        is_clean, verdict = await self._av.scan_bytes(data)
        if not is_clean:
            logger.warning("infected_file_blocked", filename=filename, verdict=verdict)
            file_uploads.labels(status="virus_detected").inc()
            raise FileError("File failed antivirus scan", status_code=422)

        # Upload to S3
        s3_key = S3Storage.make_key(app_id, entity_id, record_id, filename)
        content_type = upload.content_type or "application/octet-stream"
        await self._storage.upload(
            settings.S3_BUCKET_FILES,
            s3_key,
            data,
            content_type=content_type,
            metadata={"uploaded-by": str(actor_id or "")},
        )

        # Persist to DB
        db_file = RecordFile(
            record_id=record_id,
            entity_id=entity_id,
            app_id=app_id,
            field_name=field_name,
            original_filename=filename,
            content_type=content_type,
            size_bytes=len(data),
            s3_key=s3_key,
            is_scanned=verdict != "SCAN_SKIPPED",
            is_infected=False,
            created_by=actor_id,
        )
        self._db.add(db_file)
        await self._db.flush()
        file_uploads.labels(status="success").inc()
        logger.info(
            "file_uploaded",
            file_id=str(db_file.id),
            record_id=str(record_id),
            s3_key=s3_key,
        )
        return RecordFileRead.model_validate(db_file)

    async def get_download_url(
        self, file_id: uuid.UUID, expires: int = 3600
    ) -> RecordFileRead:
        db_file = await self._fetch(file_id)
        url = await self._storage.get_presigned_url(
            settings.S3_BUCKET_FILES,
            db_file.s3_key,
            expires=expires,
            filename=db_file.original_filename,
        )
        read = RecordFileRead.model_validate(db_file)
        read.download_url = url
        return read

    async def list_files(
        self, record_id: uuid.UUID, field_name: str | None = None
    ) -> list[RecordFileRead]:
        stmt = select(RecordFile).where(RecordFile.record_id == record_id)
        if field_name:
            stmt = stmt.where(RecordFile.field_name == field_name)
        result = await self._db.execute(stmt)
        return [RecordFileRead.model_validate(f) for f in result.scalars()]

    async def delete_file(self, file_id: uuid.UUID, actor_id: uuid.UUID | None = None) -> None:
        db_file = await self._fetch(file_id)
        # Remove from S3
        try:
            await self._storage.delete(settings.S3_BUCKET_FILES, db_file.s3_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("s3_delete_failed", key=db_file.s3_key, error=str(exc))

        await self._db.delete(db_file)
        await self._db.flush()
        logger.info("file_deleted", file_id=str(file_id))

    async def _fetch(self, file_id: uuid.UUID) -> RecordFile:
        result = await self._db.execute(
            select(RecordFile).where(RecordFile.id == file_id)
        )
        f = result.scalar_one_or_none()
        if f is None:
            raise FileNotFoundError(str(file_id))
        return f
