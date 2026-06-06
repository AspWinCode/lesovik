import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
  updateWebhook,
  type WebhookCreate,
  type WebhookUpdate,
} from "../api/webhooks";

const KEY = (appId: string) => ["webhooks", appId] as const;

export function useWebhooks(appId: string | undefined) {
  return useQuery({
    queryKey: KEY(appId ?? ""),
    queryFn: () => listWebhooks(appId!),
    enabled: !!appId,
  });
}

export function useCreateWebhook(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WebhookCreate) => createWebhook(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useUpdateWebhook(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ webhookId, body }: { webhookId: string; body: WebhookUpdate }) =>
      updateWebhook(appId, webhookId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}

export function useDeleteWebhook(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(appId, webhookId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY(appId) }); },
  });
}
