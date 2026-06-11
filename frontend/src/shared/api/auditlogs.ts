import { apiClient } from "./client";

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  level: "info" | "warn" | "error";
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogParams {
  limit?: number;
  offset?: number;
  level?: string;
  action?: string;
}

export async function listAuditLogs(params?: AuditLogParams): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>("/users/audit-logs", { params });
  return data;
}
