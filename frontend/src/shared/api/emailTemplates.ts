import { apiClient } from "./client";

export interface TemplateVariable {
  name: string;
  type: string;
  description: string | null;
  example: string | null;
}

export interface EmailTemplateRead {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  variables: TemplateVariable[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateCreate {
  code: string;
  name: string;
  description?: string | null;
  subject: string;
  body_html: string;
  body_text?: string | null;
  variables?: TemplateVariable[];
}

export interface EmailTemplateUpdate {
  name?: string;
  description?: string | null;
  subject?: string;
  body_html?: string;
  body_text?: string | null;
  variables?: TemplateVariable[];
}

export interface EmailTemplatePreviewResponse {
  subject: string;
  body_html: string;
  body_text: string | null;
}

export async function listEmailTemplates(): Promise<EmailTemplateRead[]> {
  const { data } = await apiClient.get<EmailTemplateRead[]>("/email-templates");
  return data;
}

export async function createEmailTemplate(body: EmailTemplateCreate): Promise<EmailTemplateRead> {
  const { data } = await apiClient.post<EmailTemplateRead>("/email-templates", body);
  return data;
}

export async function updateEmailTemplate(id: string, body: EmailTemplateUpdate): Promise<EmailTemplateRead> {
  const { data } = await apiClient.patch<EmailTemplateRead>(`/email-templates/${id}`, body);
  return data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiClient.delete(`/email-templates/${id}`);
}

export async function previewEmailTemplate(
  id: string,
  context: Record<string, unknown>,
): Promise<EmailTemplatePreviewResponse> {
  const { data } = await apiClient.post<EmailTemplatePreviewResponse>(
    `/email-templates/${id}/preview`,
    { context },
  );
  return data;
}
