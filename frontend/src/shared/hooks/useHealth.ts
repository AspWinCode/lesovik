import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchReadiness } from "../api/health";

export function useHealth() {
  return useQuery({
    queryKey: ["health", "ready"],
    queryFn: fetchReadiness,
    refetchInterval: 30_000,
    retry: 2,
  });
}

export function useFullHealth() {
  return useQuery({
    queryKey: ["health", "full"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 2,
  });
}
