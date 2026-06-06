import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  type RecordCreate,
  type RecordListParams,
  type RecordUpdate,
} from "../api/records";

const KEY = (appId: string, entityId: string) => ["records", appId, entityId] as const;

export function useRecords(
  appId: string | undefined,
  entityId: string | undefined,
  params?: RecordListParams,
) {
  return useQuery({
    queryKey: [...KEY(appId ?? "", entityId ?? ""), params],
    queryFn: () => listRecords(appId!, entityId!, params),
    enabled: !!appId && !!entityId,
  });
}

export function useCreateRecord(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordCreate) => createRecord(appId, entityId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId, entityId) }); },
  });
}

export function useUpdateRecord(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: RecordUpdate["payload"] }) =>
      updateRecord(appId, entityId, recordId, { payload }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId, entityId) }); },
  });
}

export function useDeleteRecord(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteRecord(appId, entityId, recordId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId, entityId) }); },
  });
}
