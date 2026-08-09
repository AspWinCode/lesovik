import { useMutation } from "@tanstack/react-query";
import { exportFilingCases, type ExportFormat } from "@/shared/api/documents";

export function useExportFilingCases(appId: string) {
  return useMutation({
    mutationFn: (format: ExportFormat) => exportFilingCases(appId, format),
  });
}
