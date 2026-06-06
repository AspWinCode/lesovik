import { apiClient } from "./client";

export interface Rule {
  id: string;
  app_id: string;
  entity_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger: { event: string; watch_fields: string[] };
  conditions: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  priority: number;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  priority?: number;
}

export async function listRules(
  appId: string,
  params?: { entity_id?: string; active_only?: boolean },
): Promise<Rule[]> {
  const { data } = await apiClient.get<Rule[]>(`/apps/${appId}/rules`, { params });
  return data;
}

export async function deleteRule(appId: string, ruleId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/rules/${ruleId}`);
}

export async function updateRule(appId: string, ruleId: string, body: RuleUpdate): Promise<Rule> {
  const { data } = await apiClient.patch<Rule>(`/apps/${appId}/rules/${ruleId}`, body);
  return data;
}

export async function activateRule(appId: string, ruleId: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`/apps/${appId}/rules/${ruleId}/activate`);
  return data;
}

export async function deactivateRule(appId: string, ruleId: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`/apps/${appId}/rules/${ruleId}/deactivate`);
  return data;
}
