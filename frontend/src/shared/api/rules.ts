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
  trigger?: { event: string; watch_fields?: string[] };
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
}

export interface RuleCreate {
  name: string;
  entity_id: string;
  trigger: { event: string; watch_fields?: string[] };
  description?: string | null;
  priority?: number;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
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

export async function createRule(appId: string, body: RuleCreate): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`/apps/${appId}/rules`, body);
  return data;
}

/* ── Process steps (ordered actions bound to a rule) ── */

export interface ProcessStep {
  id: string;
  order: number;
  type: string;
  config: Record<string, unknown>;
}

export interface ProcessStepCreate {
  type: string;
  config?: Record<string, unknown>;
}

export interface ProcessStepUpdate {
  type?: string;
  config?: Record<string, unknown>;
}

export async function listSteps(appId: string, ruleId: string): Promise<ProcessStep[]> {
  const { data } = await apiClient.get<ProcessStep[]>(`/apps/${appId}/rules/${ruleId}/steps`);
  return data;
}

export async function addStep(appId: string, ruleId: string, body: ProcessStepCreate): Promise<ProcessStep> {
  const { data } = await apiClient.post<ProcessStep>(`/apps/${appId}/rules/${ruleId}/steps`, body);
  return data;
}

export async function updateStep(
  appId: string,
  ruleId: string,
  stepId: string,
  body: ProcessStepUpdate,
): Promise<ProcessStep> {
  const { data } = await apiClient.patch<ProcessStep>(
    `/apps/${appId}/rules/${ruleId}/steps/${stepId}`,
    body,
  );
  return data;
}

export async function deleteStep(appId: string, ruleId: string, stepId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/rules/${ruleId}/steps/${stepId}`);
}

export async function reorderSteps(appId: string, ruleId: string, stepIds: string[]): Promise<ProcessStep[]> {
  const { data } = await apiClient.put<ProcessStep[]>(
    `/apps/${appId}/rules/${ruleId}/steps/reorder`,
    { step_ids: stepIds },
  );
  return data;
}
