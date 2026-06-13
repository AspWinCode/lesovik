import { apiClient } from "./client";

export interface Sequence {
  id: string;
  app_id: string;
  entity_id: string;
  field_name: string;
  prefix: string;
  suffix: string;
  padding: number;
  step: number;
  next_value: number;
  reset_on: string | null;
}

export interface SequenceCreate {
  field_name: string;
  prefix?: string;
  suffix?: string;
  padding?: number;
  step?: number;
  start?: number;
  reset_on?: string | null;
}

export interface SequenceUpdate {
  prefix?: string;
  suffix?: string;
  padding?: number;
  step?: number;
  reset_on?: string | null;
}

export async function listSequences(appId: string, entityId: string): Promise<Sequence[]> {
  const { data } = await apiClient.get<Sequence[]>(
    `/apps/${appId}/entities/${entityId}/sequences`,
  );
  return data;
}

export async function createSequence(
  appId: string,
  entityId: string,
  body: SequenceCreate,
): Promise<Sequence> {
  const { data } = await apiClient.post<Sequence>(
    `/apps/${appId}/entities/${entityId}/sequences`,
    body,
  );
  return data;
}

export async function updateSequence(
  appId: string,
  entityId: string,
  sequenceId: string,
  body: SequenceUpdate,
): Promise<Sequence> {
  const { data } = await apiClient.patch<Sequence>(
    `/apps/${appId}/entities/${entityId}/sequences/${sequenceId}`,
    body,
  );
  return data;
}

export async function deleteSequence(
  appId: string,
  entityId: string,
  sequenceId: string,
): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}/sequences/${sequenceId}`);
}
