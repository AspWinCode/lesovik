import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateRule,
  addStep,
  createRule,
  deactivateRule,
  deleteRule,
  deleteStep,
  listRules,
  listSteps,
  reorderSteps,
  updateRule,
  updateStep,
  type ProcessStepCreate,
  type ProcessStepUpdate,
  type RuleCreate,
  type RuleUpdate,
} from "../api/rules";

function rulesKey(appId: string) {
  return ["rules", appId] as const;
}

function stepsKey(appId: string, ruleId: string) {
  return ["steps", appId, ruleId] as const;
}

export function useRules(appId: string | undefined) {
  return useQuery({
    queryKey: ["rules", appId],
    queryFn: () => listRules(appId!),
    enabled: !!appId,
  });
}

export function useActivateRule(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => activateRule(appId, ruleId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: rulesKey(appId) }); },
  });
}

export function useDeactivateRule(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deactivateRule(appId, ruleId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: rulesKey(appId) }); },
  });
}

export function useDeleteRule(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deleteRule(appId, ruleId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: rulesKey(appId) }); },
  });
}

export function useUpdateRule(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, body }: { ruleId: string; body: RuleUpdate }) =>
      updateRule(appId, ruleId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: rulesKey(appId) }); },
  });
}

export function useCreateRule(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RuleCreate) => createRule(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: rulesKey(appId) }); },
  });
}

/* ── Process steps ── */

export function useSteps(appId: string | undefined, ruleId: string | undefined) {
  return useQuery({
    queryKey: ["steps", appId, ruleId],
    queryFn: () => listSteps(appId!, ruleId!),
    enabled: !!appId && !!ruleId,
  });
}

export function useAddStep(appId: string, ruleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProcessStepCreate) => addStep(appId, ruleId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: stepsKey(appId, ruleId) }); },
  });
}

export function useUpdateStep(appId: string, ruleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, body }: { stepId: string; body: ProcessStepUpdate }) =>
      updateStep(appId, ruleId, stepId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: stepsKey(appId, ruleId) }); },
  });
}

export function useDeleteStep(appId: string, ruleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) => deleteStep(appId, ruleId, stepId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: stepsKey(appId, ruleId) }); },
  });
}

export function useReorderSteps(appId: string, ruleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepIds: string[]) => reorderSteps(appId, ruleId, stepIds),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: stepsKey(appId, ruleId) }); },
  });
}
