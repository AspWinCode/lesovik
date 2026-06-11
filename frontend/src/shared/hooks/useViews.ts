import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPage,
  createView,
  deletePage,
  deleteView,
  listPages,
  listViews,
  publishPage,
  setDefaultView,
  unpublishPage,
  updatePage,
  updateView,
  type PageCreate,
  type PageRead,
  type PageUpdate,
  type ViewCreate,
  type ViewUpdate,
} from "../api/views";

const VIEWS_KEY = (appId: string, entityId: string) => ["views", appId, entityId] as const;
const PAGES_KEY = (appId: string) => ["pages", appId] as const;

/* ── Views ── */

export function useViews(appId: string | undefined, entityId: string | undefined) {
  return useQuery({
    queryKey: VIEWS_KEY(appId ?? "", entityId ?? ""),
    queryFn: () => listViews(appId!, entityId!),
    enabled: !!appId && !!entityId,
  });
}

export function useCreateView(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ViewCreate) => createView(appId, entityId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: VIEWS_KEY(appId, entityId) }); },
  });
}

export function useUpdateView(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ viewId, body }: { viewId: string; body: ViewUpdate }) =>
      updateView(appId, entityId, viewId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: VIEWS_KEY(appId, entityId) }); },
  });
}

export function useDeleteView(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) => deleteView(appId, entityId, viewId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: VIEWS_KEY(appId, entityId) }); },
  });
}

export function useSetDefaultView(appId: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) => setDefaultView(appId, entityId, viewId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: VIEWS_KEY(appId, entityId) }); },
  });
}

/* ── Pages ── */

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
    onSuccess: (updated: PageRead) => {
      qc.setQueryData(PAGES_KEY(appId), (old: PageRead[] | undefined) =>
        old ? old.map((p) => (p.id === updated.id ? updated : p)) : [updated],
      );
    },
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
