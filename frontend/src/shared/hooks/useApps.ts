import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApp, listApps, type AppCreate } from "../api/apps";

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APPS_KEY });
    },
  });
}
