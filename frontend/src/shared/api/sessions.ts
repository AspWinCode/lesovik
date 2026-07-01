import { apiClient } from "./client";

export interface SessionInfo {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity_at: string | null;
  expires_at: string;
}

export async function listAllSessions(limit = 200): Promise<SessionInfo[]> {
  const { data } = await apiClient.get<SessionInfo[]>("/users/sessions", { params: { limit } });
  return data;
}

export async function listUserSessions(userId: string): Promise<SessionInfo[]> {
  const { data } = await apiClient.get<SessionInfo[]>(`/users/${userId}/sessions`);
  return data;
}

export async function terminateSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/users/sessions/${sessionId}`);
}

export async function terminateUserSessions(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/sessions`);
}
