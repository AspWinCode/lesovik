import { apiClient } from "./client";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
  totp_code?: string;
}

export interface Role {
  id: string;
  display_name: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_superuser: boolean;
  totp_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export async function login(payload: LoginPayload): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>("/auth/login", payload);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout", { refresh_token: refreshToken });
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/users/me");
  return data;
}
