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

export interface ApprovalLevelDefRead {
  id: string;
  chain_id: string;
  level_order: number;
  display_name: string;
  assignee_type: "user" | "group" | "role" | null;
  assignee_id: string | null;
}

export interface ApprovalLevelDefCreate {
  level_order: number;
  display_name: string;
  assignee_type?: "user" | "group" | "role" | null;
  assignee_id?: string | null;
}

export interface ApprovalChainDefRead {
  id: string;
  workflow_id: string;
  name: string;
  description: string | null;
  on_approve_transition: string | null;
  on_reject_transition: string | null;
  levels: ApprovalLevelDefRead[];
  created_at: string;
}

export interface ApprovalChainDefCreate {
  name: string;
  description?: string | null;
  on_approve_transition?: string | null;
  on_reject_transition?: string | null;
  levels: ApprovalLevelDefCreate[];
}

export interface ApprovalChainDefUpdate {
  name?: string;
  description?: string | null;
  on_approve_transition?: string | null;
  on_reject_transition?: string | null;
  levels?: ApprovalLevelDefCreate[];
}

export interface ApprovalLevelResponseRead {
  id: string;
  chain_instance_id: string;
  level_order: number;
  actor_id: string | null;
  decision: "approved" | "rejected";
  comment: string | null;
  decided_at: string;
}

export interface ApprovalChainInstanceRead {
  id: string;
  chain_def_id: string;
  workflow_instance_id: string;
  current_level: number;
  status: "pending" | "approved" | "rejected";
  started_at: string;
  completed_at: string | null;
  responses: ApprovalLevelResponseRead[];
}

export interface ApprovalDecisionRequest {
  decision: "approved" | "rejected";
  comment?: string | null;
}

