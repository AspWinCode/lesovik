import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAppMember,
  cloneApp,
  createApp,
  createSnapshot,
  deleteApp,
  listAppMembers,
  listApps,
  listSnapshots,
  publishApp,
  removeAppMember,
  rollbackSnapshot,
  updateApp,
  type AppCloneCreate,
  type AppCreate,
  type AppUpdate,
} from "../api/apps";

const APPS_KEY = ["apps"] as const;

export function useApps() {
  return useQuery({
    queryKey: APPS_KEY,
    queryFn: () => listApps(),
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AppCreate) => createApp(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: APPS_KEY }); },
  });
}

export function useUpdateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, body }: { appId: string; body: AppUpdate }) => updateApp(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: APPS_KEY }); },
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => deleteApp(appId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: APPS_KEY }); },
  });
}

export function usePublishApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => publishApp(appId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: APPS_KEY }); },
  });
}

export function useCloneApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, body }: { appId: string; body: AppCloneCreate }) =>
      cloneApp(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: APPS_KEY }); },
  });
}

export function useAppSnapshots(appId: string | null | undefined) {
  return useQuery({
    queryKey: ["app-snapshots", appId],
    queryFn: () => listSnapshots(appId!),
    enabled: !!appId,
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, comment }: { appId: string; comment?: string | null }) =>
      createSnapshot(appId, comment),
    onSuccess: (_, { appId }) => {
      void qc.invalidateQueries({ queryKey: ["app-snapshots", appId] });
    },
  });
}

export function useRollbackSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, snapshotNum }: { appId: string; snapshotNum: number }) =>
      rollbackSnapshot(appId, snapshotNum),
    onSuccess: (_, { appId }) => {
      void qc.invalidateQueries({ queryKey: APPS_KEY });
      void qc.invalidateQueries({ queryKey: ["app-snapshots", appId] });
    },
  });
}

export function useAppMembers(appId: string | null | undefined) {
  return useQuery({
    queryKey: ["app-members", appId],
    queryFn: () => listAppMembers(appId!),
    enabled: !!appId,
  });
}

export function useAddAppMember(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      addAppMember(appId, userId, role),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["app-members", appId] }); },
  });
}

export function useRemoveAppMember(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeAppMember(appId, userId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["app-members", appId] }); },
  });
}
