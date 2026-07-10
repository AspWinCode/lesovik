import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateWorkflow,
  assignInstance,
  createState,
  createWorkflow,
  deactivateWorkflow,
  deleteState,
  deleteWorkflow,
  listInstances,
  listStates,
  listWorkflows,
  updateState,
  updateWorkflow,
  type AssignInstanceRequest,
  type StateDefCreate,
  type StateDefUpdate,
  type WorkflowDefCreate,
  type WorkflowDefUpdate,
} from "../api/workflows";

const WF_KEY = (appId: string) => ["workflows", appId] as const;
const STATES_KEY = (appId: string, workflowId: string) => ["workflow-states", appId, workflowId] as const;
const INSTANCES_KEY = (appId: string, workflowId: string) => ["workflow-instances", appId, workflowId] as const;

export function useWorkflows(appId: string | undefined, entityId?: string) {
  return useQuery({
    queryKey: [...WF_KEY(appId ?? ""), entityId],
    queryFn: () => listWorkflows(appId!, entityId ? { entity_id: entityId } : undefined),
    enabled: !!appId,
  });
}

export function useCreateWorkflow(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkflowDefCreate) => createWorkflow(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WF_KEY(appId) }); },
  });
}

export function useUpdateWorkflow(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, body }: { workflowId: string; body: WorkflowDefUpdate }) =>
      updateWorkflow(appId, workflowId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WF_KEY(appId) }); },
  });
}

export function useDeleteWorkflow(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => deleteWorkflow(appId, workflowId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WF_KEY(appId) }); },
  });
}

export function useActivateWorkflow(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => activateWorkflow(appId, workflowId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WF_KEY(appId) }); },
  });
}

export function useDeactivateWorkflow(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => deactivateWorkflow(appId, workflowId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WF_KEY(appId) }); },
  });
}

export function useWorkflowStates(appId: string | undefined, workflowId: string | undefined) {
  return useQuery({
    queryKey: STATES_KEY(appId ?? "", workflowId ?? ""),
    queryFn: () => listStates(appId!, workflowId!),
    enabled: !!appId && !!workflowId,
  });
}

export function useCreateState(appId: string, workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StateDefCreate) => createState(appId, workflowId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: STATES_KEY(appId, workflowId) }); },
  });
}

export function useUpdateState(appId: string, workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stateId, body }: { stateId: string; body: StateDefUpdate }) =>
      updateState(appId, workflowId, stateId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: STATES_KEY(appId, workflowId) }); },
  });
}

export function useDeleteState(appId: string, workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stateId: string) => deleteState(appId, workflowId, stateId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: STATES_KEY(appId, workflowId) }); },
  });
}

export function useWorkflowInstances(
  appId: string | undefined,
  workflowId: string | undefined,
  recordId?: string,
) {
  return useQuery({
    queryKey: [...INSTANCES_KEY(appId ?? "", workflowId ?? ""), recordId],
    queryFn: () => listInstances(appId!, workflowId!, recordId ? { record_id: recordId } : undefined),
    enabled: !!appId && !!workflowId,
  });
}

export function useAssignInstance(appId: string, workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, body }: { instanceId: string; body: AssignInstanceRequest }) =>
      assignInstance(appId, workflowId, instanceId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: INSTANCES_KEY(appId, workflowId) }); },
  });
}
