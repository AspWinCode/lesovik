import { apiClient } from "./client";
import type { CursorPage } from "./apps";

export interface RecordRead {
  id: string;
  entity_id: string;
  payload: Record<string, unknown>;
  version: number;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordCreate {
  payload: Record<string, unknown>;
}

export interface RecordUpdate {
  payload: Record<string, unknown>;
}

export interface RecordListParams {
  cursor?: string;
  limit?: number;
  sort_field?: string;
  sort_dir?: "asc" | "desc";
  include_deleted?: boolean;
}

export async function listRecords(
  appId: string,
  entityId: string,
  params?: RecordListParams,
): Promise<CursorPage<RecordRead>> {
  const { data } = await apiClient.get<CursorPage<RecordRead>>(
    `/apps/${appId}/entities/${entityId}/records`,
    { params },
  );
  return data;
}

export async function exportRecords(
  appId: string,
  entityId: string,
  format: "xlsx" | "csv" | "pdf",
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(
    `/apps/${appId}/entities/${entityId}/records/export`,
    { params: { format }, responseType: "blob" },
  );
  return data;
}

export async function restoreRecord(
  appId: string,
  entityId: string,
  recordId: string,
): Promise<RecordRead> {
  const { data } = await apiClient.post<RecordRead>(
    `/apps/${appId}/entities/${entityId}/records/${recordId}/restore`,
  );
  return data;
}

export async function getRecord(appId: string, entityId: string, recordId: string): Promise<RecordRead> {
  const { data } = await apiClient.get<RecordRead>(
    `/apps/${appId}/entities/${entityId}/records/${recordId}`,
  );
  return data;
}

export async function createRecord(appId: string, entityId: string, body: RecordCreate): Promise<RecordRead> {
  const { data } = await apiClient.post<RecordRead>(
    `/apps/${appId}/entities/${entityId}/records`,
    body,
  );
  return data;
}

export async function updateRecord(
  appId: string,
  entityId: string,
  recordId: string,
  body: RecordUpdate,
): Promise<RecordRead> {
  const { data } = await apiClient.patch<RecordRead>(
    `/apps/${appId}/entities/${entityId}/records/${recordId}`,
    body,
  );
  return data;
}

export async function deleteRecord(
  appId: string,
  entityId: string,
  recordId: string,
  hard = false,
): Promise<void> {
  await apiClient.delete(
    `/apps/${appId}/entities/${entityId}/records/${recordId}`,
    hard ? { params: { hard: true } } : undefined,
  );
}

/* ── Import ── */

export interface ImportPreview {
  headers: string[];
  sample: Record<string, string>[];
  total_rows: number;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; error: string; data: Record<string, unknown> }[];
}

export async function previewImport(appId: string, entityId: string, file: File): Promise<ImportPreview> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ImportPreview>(
    `/apps/${appId}/entities/${entityId}/records/import/preview`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/* ── File attachments ── */

export interface RecordFileRead {
  id: string;
  field_name: string;
  original_name: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

export async function uploadRecordFile(
  appId: string,
  entityId: string,
  recordId: string,
  fieldName: string,
  file: File,
): Promise<RecordFileRead> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<RecordFileRead>(
    `/apps/${appId}/entities/${entityId}/records/${recordId}/files`,
    form,
    { headers: { "Content-Type": "multipart/form-data" }, params: { field_name: fieldName } },
  );
  return data;
}

export async function getRecordFileDownloadUrl(
  appId: string,
  entityId: string,
  recordId: string,
  fileId: string,
): Promise<{ url: string }> {
  const { data } = await apiClient.get<{ url: string }>(
    `/apps/${appId}/entities/${entityId}/records/${recordId}/files/${fileId}/download`,
  );
  return data;
}

export async function importRecords(
  appId: string,
  entityId: string,
  file: File,
  columnMap: Record<string, string>,
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ImportResult>(
    `/apps/${appId}/entities/${entityId}/records/import`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      params: { column_map: JSON.stringify(columnMap) },
    },
  );
  return data;
}
