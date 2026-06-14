import { useQuery } from "@tanstack/react-query";
import { fetchReadiness } from "../api/health";

export function useHealth() {
  return useQuery({
    queryKey: ["health", "ready"],
    queryFn: fetchReadiness,
    refetchInterval: 30_000,
    retry: 2,
  });
}
