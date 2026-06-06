import { http, HttpResponse } from "msw";
import type { App, CursorPage } from "@/shared/api/apps";
import type { CurrentUser, TokenPair } from "@/shared/api/auth";
import type { Rule } from "@/shared/api/rules";
import type { User, UserRole } from "@/shared/api/users";

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

/* ── Mock Users ── */
const MOCK_ROLES: UserRole[] = [
  { id: "platform_admin", display_name: "Platform Admin" },
  { id: "app_builder",    display_name: "App Builder" },
  { id: "auditor",        display_name: "Auditor" },
  { id: "viewer",         display_name: "Viewer" },
];

const mockUsers: User[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@nocode.local",
    display_name: "Platform Admin",
    is_active: true,
    is_superuser: true,
    totp_enabled: false,
    last_login_at: new Date().toISOString(),
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    roles: [{ id: "platform_admin", display_name: "Platform Admin" }],
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "ivan@mail.ru",
    display_name: "Иван Петров",
    is_active: true,
    is_superuser: false,
    totp_enabled: false,
    last_login_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    roles: [{ id: "app_builder", display_name: "App Builder" }],
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "anna@corp.ru",
    display_name: "Анна Соколова",
    is_active: true,
    is_superuser: false,
    totp_enabled: true,
    last_login_at: new Date(Date.now() - 1 * 86400_000).toISOString(),
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
    roles: [{ id: "app_builder", display_name: "App Builder" }, { id: "auditor", display_name: "Auditor" }],
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "dev@example.com",
    display_name: "Dev User",
    is_active: false,
    is_superuser: false,
    totp_enabled: false,
    last_login_at: null,
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    roles: [{ id: "viewer", display_name: "Viewer" }],
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "maria@mail.ru",
    display_name: "Мария Иванова",
    is_active: true,
    is_superuser: false,
    totp_enabled: false,
    last_login_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
    created_at: "2026-04-05T00:00:00Z",
    updated_at: "2026-04-05T00:00:00Z",
    roles: [{ id: "app_builder", display_name: "App Builder" }],
  },
];

const ENTITY_ID = "00000000-0000-0000-0000-000000000010";

const rules: Rule[] = [
  {
    id: "r1",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "insert",
    description: null,
    is_active: false,
    trigger: { event: "record.created", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 100,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r2",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "update",
    description: null,
    is_active: false,
    trigger: { event: "record.updated", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 100,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r3",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "delete",
    description: null,
    is_active: false,
    trigger: { event: "record.deleted", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 100,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r4",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "Отчет TG 2",
    description: null,
    is_active: true,
    trigger: { event: "record.created", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 90,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r5",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "(disable) Ошибка отчета",
    description: null,
    is_active: false,
    trigger: { event: "record.updated", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 80,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r6",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "New Bot 9",
    description: null,
    is_active: false,
    trigger: { event: "record.created", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 70,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r7",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "Аналитические таблицы",
    description: null,
    is_active: true,
    trigger: { event: "record.updated", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 60,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r8",
    app_id: apps[0].id,
    entity_id: ENTITY_ID,
    name: "New Bot 10",
    description: null,
    is_active: false,
    trigger: { event: "record.deleted", watch_fields: [] },
    conditions: {},
    actions: [],
    priority: 50,
    version: 1,
    created_by: MOCK_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
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

  // Rules (bots)
  http.get(`${API}/apps/:appId/rules`, () => HttpResponse.json(rules)),

  http.patch(`${API}/apps/:appId/rules/:ruleId`, async ({ params, request }) => {
    const idx = rules.findIndex((r) => r.id === params.ruleId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<Rule>;
    rules[idx] = { ...rules[idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(rules[idx]);
  }),

  http.delete(`${API}/apps/:appId/rules/:ruleId`, ({ params }) => {
    const idx = rules.findIndex((r) => r.id === params.ruleId);
    if (idx !== -1) rules.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/apps/:appId/rules/:ruleId/activate`, ({ params }) => {
    const rule = rules.find((r) => r.id === params.ruleId);
    if (!rule) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    rule.is_active = true;
    rule.updated_at = new Date().toISOString();
    return HttpResponse.json(rule);
  }),

  http.post(`${API}/apps/:appId/rules/:ruleId/deactivate`, ({ params }) => {
    const rule = rules.find((r) => r.id === params.ruleId);
    if (!rule) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    rule.is_active = false;
    rule.updated_at = new Date().toISOString();
    return HttpResponse.json(rule);
  }),

  // Users
  http.get(`${API}/users`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const isActive = url.searchParams.get("is_active");
    let result = [...mockUsers];
    if (search) result = result.filter(
      (u) => u.display_name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
    if (isActive !== null) result = result.filter((u) => u.is_active === (isActive === "true"));
    const page: CursorPage<User> = { items: result, next_cursor: null, has_more: false, total: result.length };
    return HttpResponse.json(page);
  }),

  http.get(`${API}/users/roles`, () => HttpResponse.json(MOCK_ROLES)),

  http.get(`${API}/users/:userId`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.userId);
    if (!user) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    return HttpResponse.json(user);
  }),

  http.patch(`${API}/users/:userId`, async ({ params, request }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.userId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<User>;
    mockUsers[idx] = { ...mockUsers[idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(mockUsers[idx]);
  }),

  http.delete(`${API}/users/:userId`, ({ params }) => {
    const idx = mockUsers.findIndex((u) => u.id === params.userId);
    if (idx !== -1) mockUsers[idx].is_active = false;
    return new HttpResponse(null, { status: 204 });
  }),
];
