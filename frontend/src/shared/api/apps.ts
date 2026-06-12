import { apiClient } from "./client";

export interface App {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  owner_id: string;
  is_published: boolean;
  is_archived: boolean;
  settings: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
  total: number | null;
}

export interface AppCreate {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  settings?: Record<string, unknown>;
}

export async function listApps(params?: {
  search?: string;
  include_archived?: boolean;
}): Promise<CursorPage<App>> {
  const { data } = await apiClient.get<CursorPage<App>>("/apps", { params });
  return data;
}

export interface AppUpdate {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

export async function createApp(body: AppCreate): Promise<App> {
  const { data } = await apiClient.post<App>("/apps", body);
  return data;
}

export async function updateApp(appId: string, body: AppUpdate): Promise<App> {
  const { data } = await apiClient.patch<App>(`/apps/${appId}`, body);
  return data;
}

export async function deleteApp(appId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}`);
}
