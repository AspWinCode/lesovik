import { http, HttpResponse } from "msw";
import type { App, CursorPage } from "@/shared/api/apps";
import type { CurrentUser, TokenPair } from "@/shared/api/auth";
import type { EntityRead, FieldRead } from "@/shared/api/entities";
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

/* ── Mock Entities ── */
function makeField(
  partial: Partial<FieldRead> & Pick<FieldRead, "id" | "entity_id" | "app_id" | "name" | "display_name" | "field_type" | "display_order">
): FieldRead {
  const now = new Date().toISOString();
  return {
    is_required: false, is_unique: false, is_system: false, is_indexed: false,
    default_value: null, validation_rules: {}, field_options: {},
    created_at: now, updated_at: now,
    ...partial,
  };
}

const ENTITY_ID = "00000000-0000-0000-0000-000000000010";

function buildEntities(appId: string): EntityRead[] {
  const now = new Date().toISOString();
  const e1Id = ENTITY_ID;
  const e2Id = "00000000-0000-0000-0000-000000000011";
  const e3Id = "00000000-0000-0000-0000-000000000012";

  return [
    {
      id: e1Id, app_id: appId, slug: "analytics", display_name: "Аналитика",
      name_plural: null, description: null, icon: null, color: null,
      settings: {}, is_system: false, field_order: [],
      created_at: now, updated_at: now,
      fields: [
        makeField({ id: "f1", entity_id: e1Id, app_id: appId, name: "_row_number", display_name: "_RowNumber", field_type: "number", display_order: 0, is_system: true, is_unique: true }),
        makeField({ id: "f2", entity_id: e1Id, app_id: appId, name: "row_id",      display_name: "Row ID",     field_type: "text",   display_order: 1, is_system: true, is_unique: true }),
        makeField({ id: "f3", entity_id: e1Id, app_id: appId, name: "module",      display_name: "Модуль",     field_type: "text",   display_order: 2, is_required: true }),
        makeField({ id: "f4", entity_id: e1Id, app_id: appId, name: "view",        display_name: "Вид",        field_type: "select", display_order: 3 }),
        makeField({ id: "f5", entity_id: e1Id, app_id: appId, name: "status",      display_name: "Статус",     field_type: "select", display_order: 4 }),
      ],
    },
    {
      id: e2Id, app_id: appId, slug: "audit", display_name: "Аудит",
      name_plural: null, description: null, icon: null, color: null,
      settings: {}, is_system: false, field_order: [],
      created_at: now, updated_at: now,
      fields: [
        makeField({ id: "f10", entity_id: e2Id, app_id: appId, name: "_row_number", display_name: "_RowNumber", field_type: "number", display_order: 0, is_system: true }),
        makeField({ id: "f11", entity_id: e2Id, app_id: appId, name: "action",      display_name: "Действие",   field_type: "text",   display_order: 1, is_required: true }),
        makeField({ id: "f12", entity_id: e2Id, app_id: appId, name: "user_id",     display_name: "Пользователь", field_type: "relation", display_order: 2 }),
        makeField({ id: "f13", entity_id: e2Id, app_id: appId, name: "created_at",  display_name: "Создан",     field_type: "datetime", display_order: 3, is_system: true }),
      ],
    },
    {
      id: e3Id, app_id: appId, slug: "main_menu", display_name: "Главное меню",
      name_plural: null, description: null, icon: null, color: null,
      settings: {}, is_system: false, field_order: [],
      created_at: now, updated_at: now,
      fields: [
        makeField({ id: "f20", entity_id: e3Id, app_id: appId, name: "_row_number", display_name: "_RowNumber", field_type: "number", display_order: 0, is_system: true }),
        makeField({ id: "f21", entity_id: e3Id, app_id: appId, name: "label",       display_name: "Название",   field_type: "text",   display_order: 1, is_required: true }),
        makeField({ id: "f22", entity_id: e3Id, app_id: appId, name: "icon",        display_name: "Иконка",     field_type: "image",  display_order: 2 }),
        makeField({ id: "f23", entity_id: e3Id, app_id: appId, name: "route",       display_name: "Маршрут",    field_type: "url",    display_order: 3 }),
      ],
    },
  ];
}

/* entities is keyed by appId */
const entitiesByApp: Record<string, EntityRead[]> = {};

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

  // Entities
  http.get(`${API}/apps/:appId/entities`, ({ params }) => {
    const appId = params.appId as string;
    if (!entitiesByApp[appId]) entitiesByApp[appId] = buildEntities(appId);
    return HttpResponse.json(entitiesByApp[appId]);
  }),

  http.post(`${API}/apps/:appId/entities`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!entitiesByApp[appId]) entitiesByApp[appId] = buildEntities(appId);
    const body = (await request.json()) as { slug: string; display_name: string; [k: string]: unknown };
    const now = new Date().toISOString();
    const entity: EntityRead = {
      id: crypto.randomUUID(), app_id: appId,
      slug: body.slug, display_name: body.display_name,
      name_plural: null, description: null, icon: null, color: null,
      settings: {}, is_system: false, field_order: [], fields: [],
      created_at: now, updated_at: now,
    };
    entitiesByApp[appId].push(entity);
    return HttpResponse.json(entity, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/entities/:entityId`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!entitiesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = entitiesByApp[appId].findIndex((e) => e.id === params.entityId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<EntityRead>;
    entitiesByApp[appId][idx] = { ...entitiesByApp[appId][idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(entitiesByApp[appId][idx]);
  }),

  http.delete(`${API}/apps/:appId/entities/:entityId`, ({ params }) => {
    const appId = params.appId as string;
    if (entitiesByApp[appId]) {
      const idx = entitiesByApp[appId].findIndex((e) => e.id === params.entityId);
      if (idx !== -1) entitiesByApp[appId].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Fields
  http.post(`${API}/apps/:appId/entities/:entityId/fields`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!entitiesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const entity = entitiesByApp[appId].find((e) => e.id === params.entityId);
    if (!entity) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as { name: string; display_name: string; field_type: string; [k: string]: unknown };
    const now = new Date().toISOString();
    const field: FieldRead = {
      id: crypto.randomUUID(), entity_id: entity.id, app_id: appId,
      name: body.name, display_name: body.display_name,
      field_type: body.field_type as FieldRead["field_type"],
      is_required: false, is_unique: false, is_system: false, is_indexed: false,
      default_value: null, validation_rules: {}, field_options: {},
      display_order: entity.fields.length,
      created_at: now, updated_at: now,
    };
    entity.fields.push(field);
    return HttpResponse.json(field, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/entities/:entityId/fields/:fieldId`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!entitiesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const entity = entitiesByApp[appId].find((e) => e.id === params.entityId);
    if (!entity) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = entity.fields.findIndex((f) => f.id === params.fieldId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<FieldRead>;
    entity.fields[idx] = { ...entity.fields[idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(entity.fields[idx]);
  }),

  http.delete(`${API}/apps/:appId/entities/:entityId/fields/:fieldId`, ({ params }) => {
    const appId = params.appId as string;
    if (entitiesByApp[appId]) {
      const entity = entitiesByApp[appId].find((e) => e.id === params.entityId);
      if (entity) {
        const idx = entity.fields.findIndex((f) => f.id === params.fieldId);
        if (idx !== -1) entity.fields.splice(idx, 1);
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
