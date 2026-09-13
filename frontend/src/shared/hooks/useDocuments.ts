import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  exportFilingCases,
  listDocTypeConfigs, updateDocTypeConfig,
  registerDocument, listRegistrations,
  listFilingCases, createFilingCase, updateFilingCase, deleteFilingCase,
  type ExportFormat, type DocType, type DocTypeConfigUpdate,
  type RegisterDocumentRequest, type FilingCaseCreate, type FilingCaseUpdate,
} from "@/shared/api/documents";

export function useExportFilingCases(appId: string) {
  return useMutation({
    mutationFn: (format: ExportFormat) => exportFilingCases(appId, format),
  });
}

export function useDocTypeConfigs(appId: string | undefined) {
  return useQuery({
    queryKey: ["doc-type-configs", appId],
    queryFn: () => listDocTypeConfigs(appId!),
    enabled: !!appId,
  });
}

export function useUpdateDocTypeConfig(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, body }: { docType: DocType; body: DocTypeConfigUpdate }) =>
      updateDocTypeConfig(appId, docType, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["doc-type-configs", appId] }); },
  });
}

export function useRegisterDocument(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterDocumentRequest) => registerDocument(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["document-registrations", appId] }); },
  });
}

export function useRegistrations(appId: string | undefined, docType?: DocType) {
  return useQuery({
    queryKey: ["document-registrations", appId, docType],
    queryFn: () => listRegistrations(appId!, docType ? { doc_type: docType } : undefined),
    enabled: !!appId,
  });
}

export function useFilingCases(appId: string | undefined) {
  return useQuery({
    queryKey: ["filing-cases", appId],
    queryFn: () => listFilingCases(appId!),
    enabled: !!appId,
  });
}

export function useCreateFilingCase(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FilingCaseCreate) => createFilingCase(appId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["filing-cases", appId] }); },
  });
}

export function useUpdateFilingCase(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, body }: { caseId: string; body: FilingCaseUpdate }) =>
      updateFilingCase(appId, caseId, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["filing-cases", appId] }); },
  });
}

export function useDeleteFilingCase(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => deleteFilingCase(appId, caseId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["filing-cases", appId] }); },
  });
}
