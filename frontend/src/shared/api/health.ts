import { apiClient } from "./client";

export interface HealthStatus {
  status: "ok" | "degraded";
  version: string;
  checks: Record<string, { status: string; latency_ms?: number }>;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>("/health");
  return data;
}
