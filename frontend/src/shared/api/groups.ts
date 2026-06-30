import { apiClient } from "./client";
import type { UserRole } from "./users";

export interface GroupMember {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
  roles: UserRole[];
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface GroupCreate {
  name: string;
  description?: string;
  role_ids: string[];
}

export interface GroupUpdate {
  name?: string;
  description?: string;
  role_ids?: string[];
}

export async function listGroups(): Promise<Group[]> {
  const { data } = await apiClient.get<Group[]>("/groups");
  return data;
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  const { data } = await apiClient.get<GroupDetail>(`/groups/${groupId}`);
  return data;
}

export async function createGroup(body: GroupCreate): Promise<GroupDetail> {
  const { data } = await apiClient.post<GroupDetail>("/groups", body);
  return data;
}

export async function updateGroup(groupId: string, body: GroupUpdate): Promise<GroupDetail> {
  const { data } = await apiClient.patch<GroupDetail>(`/groups/${groupId}`, body);
  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/groups/${groupId}`);
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  await apiClient.post(`/groups/${groupId}/members/${userId}`);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`/groups/${groupId}/members/${userId}`);
}

export async function applyGroupRoles(groupId: string): Promise<{ grants_added: number }> {
  const { data } = await apiClient.post<{ grants_added: number }>(`/groups/${groupId}/apply-roles`);
  return data;
}
