import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePermission,
  listPermissions,
  replacePermissions,
  type FieldPermissionUpsert,
} from "../api/permissions";

function permKey(appId: string, entityId: string) {
  return ["permissions", appId, entityId] as const;
}

export function usePermissions(appId: string | undefined, entityId: string | undefined) {
  return useQuery({
    queryKey: ["permissions", appId, entityId],
    queryFn: () => listPermissions(appId!, entityId!),
    enabled: !!appId && !!entityId,
  });
}

export function useReplacePermissions(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissions: FieldPermissionUpsert[]) =>
      replacePermissions(appId, entityId, permissions),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: permKey(appId, entityId) });
    },
  });
}

export function useDeletePermission(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permId: string) => deletePermission(appId, entityId, permId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: permKey(appId, entityId) });
    },
  });
}
