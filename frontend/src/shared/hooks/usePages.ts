import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPage,
  deletePage,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
  type PageCreate,
  type PageUpdate,
} from "../api/views";

const PAGES_KEY = (appId: string) => ["pages", appId] as const;

export function usePages(appId: string | undefined) {
  return useQuery({
    queryKey: PAGES_KEY(appId ?? ""),
    queryFn: () => listPages(appId!),
    enabled: !!appId,
  });
}

export function useCreatePage(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PageCreate) => createPage(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: PAGES_KEY(appId) }); },
  });
}

export function useUpdatePage(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, body }: { pageId: string; body: PageUpdate }) =>
      updatePage(appId, pageId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: PAGES_KEY(appId) }); },
  });
}

export function useDeletePage(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage(appId, pageId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: PAGES_KEY(appId) }); },
  });
}

export function usePublishPage(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => publishPage(appId, pageId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: PAGES_KEY(appId) }); },
  });
}

export function useUnpublishPage(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => unpublishPage(appId, pageId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: PAGES_KEY(appId) }); },
  });
}
