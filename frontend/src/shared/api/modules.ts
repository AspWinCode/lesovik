import { apiClient } from "./client";

export interface ModuleRead {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  color: string | null;
  is_base: boolean;
  is_active: boolean;
  current_version: string | null;
  dependencies: string[];
  installed: boolean;
  installed_version: string | null;
  created_at: string;
}

export interface AppModuleRead {
  app_id: string;
  module_id: string;
  module_code: string;
  module_name: string;
  version: string;
  status: string;
  installed_at: string;
  installed_by: string | null;
}

export interface ModuleInstallResult {
  module: ModuleRead;
  installed_dependencies: string[];
  entities_created: number;
  fields_created: number;
  pages_created: number;
}

export async function listModules(appId?: string): Promise<ModuleRead[]> {
  const { data } = await apiClient.get<ModuleRead[]>("/modules", {
    params: appId ? { app_id: appId } : undefined,
  });
  return data;
}

export async function listAppModules(appId: string): Promise<AppModuleRead[]> {
  const { data } = await apiClient.get<AppModuleRead[]>(`/apps/${appId}/modules`);
  return data;
}

export async function installModule(appId: string, moduleCode: string): Promise<ModuleInstallResult> {
  const { data } = await apiClient.post<ModuleInstallResult>(
    `/apps/${appId}/modules/${moduleCode}/install`,
  );
  return data;
}

export async function uninstallModule(appId: string, moduleCode: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/modules/${moduleCode}`);
}
