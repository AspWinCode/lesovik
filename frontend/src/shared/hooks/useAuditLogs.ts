import { useQuery } from "@tanstack/react-query";
import { listAuditLogs, type AuditLogParams } from "../api/auditlogs";

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => listAuditLogs(params),
    staleTime: 30_000,
  });
}
