import { http, HttpResponse } from "msw";
import type { App, CursorPage } from "@/shared/api/apps";
import type { CurrentUser, TokenPair } from "@/shared/api/auth";

/**
 * In-memory mock backend for local frontend dev without Docker.
 * Enabled only when VITE_USE_MOCKS=true (see src/mocks/browser.ts).
 * Accepts any non-empty credentials; rejects password "wrong" to demo errors.
 */

const API = "/api/v1";

const MOCK_USER: CurrentUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@nocode.local",
  display_name: "Platform Admin",
  is_active: true,
  is_superuser: true,
  totp_enabled: false,
  last_login_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  roles: [
    { id: "platform_admin", display_name: "Platform Admin" },
    { id: "app_builder", display_name: "App Builder" },
  ],
};

function makeApp(partial: Partial<App> & Pick<App, "slug" | "name">): App {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    description: null,
    icon: null,
    color: null,
    owner_id: MOCK_USER.id,
    is_published: false,
    is_archived: false,
    settings: {},
    version: 1,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

const apps: App[] = [
  makeApp({
    slug: "wild-siberia",
    name: "Дикая Сибирь",
    description: "Приложение для анализа и контроля физической нагрузки",
    is_published: false,
    updated_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
  }),
  makeApp({
    slug: "delivery-app",
    name: "Delivery App",
    description: "Сбор корзины, оформление заказа и доставка",
    is_published: true,
    updated_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
  }),
];

function tokenPair(): TokenPair {
  return {
    access_token: `mock-access-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
    token_type: "bearer",
    expires_in: 3600,
  };
}

export const handlers = [
  http.get(`${API}/health`, () =>
    HttpResponse.json({ status: "ok", version: "mock", checks: {} }),
  ),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }
    if (body.password === "wrong") {
      return HttpResponse.json({ detail: "Неверная почта или пароль" }, { status: 401 });
    }
    return HttpResponse.json(tokenPair());
  }),

  http.post(`${API}/auth/refresh`, () => HttpResponse.json(tokenPair())),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/users/me`, () => HttpResponse.json(MOCK_USER)),

  http.get(`${API}/apps`, () => {
    const page: CursorPage<App> = {
      items: apps,
      next_cursor: null,
      has_more: false,
      total: apps.length,
    };
    return HttpResponse.json(page);
  }),

  http.post(`${API}/apps`, async ({ request }) => {
    const body = (await request.json()) as { slug: string; name: string; description?: string | null };
    const created = makeApp({ slug: body.slug, name: body.name, description: body.description ?? null });
    apps.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
];
