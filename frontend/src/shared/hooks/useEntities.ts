import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntity,
  createField,
  deleteEntity,
  deleteField,
  listEntities,
  updateEntity,
  updateField,
  listRelations,
  createRelation,
  updateRelation,
  deleteRelation,
  type EntityCreate,
  type EntityUpdate,
  type FieldCreate,
  type FieldUpdate,
  type RelationCreate,
  type RelationUpdate,
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

const REL_KEY = (appId: string) => ["relations", appId] as const;

export function useRelations(appId: string | undefined) {
  return useQuery({
    queryKey: REL_KEY(appId ?? ""),
    queryFn: () => listRelations(appId!),
    enabled: !!appId,
  });
}

export function useCreateRelation(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RelationCreate) => createRelation(appId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REL_KEY(appId) });
      void qc.invalidateQueries({ queryKey: KEY(appId) });
    },
  });
}

export function useUpdateRelation(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ relationId, body }: { relationId: string; body: RelationUpdate }) =>
      updateRelation(appId, relationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REL_KEY(appId) });
      void qc.invalidateQueries({ queryKey: KEY(appId) });
    },
  });
}

export function useDeleteRelation(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) => deleteRelation(appId, relationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REL_KEY(appId) });
      void qc.invalidateQueries({ queryKey: KEY(appId) });
    },
  });
}
