import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecord,
  deleteRecord,
  exportRecords,
  listRecords,
  restoreRecord,
  updateRecord,
  type RecordCreate,
  type RecordListParams,
  type RecordUpdate,
} from "../api/records";

const KEY = (appId: string, entityId: string) => ["records", appId, entityId] as const;
const TRASH_KEY = (appId: string, entityId: string) => ["records-trash", appId, entityId] as const;

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

export function useTrashRecords(
  appId: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: TRASH_KEY(appId ?? "", entityId ?? ""),
    queryFn: async () => {
      const page = await listRecords(appId!, entityId!, { include_deleted: true, limit: 200 });
      return { ...page, items: page.items.filter((r) => r.is_deleted) };
    },
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
    mutationFn: (recordId: string) => deleteRecord(appId, entityId, recordId, false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY(appId, entityId) });
      void qc.invalidateQueries({ queryKey: TRASH_KEY(appId, entityId) });
    },
  });
}

export function useHardDeleteRecord(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteRecord(appId, entityId, recordId, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TRASH_KEY(appId, entityId) });
    },
  });
}

export function useRestoreRecord(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => restoreRecord(appId, entityId, recordId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY(appId, entityId) });
      void qc.invalidateQueries({ queryKey: TRASH_KEY(appId, entityId) });
    },
  });
}

export function useExportRecords(appId: string, entityId: string) {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" | "pdf") => {
      const blob = await exportRecords(appId, entityId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