export interface EscalationLevelDef {
  level: 1 | 2;
  delay_seconds: number;
  assignee_type: "user" | "group" | null;
  assignee_id: string | null;
  message: string | null;
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
  escalation_levels: EscalationLevelDef[];
  assignee_type: "user" | "group" | "role" | null;
  assignee_id: string | null;
  approval_chain_id: string | null;
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
  escalation_levels?: EscalationLevelDef[];
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
  escalation_level: number | null;
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

// ------------------------------------------------------------------
// Approval chains — definitions
// ------------------------------------------------------------------

export async function listApprovalChains(
  appId: string,
  workflowId: string,
): Promise<ApprovalChainDefRead[]> {
  const { data } = await apiClient.get<ApprovalChainDefRead[]>(
    `/apps/${appId}/workflows/${workflowId}/approval-chains`,
  );
  return data;
}

export async function createApprovalChain(
  appId: string,
  workflowId: string,
  body: ApprovalChainDefCreate,
): Promise<ApprovalChainDefRead> {
  const { data } = await apiClient.post<ApprovalChainDefRead>(
    `/apps/${appId}/workflows/${workflowId}/approval-chains`,
    body,
  );
  return data;
}

export async function updateApprovalChain(
  appId: string,
  workflowId: string,
  chainId: string,
  body: ApprovalChainDefUpdate,
): Promise<ApprovalChainDefRead> {
  const { data } = await apiClient.patch<ApprovalChainDefRead>(
    `/apps/${appId}/workflows/${workflowId}/approval-chains/${chainId}`,
    body,
  );
  return data;
}

export async function deleteApprovalChain(
  appId: string,
  workflowId: string,
  chainId: string,
): Promise<void> {
  await apiClient.delete(`/apps/${appId}/workflows/${workflowId}/approval-chains/${chainId}`);
}

// ------------------------------------------------------------------
// TransitionDef
// ------------------------------------------------------------------

export interface TransitionDefRead {
  id: string;
  workflow_id: string;
  name: string;
  display_name: string;
  from_state: string;
  to_state: string;
  guard_conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  required_roles: string[];
}

export interface TransitionDefCreate {
  name: string;
  display_name: string;
  from_state: string;
  to_state: string;
  guard_conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
  required_roles?: string[];
}

export interface TransitionDefUpdate {
  display_name?: string;
  from_state?: string;
  to_state?: string;
  guard_conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
  required_roles?: string[];
}

export async function listTransitions(appId: string, workflowId: string): Promise<TransitionDefRead[]> {
  const { data } = await apiClient.get<TransitionDefRead[]>(
    `/apps/${appId}/workflows/${workflowId}/transitions`,
  );
  return data;
}

export async function createTransition(
  appId: string,
  workflowId: string,
  body: TransitionDefCreate,
): Promise<TransitionDefRead> {
  const { data } = await apiClient.post<TransitionDefRead>(
    `/apps/${appId}/workflows/${workflowId}/transitions`,
    body,
  );
  return data;
}

export async function updateTransition(
  appId: string,
  workflowId: string,
  transitionId: string,
  body: TransitionDefUpdate,
): Promise<TransitionDefRead> {
  const { data } = await apiClient.patch<TransitionDefRead>(
    `/apps/${appId}/workflows/${workflowId}/transitions/${transitionId}`,
    body,
  );
  return data;
}

export async function deleteTransition(
  appId: string,
  workflowId: string,
  transitionId: string,
): Promise<void> {
  await apiClient.delete(`/apps/${appId}/workflows/${workflowId}/transitions/${transitionId}`);
}

// ------------------------------------------------------------------
// Workflow instance runtime
// ------------------------------------------------------------------

export interface StartInstanceRequest {
  record_id: string;
  record_payload?: Record<string, unknown>;
}

export interface AvailableTransitionRead {
  name: string;
  display_name: string;
  to_state: string;
  requires_roles: string[];
}

export interface TransitionRequest {
  transition_name: string;
  record_payload?: Record<string, unknown>;
}

export interface TransitionResponse {
  instance: WorkflowInstanceRead;
  field_mutations: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  webhooks: Record<string, unknown>[];
  errors: string[];
}

export interface TransitionLogRead {
  id: string;
  instance_id: string;
  workflow_id: string;
  from_state: string | null;
  to_state: string;
  transition_id: string | null;
  actor_id: string | null;
  executed_at: string;
  duration_ms: number | null;
  error: string | null;
}

export async function startInstance(
  appId: string,
  workflowId: string,
  body: StartInstanceRequest,
): Promise<WorkflowInstanceRead> {
  const { data } = await apiClient.post<WorkflowInstanceRead>(
    `/apps/${appId}/workflows/${workflowId}/instances`,
    body,
  );
  return data;
}

export async function getAvailableTransitions(
  appId: string,
  workflowId: string,
  instanceId: string,
): Promise<AvailableTransitionRead[]> {
  const { data } = await apiClient.get<AvailableTransitionRead[]>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/transitions`,
  );
  return data;
}

export async function executeTransition(
  appId: string,
  workflowId: string,
  instanceId: string,
  body: TransitionRequest,
): Promise<TransitionResponse> {
  const { data } = await apiClient.post<TransitionResponse>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/transition`,
    body,
  );
  return data;
}

export async function cancelInstance(
  appId: string,
  workflowId: string,
  instanceId: string,
  reason?: string,
): Promise<WorkflowInstanceRead> {
  const { data } = await apiClient.post<WorkflowInstanceRead>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/cancel`,
    { reason: reason ?? null },
  );
  return data;
}

export async function getTransitionLog(
  appId: string,
  workflowId: string,
  instanceId: string,
  limit?: number,
): Promise<TransitionLogRead[]> {
  const { data } = await apiClient.get<TransitionLogRead[]>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/log`,
    { params: limit ? { limit } : undefined },
  );
  return data;
}

// ------------------------------------------------------------------
// Approval chain instances — runtime
// ------------------------------------------------------------------

export async function listChainInstances(
  appId: string,
  workflowId: string,
  instanceId: string,
): Promise<ApprovalChainInstanceRead[]> {
  const { data } = await apiClient.get<ApprovalChainInstanceRead[]>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/approval-chains`,
  );
  return data;
}

export async function decideChainLevel(
  appId: string,
  workflowId: string,
  instanceId: string,
  chainInstanceId: string,
  body: ApprovalDecisionRequest,
): Promise<ApprovalChainInstanceRead> {
  const { data } = await apiClient.post<ApprovalChainInstanceRead>(
    `/apps/${appId}/workflows/${workflowId}/instances/${instanceId}/approval-chains/${chainInstanceId}/decide`,
    body,
  );
  return data;
}
