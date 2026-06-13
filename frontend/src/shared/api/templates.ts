import { apiClient } from "./client";

export interface TemplateMeta {
  id: string;
  name: string;
}

export interface InstallResult {
  entities_created: number;
  pages_created: number;
}

export async function listTemplates(appId: string): Promise<TemplateMeta[]> {
  const { data } = await apiClient.get<TemplateMeta[]>(`/apps/${appId}/templates`);
  return data;
}

export async function installTemplate(
  appId: string,
  templateId: string,
): Promise<InstallResult> {
  const { data } = await apiClient.post<InstallResult>(
    `/apps/${appId}/templates/${templateId}/install`,
  );
  return data;
}
