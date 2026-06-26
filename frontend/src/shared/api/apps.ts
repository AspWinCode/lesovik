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
  settings?: Record<string, unknown>;
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

export async function publishApp(appId: string): Promise<App> {
  const { data } = await apiClient.post<App>(`/apps/${appId}/publish`);
  return data;
}

export interface AppMember {
  user_id: string;
  role: string;
  granted_at: string;
  email: string | null;
  display_name: string | null;
}

export async function listAppMembers(appId: string): Promise<AppMember[]> {
  const { data } = await apiClient.get<AppMember[]>(`/apps/${appId}/members`);
  return data;
}

export async function addAppMember(appId: string, userId: string, role: string): Promise<void> {
  await apiClient.post(`/apps/${appId}/members`, { user_id: userId, role });
}

export async function removeAppMember(appId: string, userId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/members/${userId}`);
}
