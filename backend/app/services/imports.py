"""ImportService: parse CSV/XLSX and bulk-create records."""
from __future__ import annotations

import csv
import io
import uuid
from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

MAX_IMPORT_ROWS = 5_000
_EXCEL_EXTS = {"xlsx", "xls"}
_CSV_EXTS = {"csv", "txt"}


@dataclass
class ImportResult:
    total: int = 0
    created: int = 0
    skipped: int = 0
    errors: list[dict[str, Any]] = field(default_factory=list)


class ImportError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class ImportService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def import_records(
        self,
        app_id: uuid.UUID,
        entity_id: uuid.UUID,
        file_data: bytes,
        filename: str,
        column_map: dict[str, str] | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> ImportResult:
        """
        Parse the uploaded file, map columns to entity field names, validate and
        bulk-create records one by one (so individual row errors don't abort the batch).

        column_map: {csv_header → entity_field_name}. Defaults to identity mapping.
        """
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in _CSV_EXTS:
            rows = self._parse_csv(file_data)
        elif ext in _EXCEL_EXTS:
            rows = self._parse_xlsx(file_data)
        else:
            raise ImportError(f"Unsupported file type: {ext!r}. Upload a CSV or XLSX file.")

        if not rows:
            return ImportResult()

        headers = list(rows[0].keys())
        effective_map: dict[str, str] = column_map or {h: h for h in headers}

        result = ImportResult(total=min(len(rows), MAX_IMPORT_ROWS))

        from app.schemas.records import RecordCreate
        from app.services.records import RecordService, RecordValidationError

        svc = RecordService(self._db)

        for row_num, row in enumerate(rows[:MAX_IMPORT_ROWS], start=2):
            payload: dict[str, Any] = {}
            for csv_col, field_name in effective_map.items():
                val = row.get(csv_col)
                if val is not None and val != "":
                    payload[field_name] = val

            if not payload:
                result.skipped += 1
                continue

            try:
                await svc.create_record(
                    entity_id, RecordCreate(payload=payload), actor_id=actor_id
                )
                result.created += 1
            except RecordValidationError as exc:
                result.errors.append({"row": row_num, "error": str(exc), "data": payload})
            except Exception as exc:  # noqa: BLE001
                result.errors.append({"row": row_num, "error": f"Unexpected error: {exc}", "data": payload})

        logger.info(
            "import_completed",
            app_id=str(app_id),
            entity_id=str(entity_id),
            total=result.total,
            created=result.created,
            skipped=result.skipped,
            error_count=len(result.errors),
        )
        return result

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    def _parse_csv(self, data: bytes) -> list[dict[str, str | None]]:
        text = data.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        return [dict(row) for row in reader]

    def _parse_xlsx(self, data: bytes) -> list[dict[str, Any]]:
        try:
            import openpyxl  # noqa: PLC0415
        except ImportError as exc:
            raise ImportError(
                "openpyxl is required to parse Excel files. Contact your administrator.",
                status_code=501,
            ) from exc

        import io as _io  # already imported but shadow is fine

        wb = openpyxl.load_workbook(_io.BytesIO(data), read_only=True, data_only=True)
        ws = wb.active
        if ws is None:
            return []

        all_rows = list(ws.iter_rows(values_only=True))
        wb.close()

        if not all_rows:
            return []

        headers = [
            str(h) if h is not None else f"col_{i}"
            for i, h in enumerate(all_rows[0])
        ]

        result: list[dict[str, Any]] = []
        for raw_row in all_rows[1:]:
            result.append({
                headers[i]: (str(v) if v is not None else None)
                for i, v in enumerate(raw_row)
            })
        return result
