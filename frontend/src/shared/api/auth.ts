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

export async function ldapLogin(payload: { email: string; password: string }): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>("/auth/ldap-login", payload);
  return data;
}

export interface LdapStatus {
  enabled: boolean;
  url: string | null;
  search_base: string | null;
  bind_dn: string | null;
}

export async function fetchLdapStatus(): Promise<LdapStatus> {
  const { data } = await apiClient.get<LdapStatus>("/auth/ldap-status");
  return data;
}

export async function testLdapConnection(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const { data } = await apiClient.post<{ ok: boolean; message?: string; error?: string }>("/auth/ldap-test");
  return data;
}

export async function yandexCallback(code: string): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>("/auth/yandex/callback", { code });
  return data;
}

export async function vkCallback(code: string): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>("/auth/vk/callback", { code });
  return data;
}

export function getYandexAuthUrl(): string {
  return `${apiClient.defaults.baseURL ?? ""}/auth/yandex`;
}

export function getVkAuthUrl(): string {
  return `${apiClient.defaults.baseURL ?? ""}/auth/vk`;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout", { refresh_token: refreshToken });
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/users/me");
  return data;
}
