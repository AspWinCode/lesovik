import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  updateEmailTemplate,
  type EmailTemplateCreate,
  type EmailTemplateUpdate,
} from "@/shared/api/emailTemplates";

const KEYS = {
  all: ["email-templates"] as const,
};

export function useEmailTemplates() {
  return useQuery({ queryKey: KEYS.all, queryFn: listEmailTemplates });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailTemplateCreate) => createEmailTemplate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EmailTemplateUpdate }) =>
      updateEmailTemplate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: ({ id, context }: { id: string; context: Record<string, unknown> }) =>
      previewEmailTemplate(id, context),
  });
}
