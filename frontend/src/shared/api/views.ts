import { apiClient } from "./client";

export type ViewType = "table" | "form" | "kanban" | "calendar" | "gallery" | "detail";

export interface ViewRead {
  id: string;
  app_id: string;
  entity_id: string;
  name: string;
  view_type: ViewType;
  config: Record<string, unknown>;
  is_default: boolean;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewCreate {
  name: string;
  view_type: ViewType;
  config?: Record<string, unknown>;
  is_public?: boolean;
}

export interface ViewUpdate {
  name?: string;
  config?: Record<string, unknown>;
  is_public?: boolean;
}

export async function listViews(appId: string, entityId: string): Promise<ViewRead[]> {
  const { data } = await apiClient.get<ViewRead[]>(
    `/apps/${appId}/entities/${entityId}/views`,
  );
  return data;
}

export async function createView(appId: string, entityId: string, body: ViewCreate): Promise<ViewRead> {
  const { data } = await apiClient.post<ViewRead>(
    `/apps/${appId}/entities/${entityId}/views`,
    body,
  );
  return data;
}

export async function updateView(appId: string, entityId: string, viewId: string, body: ViewUpdate): Promise<ViewRead> {
  const { data } = await apiClient.patch<ViewRead>(
    `/apps/${appId}/entities/${entityId}/views/${viewId}`,
    body,
  );
  return data;
}

export async function deleteView(appId: string, entityId: string, viewId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}/views/${viewId}`);
}

export async function setDefaultView(appId: string, entityId: string, viewId: string): Promise<ViewRead> {
  const { data } = await apiClient.post<ViewRead>(
    `/apps/${appId}/entities/${entityId}/views/${viewId}/set_default`,
  );
  return data;
}

/* ── Pages ── */

export interface PageRead {
  id: string;
  app_id: string;
  slug: string;
  title: string;
  icon: string | null;
  nav_order: number;
  layout: Record<string, unknown>;
  blocks: Record<string, unknown>[];
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageCreate {
  slug: string;
  title: string;
  icon?: string | null;
  nav_order?: number;
  layout?: Record<string, unknown>;
  blocks?: Record<string, unknown>[];
}

export interface PageUpdate {
  title?: string;
  icon?: string | null;
  nav_order?: number;
  layout?: Record<string, unknown>;
  blocks?: Record<string, unknown>[];
}

export async function listPages(appId: string): Promise<PageRead[]> {
  const { data } = await apiClient.get<PageRead[]>(`/apps/${appId}/pages`);
  return data;
}

export async function createPage(appId: string, body: PageCreate): Promise<PageRead> {
  const { data } = await apiClient.post<PageRead>(`/apps/${appId}/pages`, body);
  return data;
}

export async function updatePage(appId: string, pageId: string, body: PageUpdate): Promise<PageRead> {
  const { data } = await apiClient.patch<PageRead>(`/apps/${appId}/pages/${pageId}`, body);
  return data;
}

export async function deletePage(appId: string, pageId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/pages/${pageId}`);
}

export async function publishPage(appId: string, pageId: string): Promise<PageRead> {
  const { data } = await apiClient.post<PageRead>(`/apps/${appId}/pages/${pageId}/publish`);
  return data;
}

export async function unpublishPage(appId: string, pageId: string): Promise<PageRead> {
  const { data } = await apiClient.post<PageRead>(`/apps/${appId}/pages/${pageId}/unpublish`);
  return data;
}
