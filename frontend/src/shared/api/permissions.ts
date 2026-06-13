import { apiClient } from "./client";

export interface FieldPermission {
  id: string;
  app_id: string;
  entity_id: string;
  field_name: string;
  role_id: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
}

export interface FieldPermissionUpsert {
  field_name: string;
  role_id: string;
  can_read: boolean;
  can_write: boolean;
}

export async function listPermissions(
  appId: string,
  entityId: string,
): Promise<FieldPermission[]> {
  const { data } = await apiClient.get<FieldPermission[]>(
    `/apps/${appId}/entities/${entityId}/permissions`,
  );
  return data;
}

export async function replacePermissions(
  appId: string,
  entityId: string,
  permissions: FieldPermissionUpsert[],
): Promise<FieldPermission[]> {
  const { data } = await apiClient.put<FieldPermission[]>(
    `/apps/${appId}/entities/${entityId}/permissions`,
    { permissions },
  );
  return data;
}

export async function deletePermission(
  appId: string,
  entityId: string,
  permId: string,
): Promise<void> {
  await apiClient.delete(`/apps/${appId}/entities/${entityId}/permissions/${permId}`);
}
