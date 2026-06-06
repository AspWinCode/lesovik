import { apiClient } from "./client";

export interface WebhookRead {
  id: string;
  app_id: string;
  name: string;
  target_url: string;
  events: string[];
  is_active: boolean;
  custom_headers: Record<string, string>;
  timeout_seconds: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreateResponse extends WebhookRead {
  secret: string;
}

export interface WebhookCreate {
  name: string;
  target_url: string;
  events?: string[];
  custom_headers?: Record<string, string>;
  timeout_seconds?: number;
  max_retries?: number;
}

export interface WebhookUpdate {
  name?: string;
  target_url?: string;
  events?: string[];
  is_active?: boolean;
  custom_headers?: Record<string, string>;
  timeout_seconds?: number;
  max_retries?: number;
}

export async function listWebhooks(appId: string): Promise<WebhookRead[]> {
  const { data } = await apiClient.get<WebhookRead[]>(`/apps/${appId}/webhooks`);
  return data;
}

export async function createWebhook(appId: string, body: WebhookCreate): Promise<WebhookCreateResponse> {
  const { data } = await apiClient.post<WebhookCreateResponse>(`/apps/${appId}/webhooks`, body);
  return data;
}

export async function updateWebhook(
  appId: string,
  webhookId: string,
  body: WebhookUpdate,
): Promise<WebhookRead> {
  const { data } = await apiClient.patch<WebhookRead>(`/apps/${appId}/webhooks/${webhookId}`, body);
  return data;
}

export async function deleteWebhook(appId: string, webhookId: string): Promise<void> {
  await apiClient.delete(`/apps/${appId}/webhooks/${webhookId}`);
}
