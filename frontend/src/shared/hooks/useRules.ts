import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateRule,
  createRule,
  deactivateRule,
  deleteRule,
  listRules,
  updateRule,
  type RuleCreate,
  type RuleUpdate,
} from "../api/rules";

function rulesKey(appId: string) {
  return ["rules", appId] as const;
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
