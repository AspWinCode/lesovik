import { apiClient } from "./client";

export interface HealthStatus {
  status: "ok" | "degraded";
  version: string;
  checks: Record<string, { status: string; latency_ms?: number }>;
}

export interface ReadinessStatus {
  ready: boolean;
  database: { status: string; latency_ms?: number; detail?: string };
  redis: { status: string; latency_ms?: number; detail?: string };
}

export async function fetchHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>("/health");
  return data;
}

export async function fetchReadiness(): Promise<ReadinessStatus> {
  const { data } = await apiClient.get<ReadinessStatus>("/health/ready");
  return data;
}
