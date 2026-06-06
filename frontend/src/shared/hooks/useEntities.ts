import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntity,
  createField,
  deleteEntity,
  deleteField,
  listEntities,
  updateEntity,
  updateField,
  type EntityCreate,
  type EntityUpdate,
  type FieldCreate,
  type FieldUpdate,
} from "../api/entities";

const KEY = (appId: string) => ["entities", appId] as const;

export function useEntities(appId: string | undefined) {
  return useQuery({
    queryKey: KEY(appId ?? ""),
    queryFn: () => listEntities(appId!),
    enabled: !!appId,
  });
}

export function useCreateEntity(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EntityCreate) => createEntity(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useUpdateEntity(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, body }: { entityId: string; body: EntityUpdate }) =>
      updateEntity(appId, entityId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useDeleteEntity(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => deleteEntity(appId, entityId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useCreateField(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, body }: { entityId: string; body: FieldCreate }) =>
      createField(appId, entityId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useUpdateField(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityId,
      fieldId,
      body,
    }: {
      entityId: string;
      fieldId: string;
      body: FieldUpdate;
    }) => updateField(appId, entityId, fieldId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useDeleteField(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, fieldId }: { entityId: string; fieldId: string }) =>
      deleteField(appId, entityId, fieldId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}
