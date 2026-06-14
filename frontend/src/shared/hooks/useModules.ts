import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { installModule, listModules, uninstallModule } from "../api/modules";

export const modulesKey = (appId?: string) => ["modules", appId ?? "catalog"] as const;

export function useModules(appId?: string) {
  return useQuery({
    queryKey: modulesKey(appId),
    queryFn: () => listModules(appId),
  });
}

export function useInstallModule(appId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleCode: string) => {
      if (!appId) throw new Error("No active app selected");
      return installModule(appId, moduleCode);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: modulesKey(appId) });
      void qc.invalidateQueries({ queryKey: ["entities"] });
      void qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

export function useUninstallModule(appId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleCode: string) => {
      if (!appId) throw new Error("No active app selected");
      return uninstallModule(appId, moduleCode);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: modulesKey(appId) });
    },
  });
}
