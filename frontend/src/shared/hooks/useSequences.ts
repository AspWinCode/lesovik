import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSequence,
  deleteSequence,
  getSequence,
  listSequences,
  previewNextSequenceValue,
  updateSequence,
  type SequenceCreate,
  type SequenceUpdate,
} from "../api/sequences";

const SEQ_KEY = (appId: string, entityId: string) =>
  ["sequences", appId, entityId] as const;

export function useSequences(appId: string | undefined, entityId: string | undefined) {
  return useQuery({
    queryKey: SEQ_KEY(appId ?? "", entityId ?? ""),
    queryFn: () => listSequences(appId!, entityId!),
    enabled: !!appId && !!entityId,
  });
}

export function useSequence(
  appId: string | undefined,
  entityId: string | undefined,
  sequenceId: string | undefined,
) {
  return useQuery({
    queryKey: ["sequence", appId, entityId, sequenceId],
    queryFn: () => getSequence(appId!, entityId!, sequenceId!),
    enabled: !!appId && !!entityId && !!sequenceId,
  });
}

export function useCreateSequence(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SequenceCreate) => createSequence(appId, entityId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SEQ_KEY(appId, entityId) }); },
  });
}

export function useUpdateSequence(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, body }: { sequenceId: string; body: SequenceUpdate }) =>
      updateSequence(appId, entityId, sequenceId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SEQ_KEY(appId, entityId) }); },
  });
}

export function useDeleteSequence(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: string) => deleteSequence(appId, entityId, sequenceId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SEQ_KEY(appId, entityId) }); },
  });
}

export function usePreviewNextSequenceValue(appId: string, entityId: string) {
  return useMutation({
    mutationFn: (sequenceId: string) => previewNextSequenceValue(appId, entityId, sequenceId),
  });
}
