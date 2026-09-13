import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  listCategories,
  updateArticle,
  uploadArticleImage,
  type ArticleCreate,
  type ArticleUpdate,
} from "../api/knowledge";

const LIST_KEY = ["kb-articles"] as const;

export function useArticles(params?: { category?: string; q?: string }) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => listArticles(params),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["kb-categories"],
    queryFn: () => listCategories(),
  });
}

export function useArticle(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["kb-article", idOrSlug],
    queryFn: () => getArticle(idOrSlug!),
    enabled: !!idOrSlug,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ArticleCreate) => createArticle(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIST_KEY }); },
  });
}

export function useUpdateArticle(idOrSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ArticleUpdate) => updateArticle(idOrSlug, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: ["kb-article", idOrSlug] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idOrSlug: string) => deleteArticle(idOrSlug),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: LIST_KEY }); },
  });
}

export function useUploadArticleImage() {
  return useMutation({
    mutationFn: ({ file, articleId }: { file: File; articleId?: string }) =>
      uploadArticleImage(file, articleId),
  });
}
