import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAllSessions,
  listUserSessions,
  terminateSession,
  terminateUserSessions,
} from "../api/sessions";
import { fetchSessionPolicy, updateSessionPolicy, type SessionPolicy } from "../api/auth";

export function useAllSessions() {
  return useQuery({ queryKey: ["sessions"], queryFn: () => listAllSessions(), staleTime: 10_000 });
}

export function useUserSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => listUserSessions(userId!),
    enabled: !!userId,
    staleTime: 10_000,
  });
}

export function useTerminateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: terminateSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useTerminateUserSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: terminateUserSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useSessionPolicy() {
  return useQuery({ queryKey: ["session-policy"], queryFn: fetchSessionPolicy });
}

export function useUpdateSessionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SessionPolicy>) => updateSessionPolicy(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session-policy"] }),
  });
}
