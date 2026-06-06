import { apiClient } from "./client";
import type { CursorPage } from "./apps";

export interface RecordRead {
  id: string;
  entity_id: string;
  payload: Record<string, unknown>;
  version: number;
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

export async function deleteRecord(appId: string, entityId: string, recordId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}/records/${recordId}`);
}
