import { apiClient } from "./client";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type DocType = "incoming" | "outgoing" | "internal";

export interface DocTypeConfig {
  doc_type: DocType;
  prefix: string;
  suffix: string;
  include_department: boolean;
  seq_padding: number;
  reset_period: "never" | "yearly" | "monthly";
}

export interface DocTypeConfigUpdate {
  prefix?: string;
  suffix?: string;
  include_department?: boolean;
  seq_padding?: number;
  reset_period?: "never" | "yearly" | "monthly";
}

export interface RegisterDocumentRequest {
  entity_id: string;
  record_id: string;
  doc_type: DocType;
  department_code?: string | null;
  filing_case_id?: string | null;
}

export interface DocumentRegistration {
  id: string;
  entity_id: string;
  record_id: string;
  doc_type: DocType;
  department_code: string | null;
  registration_no: string;
  filing_case_id: string | null;
  registered_by: string | null;
  registered_at: string;
}

export interface FilingCase {
  id: string;
  parent_id: string | null;
  index_code: string;
  title: string;
  retention_years: number | null;
  storage_location: string | null;
  status: "open" | "closed" | "archived";
  close_by: string | null;
  closed_at: string | null;
  responsible_user_id: string | null;
  created_at: string;
}

export interface FilingCaseCreate {
  index_code: string;
  title: string;
  parent_id?: string | null;
  retention_years?: number | null;
  storage_location?: string | null;
  close_by?: string | null;
  responsible_user_id?: string | null;
}

export interface FilingCaseUpdate {
  title?: string;
  retention_years?: number | null;
  storage_location?: string | null;
  status?: "open" | "closed" | "archived";
  close_by?: string | null;
  responsible_user_id?: string | null;
}

export async function listDocTypeConfigs(appId: string): Promise<DocTypeConfig[]> {
  const { data } = await apiClient.get<DocTypeConfig[]>(`/apps/${appId}/documents/doc-types`);
  return data;
}

export async function updateDocTypeConfig(appId: string, docType: DocType, body: DocTypeConfigUpdate): Promise<DocTypeConfig> {
  const { data } = await apiClient.put<DocTypeConfig>(`/apps/${appId}/documents/doc-types/${docType}`, body);
  return data;
}

export async function registerDocument(appId: string, body: RegisterDocumentRequest): Promise<DocumentRegistration> {
  const { data } = await apiClient.post<DocumentRegistration>(`/apps/${appId}/documents/register`, body);
  return data;
}

export async function listRegistrations(appId: string, params?: { doc_type?: DocType }): Promise<DocumentRegistration[]> {
  const { data } = await apiClient.get<DocumentRegistration[]>(`/apps/${appId}/documents/registrations`, { params });
  return data;
}

export async function listFilingCases(appId: string): Promise<FilingCase[]> {
  const { data } = await apiClient.get<FilingCase[]>(`/apps/${appId}/documents/filing-cases`);
  return data;
}

export async function createFilingCase(appId: string, body: FilingCaseCreate): Promise<FilingCase> {
  const { data } = await apiClient.post<FilingCase>(`/apps/${appId}/documents/filing-cases`, body);
  return data;
}

export async function updateFilingCase(appId: string, caseId: string, body: FilingCaseUpdate): Promise<FilingCase> {
  const { data } = await apiClient.patch<FilingCase>(`/apps/${appId}/documents/filing-cases/${caseId}`, body);
  return data;
}

export async function deleteFilingCase(appId: string, caseId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/documents/filing-cases/${caseId}`);
}

export async function exportFilingCases(appId: string, format: ExportFormat = "csv"): Promise<void> {
  const response = await apiClient.get(
    `/apps/${appId}/documents/filing-cases/export`,
    { params: { format }, responseType: "blob" },
  );

  const mimeTypes: Record<ExportFormat, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };

  const blob = new Blob([response.data as BlobPart], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `filing_cases.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
