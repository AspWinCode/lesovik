import { apiClient } from "./client";

export interface WorkflowDefRead {
  id: string;
  app_id: string;
  entity_id: string;
  name: string;
  description: string | null;
  initial_state: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDefCreate {
  entity_id: string;
  name: string;
  description?: string | null;
  initial_state: string;
}

export interface WorkflowDefUpdate {
  name?: string;
  description?: string | null;
  initial_state?: string;
}

export interface StateDefRead {
  id: string;
  workflow_id: string;
  name: string;
  display_name: string;
  is_terminal: boolean;
  color: string | null;
  sla_seconds: number | null;
  on_enter_actions: Record<string, unknown>[];
  on_exit_actions: Record<string, unknown>[];
  sla_breach_actions: Record<string, unknown>[];
  assignee_type: "user" | "group" | "role" | null;
  assignee_id: string | null;
}

export interface StateDefCreate {
  name: string;
  display_name: string;
  is_terminal?: boolean;
  color?: string | null;
  sla_seconds?: number | null;
  assignee_type?: "user" | "group" | "role" | null;
  assignee_id?: string | null;
}

export interface StateDefUpdate {
  display_name?: string;
  is_terminal?: boolean;
  color?: string | null;
  sla_seconds?: number | null;
  assignee_type?: "user" | "group" | "role" | null;
  assignee_id?: string | null;
}

export interface WorkflowInstanceRead {
  id: string;
  workflow_id: string;
  app_id: string;
  entity_id: string;
  record_id: string;
  current_state: string;
  version: number;
  sla_deadline: string | null;
  started_at: string;
  completed_at: string | null;
  assigned_user_id: string | null;
  assigned_group_id: string | null;
}

export interface AssignInstanceRequest {
  assigned_user_id?: string | null;
  assigned_group_id?: string | null;
}

export async function listWorkflows(
  appId: string,
  params?: { entity_id?: string },
): Promise<WorkflowDefRead[]> {
  const { data } = await apiClient.get<WorkflowDefRead[]>(`/apps/${appId}/workflows`, { params });
  return data;
}

export async function createWorkflow(appId: string, body: WorkflowDefCreate): Promise<WorkflowDefRead> {
  const { data } = await apiClient.post<WorkflowDefRead>(`/apps/${appId}/workflows`, body);
  return data;
}

export async function updateWorkflow(
  appId: string,
  workflowId: string,
  body: WorkflowDefUpdate,
): Promise<WorkflowDefRead> {
  const { data } = await apiClient.patch<WorkflowDefRead>(
    `/apps/${appId}/workflows/${workflowId}`,
    body,
  );
  return data;
}

export async function deleteWorkflow(appId: string, workflowId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/workflows/${workflowId}`);
}

export async function activateWorkflow(appId: string, workflowId: string): Promise<WorkflowDefRead> {
  const { data } = await apiClient.post<WorkflowDefRead>(
    `/apps/${appId}/workflows/${workflowId}/activate`,
  );
  return data;
}

export async function deactivateWorkflow(appId: string, workflowId: string): Promise<WorkflowDefRead> {
  const { data } = await apiClient.post<WorkflowDefRead>(
    `/apps/${appId}/workflows/${workflowId}/deactivate`,
  );
  return data;
}

export async function listStates(appId: string, workflowId: string): Promise<StateDefRead[]> {
  const { data } = await apiClient.get<StateDefRead[]>(
    `/apps/${appId}/workflows/${workflowId}/states`,
  );
  return data;
}

export async function createState(
  appId: string,
  workflowId: string,
  body: StateDefCreate,
): Promise<StateDefRead> {
  const { data } = await apiClient.post<StateDefRead>(
    `/apps/${appId}/workflows/${workflowId}/states`,
    body,
  );
  return data;
}

export async function updateState(
  appId: string,
  workflowId: string,
  stateId: string,
  body: StateDefUpdate,
): Promise<StateDefRead> {
  const { data } = await apiClient.patch<StateDefRead>(
    `/apps/${appId}/workflows/${workflowId}/states/${stateId}`,
    body,
  );
  return data;
}

export async function deleteState(appId: string, workflowId: string, stateId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/workflows/${workflowId}/states/${stateId}`);
}

export async function listInstances(
  appId: string,
  workflowId: string,
  params?: { record_id?: string; limit?: number },
): Promise<WorkflowInstanceRead[]> {
  const { data } = await apiClient.get<WorkflowInstanceRead[]>(
    `/apps/${appId}/workflows/${workflowId}/instances`,
    { params },
  );
  return data;
}

export async function assignInstance(
  appId: string,
  workflowId: string,
  instanceId: string,
  body: AssignInstanceRequest,
): Promise<WorkflowInstanceRead> {
  const { data } = await apiClient.patch<WorkflowInstanceRead>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/assign`,
    body,
  );
  return data;
}
