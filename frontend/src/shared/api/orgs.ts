import { apiClient } from "./client";

export interface Org {
  id: string;
  slug: string;
  display_name: string;
  plan: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OrgCreate {
  slug: string;
  display_name: string;
  plan?: string;
  admin_email: string;
  admin_display_name: string;
  admin_password: string;
}

export interface OrgUpdate {
  display_name?: string;
  plan?: string;
  is_active?: boolean;
}

export async function listOrgs(): Promise<Org[]> {
  const { data } = await apiClient.get<Org[]>("/orgs");
  return data;
}

export async function getOrg(orgId: string): Promise<Org> {
  const { data } = await apiClient.get<Org>(`/orgs/${orgId}`);
  return data;
}

export async function createOrg(body: OrgCreate): Promise<Org> {
  const { data } = await apiClient.post<Org>("/orgs", body);
  return data;
}

export async function updateOrg(orgId: string, body: OrgUpdate): Promise<Org> {
  const { data } = await apiClient.patch<Org>(`/orgs/${orgId}`, body);
  return data;
}
