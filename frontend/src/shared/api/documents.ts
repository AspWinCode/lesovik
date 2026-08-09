import { apiClient } from "./client";

export type ExportFormat = "csv" | "xlsx" | "pdf";

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
