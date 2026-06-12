import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApp, deleteApp, listApps, publishApp, updateApp, type AppCreate, type AppUpdate } from "../api/apps";

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
