import { http, HttpResponse } from "msw";
import type { App, CursorPage } from "@/shared/api/apps";
import type { CurrentUser, TokenPair } from "@/shared/api/auth";
import type { EntityRead, FieldRead } from "@/shared/api/entities";
import type { Rule } from "@/shared/api/rules";
import type { User, UserRole } from "@/shared/api/users";
import type { RecordRead } from "@/shared/api/records";
import type { ViewRead, PageRead } from "@/shared/api/views";
import type { WorkflowDefRead, StateDefRead } from "@/shared/api/workflows";
import type { WebhookRead } from "@/shared/api/webhooks";
import type { ModuleInstallResult, ModuleRead } from "@/shared/api/modules";

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
    category: null,
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

const moduleCatalog: ModuleRead[] = [
  { code: "enterprise", name: "Enterprise", category: "Base", description: "Base company directories", dependencies: [], color: "#4C6EF5", icon: "building" },
  { code: "warehouse", name: "Warehouse", category: "Operations", description: "Products, balances and stock operations", dependencies: ["enterprise"], color: "#8B5CF6", icon: "package" },
  { code: "production", name: "Production", category: "Operations", description: "Production orders, BOM and operations", dependencies: ["enterprise", "warehouse"], color: "#64748B", icon: "settings" },
  { code: "orders", name: "Orders and shipments", category: "Operations", description: "Customer orders and shipments", dependencies: ["enterprise", "warehouse"], color: "#06B6D4", icon: "truck" },
  { code: "finance", name: "Finance", category: "Finance", description: "Budgets, payments and transactions", dependencies: ["enterprise"], color: "#059669", icon: "coins" },
  { code: "contracts", name: "Contracts", category: "Finance", description: "Contracts and execution stages", dependencies: ["enterprise"], color: "#DC2626", icon: "file" },
  { code: "hr", name: "HR", category: "HR", description: "Candidates, hiring and reviews", dependencies: ["enterprise"], color: "#DB2777", icon: "users" },
  { code: "projects", name: "Tasks and projects", category: "Productivity", description: "Projects, tasks and milestones", dependencies: ["enterprise"], color: "#10B981", icon: "check" },
  { code: "analytics", name: "Analytics", category: "Analytics", description: "KPI, dashboards and reports", dependencies: [], color: "#0EA5E9", icon: "chart" },
  { code: "documents", name: "Document flow", category: "Documents", description: "Documents and filing cases", dependencies: ["enterprise"], color: "#7C3AED", icon: "file" },
  { code: "it_support", name: "IT support", category: "IT", description: "Tickets, equipment and SLA", dependencies: ["enterprise"], color: "#EA580C", icon: "tool" },
].map((m, index) => ({
  id: `module-${index + 1}`,
  is_base: m.code === "enterprise",
  is_active: true,
  current_version: "1.0.0",
  installed: false,
  installed_version: null,
  created_at: "2026-01-01T00:00:00Z",
  ...m,
}));

const installedModulesByApp: Record<string, Set<string>> = {};

function modulesForApp(appId: string | null): ModuleRead[] {
  const installed = appId ? installedModulesByApp[appId] ?? new Set<string>() : new Set<string>();
  return moduleCatalog.map((m) => ({
    ...m,
    installed: installed.has(m.code),
    installed_version: installed.has(m.code) ? m.current_version : null,
  }));
}

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
    is_blocked: false,
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
    is_blocked: false,
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
    is_blocked: false,
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
    is_blocked: false,
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
    is_blocked: false,
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
    formula_definition: null,
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

/* ── Mock Records ── */
const mockRecords: RecordRead[] = [
  {
    id: "rec-1", entity_id: ENTITY_ID, payload: { name: "Record 1", status: "active" },
    version: 1, created_by: MOCK_USER.id, updated_by: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "rec-2", entity_id: ENTITY_ID, payload: { name: "Record 2", status: "active" },
    version: 1, created_by: MOCK_USER.id, updated_by: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "rec-3", entity_id: ENTITY_ID, payload: { name: "Record 3", status: "active" },
    version: 1, created_by: MOCK_USER.id, updated_by: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

/* ── Mock Views (per entity per app) ── */
const viewsByApp: Record<string, ViewRead[]> = {};

function buildViews(appId: string, entityId: string): ViewRead[] {
  const now = new Date().toISOString();
  return [
    {
      id: `view-${entityId}-table`, app_id: appId, entity_id: entityId,
      name: "Таблица", view_type: "table", config: {}, is_default: true,
      is_public: false, created_by: MOCK_USER.id, created_at: now, updated_at: now,
    },
    {
      id: `view-${entityId}-form`, app_id: appId, entity_id: entityId,
      name: "Форма", view_type: "form", config: {}, is_default: false,
      is_public: false, created_by: MOCK_USER.id, created_at: now, updated_at: now,
    },
  ];
}

function viewsKey(appId: string, entityId: string) { return `${appId}__${entityId}`; }

/* ── Mock Pages (per app) ── */
const pagesByApp: Record<string, PageRead[]> = {};

function buildPages(appId: string): PageRead[] {
  const now = new Date().toISOString();
  return [
    {
      id: `page-${appId}-reports`, app_id: appId, slug: "reports", title: "Отчёты",
      icon: null, nav_order: 0, layout: {}, blocks: [], breakpoints: {}, is_published: false,
      published_at: null, created_at: now, updated_at: now,
    },
    {
      id: `page-${appId}-enterprise`, app_id: appId, slug: "enterprise", title: "Предприятие",
      icon: null, nav_order: 1, layout: {}, blocks: [], breakpoints: {}, is_published: false,
      published_at: null, created_at: now, updated_at: now,
    },
    {
      id: `page-${appId}-main-menu`, app_id: appId, slug: "main-menu", title: "Главное меню",
      icon: null, nav_order: 2, layout: {}, blocks: [], breakpoints: {}, is_published: false,
      published_at: null, created_at: now, updated_at: now,
    },
    {
      id: `page-${appId}-analytics`, app_id: appId, slug: "analytics", title: "Аналитика",
      icon: null, nav_order: 3, layout: {}, blocks: [], breakpoints: {}, is_published: false,
      published_at: null, created_at: now, updated_at: now,
    },
  ];
}

/* ── Mock Workflows ── */
const workflowsByApp: Record<string, WorkflowDefRead[]> = {};
const statesByWorkflow: Record<string, StateDefRead[]> = {};

function buildWorkflows(appId: string): WorkflowDefRead[] {
  const now = new Date().toISOString();
  const wf1Id = `wf-${appId}-1`;
  const wf2Id = `wf-${appId}-2`;

  statesByWorkflow[wf1Id] = [
    { id: `s-${wf1Id}-1`, workflow_id: wf1Id, name: "new",        display_name: "Новый",      is_terminal: false, color: "#35A7FF", sla_seconds: null, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
    { id: `s-${wf1Id}-2`, workflow_id: wf1Id, name: "in_progress", display_name: "В работе",   is_terminal: false, color: "#F59E0B", sla_seconds: 86400, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
    { id: `s-${wf1Id}-3`, workflow_id: wf1Id, name: "done",        display_name: "Выполнено",  is_terminal: true,  color: "#10B981", sla_seconds: null, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
  ];
  statesByWorkflow[wf2Id] = [
    { id: `s-${wf2Id}-1`, workflow_id: wf2Id, name: "draft",    display_name: "Черновик",   is_terminal: false, color: "#6B7280", sla_seconds: null, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
    { id: `s-${wf2Id}-2`, workflow_id: wf2Id, name: "review",   display_name: "На проверке",is_terminal: false, color: "#8B5CF6", sla_seconds: 3600, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
    { id: `s-${wf2Id}-3`, workflow_id: wf2Id, name: "approved", display_name: "Одобрено",   is_terminal: true,  color: "#10B981", sla_seconds: null, on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [] },
  ];

  return [
    {
      id: wf1Id, app_id: appId, entity_id: ENTITY_ID, name: "Основной процесс",
      description: null, initial_state: "new", is_active: true, version: 1,
      created_at: now, updated_at: now,
    },
    {
      id: wf2Id, app_id: appId, entity_id: ENTITY_ID, name: "Процесс согласования",
      description: null, initial_state: "draft", is_active: false, version: 1,
      created_at: now, updated_at: now,
    },
  ];
}

/* ── Mock Webhooks ── */
const webhooksByApp: Record<string, WebhookRead[]> = {};

function buildWebhooks(appId: string): WebhookRead[] {
  const now = new Date().toISOString();
  return [
    {
      id: `wh-${appId}-1`, app_id: appId, name: "Основной вебхук",
      target_url: "https://example.com/webhook", events: ["record.created", "record.updated"],
      is_active: true, custom_headers: {}, timeout_seconds: 30, max_retries: 3,
      created_at: now, updated_at: now,
    },
  ];
}

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

  http.get(`${API}/modules`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(modulesForApp(url.searchParams.get("app_id")));
  }),

  http.get(`${API}/apps/:appId/modules`, ({ params }) => {
    const appId = params.appId as string;
    const installed = installedModulesByApp[appId] ?? new Set<string>();
    return HttpResponse.json(
      modulesForApp(appId)
        .filter((m) => installed.has(m.code))
        .map((m) => ({
          app_id: appId,
          module_id: m.id,
          module_code: m.code,
          module_name: m.name,
          version: m.current_version,
          status: "installed",
          installed_at: new Date().toISOString(),
          installed_by: MOCK_USER.id,
        })),
    );
  }),

  http.post(`${API}/apps/:appId/modules/:moduleCode/install`, ({ params }) => {
    const appId = params.appId as string;
    const moduleCode = params.moduleCode as string;
    const module = moduleCatalog.find((m) => m.code === moduleCode);
    if (!module) return HttpResponse.json({ detail: "Module not found" }, { status: 404 });
    const installed = installedModulesByApp[appId] ?? new Set<string>();
    installedModulesByApp[appId] = installed;
    module.dependencies.forEach((dep) => installed.add(dep));
    installed.add(module.code);
    const result: ModuleInstallResult = {
      module: { ...module, installed: true, installed_version: module.current_version },
      installed_dependencies: module.dependencies,
      entities_created: 2,
      fields_created: 6,
      pages_created: 1,
    };
    return HttpResponse.json(result);
  }),

  http.delete(`${API}/apps/:appId/modules/:moduleCode`, ({ params }) => {
    const appId = params.appId as string;
    const moduleCode = params.moduleCode as string;
    installedModulesByApp[appId]?.delete(moduleCode);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/apps/:appId/templates/:templateId/install`, ({ params }) => {
    const appId = params.appId as string;
    const templateModules: Record<string, string[]> = {
      trading_company: ["enterprise", "warehouse", "orders", "finance", "analytics"],
      manufacturing_company: ["enterprise", "warehouse", "production", "finance", "analytics"],
      service_company: ["enterprise", "projects", "contracts", "finance", "it_support"],
      hr_department: ["enterprise", "hr", "projects"],
      document_flow: ["enterprise", "documents", "contracts"],
      financial_accounting: ["enterprise", "finance", "analytics"],
      empty: [],
    };
    const modules = templateModules[params.templateId as string] ?? [];
    const installed = installedModulesByApp[appId] ?? new Set<string>();
    installedModulesByApp[appId] = installed;
    modules.forEach((m) => installed.add(m));
    return HttpResponse.json({
      modules_installed: [...installed],
      entities_created: modules.length * 2,
      fields_created: modules.length * 6,
      pages_created: modules.length,
    });
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
      default_value: null, validation_rules: {}, field_options: {}, formula_definition: null,
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

  // Rules create
  http.post(`${API}/apps/:appId/rules`, async ({ params, request }) => {
    const appId = params.appId as string;
    const body = (await request.json()) as { name: string; entity_id: string; trigger: { event: string; watch_fields?: string[] }; description?: string | null; priority?: number };
    const now = new Date().toISOString();
    const rule: Rule = {
      id: crypto.randomUUID(),
      app_id: appId,
      entity_id: body.entity_id,
      name: body.name,
      description: body.description ?? null,
      is_active: false,
      trigger: { event: body.trigger.event, watch_fields: body.trigger.watch_fields ?? [] },
      conditions: {},
      actions: [],
      priority: body.priority ?? 100,
      version: 1,
      created_by: MOCK_USER.id,
      created_at: now,
      updated_at: now,
    };
    rules.push(rule);
    return HttpResponse.json(rule, { status: 201 });
  }),

  // Records
  http.get(`${API}/apps/:appId/entities/:entityId/records`, ({ params }) => {
    const entityId = params.entityId as string;
    const items = mockRecords.filter((r) => r.entity_id === entityId);
    const page: CursorPage<RecordRead> = { items, next_cursor: null, has_more: false, total: items.length };
    return HttpResponse.json(page);
  }),

  http.post(`${API}/apps/:appId/entities/:entityId/records`, async ({ params, request }) => {
    const entityId = params.entityId as string;
    const body = (await request.json()) as { payload: Record<string, unknown> };
    const now = new Date().toISOString();
    const record: RecordRead = {
      id: crypto.randomUUID(), entity_id: entityId, payload: body.payload,
      version: 1, created_by: MOCK_USER.id, updated_by: null,
      created_at: now, updated_at: now,
    };
    mockRecords.push(record);
    return HttpResponse.json(record, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/entities/:entityId/records/:recordId`, async ({ params, request }) => {
    const idx = mockRecords.findIndex((r) => r.id === params.recordId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as { payload: Record<string, unknown> };
    mockRecords[idx] = { ...mockRecords[idx], payload: body.payload, updated_at: new Date().toISOString() };
    return HttpResponse.json(mockRecords[idx]);
  }),

  http.delete(`${API}/apps/:appId/entities/:entityId/records/:recordId`, ({ params }) => {
    const idx = mockRecords.findIndex((r) => r.id === params.recordId);
    if (idx !== -1) mockRecords.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Views
  http.get(`${API}/apps/:appId/entities/:entityId/views`, ({ params }) => {
    const appId = params.appId as string;
    const entityId = params.entityId as string;
    const key = viewsKey(appId, entityId);
    if (!viewsByApp[key]) viewsByApp[key] = buildViews(appId, entityId);
    return HttpResponse.json(viewsByApp[key]);
  }),

  http.post(`${API}/apps/:appId/entities/:entityId/views`, async ({ params, request }) => {
    const appId = params.appId as string;
    const entityId = params.entityId as string;
    const key = viewsKey(appId, entityId);
    if (!viewsByApp[key]) viewsByApp[key] = buildViews(appId, entityId);
    const body = (await request.json()) as { name: string; view_type: string; config?: Record<string, unknown>; is_public?: boolean };
    const now = new Date().toISOString();
    const view: ViewRead = {
      id: crypto.randomUUID(), app_id: appId, entity_id: entityId,
      name: body.name, view_type: body.view_type as ViewRead["view_type"],
      config: body.config ?? {}, is_default: false, is_public: body.is_public ?? false,
      created_by: MOCK_USER.id, created_at: now, updated_at: now,
    };
    viewsByApp[key].push(view);
    return HttpResponse.json(view, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/entities/:entityId/views/:viewId`, async ({ params, request }) => {
    const appId = params.appId as string;
    const entityId = params.entityId as string;
    const key = viewsKey(appId, entityId);
    if (!viewsByApp[key]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = viewsByApp[key].findIndex((v) => v.id === params.viewId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<ViewRead>;
    viewsByApp[key][idx] = { ...viewsByApp[key][idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(viewsByApp[key][idx]);
  }),

  http.delete(`${API}/apps/:appId/entities/:entityId/views/:viewId`, ({ params }) => {
    const appId = params.appId as string;
    const entityId = params.entityId as string;
    const key = viewsKey(appId, entityId);
    if (viewsByApp[key]) {
      const idx = viewsByApp[key].findIndex((v) => v.id === params.viewId);
      if (idx !== -1) viewsByApp[key].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/apps/:appId/entities/:entityId/views/:viewId/set_default`, ({ params }) => {
    const appId = params.appId as string;
    const entityId = params.entityId as string;
    const key = viewsKey(appId, entityId);
    if (!viewsByApp[key]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    viewsByApp[key].forEach((v) => { v.is_default = v.id === params.viewId; });
    const view = viewsByApp[key].find((v) => v.id === params.viewId);
    if (!view) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    return HttpResponse.json(view);
  }),

  // Pages
  http.get(`${API}/apps/:appId/pages`, ({ params }) => {
    const appId = params.appId as string;
    if (!pagesByApp[appId]) pagesByApp[appId] = buildPages(appId);
    const sorted = [...pagesByApp[appId]].sort((a, b) => a.nav_order - b.nav_order);
    return HttpResponse.json(sorted);
  }),

  http.post(`${API}/apps/:appId/pages`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!pagesByApp[appId]) pagesByApp[appId] = buildPages(appId);
    const body = (await request.json()) as { slug: string; title: string; icon?: string | null; nav_order?: number; layout?: Record<string, unknown>; blocks?: Record<string, unknown>[] };
    const now = new Date().toISOString();
    const page: PageRead = {
      id: crypto.randomUUID(), app_id: appId, slug: body.slug, title: body.title,
      icon: body.icon ?? null, nav_order: body.nav_order ?? pagesByApp[appId].length,
      layout: body.layout ?? {}, blocks: body.blocks ?? [], breakpoints: {},
      is_published: false, published_at: null, created_at: now, updated_at: now,
    };
    pagesByApp[appId].push(page);
    return HttpResponse.json(page, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/pages/:pageId`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!pagesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = pagesByApp[appId].findIndex((p) => p.id === params.pageId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<PageRead>;
    pagesByApp[appId][idx] = { ...pagesByApp[appId][idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(pagesByApp[appId][idx]);
  }),

  http.delete(`${API}/apps/:appId/pages/:pageId`, ({ params }) => {
    const appId = params.appId as string;
    if (pagesByApp[appId]) {
      const idx = pagesByApp[appId].findIndex((p) => p.id === params.pageId);
      if (idx !== -1) pagesByApp[appId].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/apps/:appId/pages/:pageId/publish`, ({ params }) => {
    const appId = params.appId as string;
    if (!pagesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const page = pagesByApp[appId].find((p) => p.id === params.pageId);
    if (!page) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    page.is_published = true;
    page.published_at = new Date().toISOString();
    return HttpResponse.json(page);
  }),

  http.post(`${API}/apps/:appId/pages/:pageId/unpublish`, ({ params }) => {
    const appId = params.appId as string;
    if (!pagesByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const page = pagesByApp[appId].find((p) => p.id === params.pageId);
    if (!page) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    page.is_published = false;
    page.published_at = null;
    return HttpResponse.json(page);
  }),

  // Workflows
  http.get(`${API}/apps/:appId/workflows`, ({ params, request }) => {
    const appId = params.appId as string;
    if (!workflowsByApp[appId]) workflowsByApp[appId] = buildWorkflows(appId);
    const url = new URL(request.url);
    const entityId = url.searchParams.get("entity_id");
    const result = entityId
      ? workflowsByApp[appId].filter((w) => w.entity_id === entityId)
      : workflowsByApp[appId];
    return HttpResponse.json(result);
  }),

  http.post(`${API}/apps/:appId/workflows`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!workflowsByApp[appId]) workflowsByApp[appId] = buildWorkflows(appId);
    const body = (await request.json()) as { entity_id: string; name: string; description?: string | null; initial_state: string };
    const now = new Date().toISOString();
    const wfId = crypto.randomUUID();
    const wf: WorkflowDefRead = {
      id: wfId, app_id: appId, entity_id: body.entity_id, name: body.name,
      description: body.description ?? null, initial_state: body.initial_state,
      is_active: false, version: 1, created_at: now, updated_at: now,
    };
    workflowsByApp[appId].push(wf);
    statesByWorkflow[wfId] = [];
    return HttpResponse.json(wf, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/workflows/:workflowId`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!workflowsByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = workflowsByApp[appId].findIndex((w) => w.id === params.workflowId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<WorkflowDefRead>;
    workflowsByApp[appId][idx] = { ...workflowsByApp[appId][idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(workflowsByApp[appId][idx]);
  }),

  http.delete(`${API}/apps/:appId/workflows/:workflowId`, ({ params }) => {
    const appId = params.appId as string;
    if (workflowsByApp[appId]) {
      const idx = workflowsByApp[appId].findIndex((w) => w.id === params.workflowId);
      if (idx !== -1) workflowsByApp[appId].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/apps/:appId/workflows/:workflowId/activate`, ({ params }) => {
    const appId = params.appId as string;
    if (!workflowsByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const wf = workflowsByApp[appId].find((w) => w.id === params.workflowId);
    if (!wf) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    wf.is_active = true;
    wf.updated_at = new Date().toISOString();
    return HttpResponse.json(wf);
  }),

  http.post(`${API}/apps/:appId/workflows/:workflowId/deactivate`, ({ params }) => {
    const appId = params.appId as string;
    if (!workflowsByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const wf = workflowsByApp[appId].find((w) => w.id === params.workflowId);
    if (!wf) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    wf.is_active = false;
    wf.updated_at = new Date().toISOString();
    return HttpResponse.json(wf);
  }),

  http.get(`${API}/apps/:appId/workflows/:workflowId/states`, ({ params }) => {
    const workflowId = params.workflowId as string;
    return HttpResponse.json(statesByWorkflow[workflowId] ?? []);
  }),

  http.post(`${API}/apps/:appId/workflows/:workflowId/states`, async ({ params, request }) => {
    const workflowId = params.workflowId as string;
    if (!statesByWorkflow[workflowId]) statesByWorkflow[workflowId] = [];
    const body = (await request.json()) as { name: string; display_name: string; is_terminal?: boolean; color?: string | null; sla_seconds?: number | null };
    const state: StateDefRead = {
      id: crypto.randomUUID(), workflow_id: workflowId,
      name: body.name, display_name: body.display_name,
      is_terminal: body.is_terminal ?? false, color: body.color ?? null,
      sla_seconds: body.sla_seconds ?? null,
      on_enter_actions: [], on_exit_actions: [], sla_breach_actions: [],
    };
    statesByWorkflow[workflowId].push(state);
    return HttpResponse.json(state, { status: 201 });
  }),

  http.delete(`${API}/apps/:appId/workflows/:workflowId/states/:stateId`, ({ params }) => {
    const workflowId = params.workflowId as string;
    if (statesByWorkflow[workflowId]) {
      const idx = statesByWorkflow[workflowId].findIndex((s) => s.id === params.stateId);
      if (idx !== -1) statesByWorkflow[workflowId].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Webhooks
  http.get(`${API}/apps/:appId/webhooks`, ({ params }) => {
    const appId = params.appId as string;
    if (!webhooksByApp[appId]) webhooksByApp[appId] = buildWebhooks(appId);
    return HttpResponse.json(webhooksByApp[appId]);
  }),

  http.post(`${API}/apps/:appId/webhooks`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!webhooksByApp[appId]) webhooksByApp[appId] = buildWebhooks(appId);
    const body = (await request.json()) as { name: string; target_url: string; events?: string[]; custom_headers?: Record<string, string>; timeout_seconds?: number; max_retries?: number };
    const now = new Date().toISOString();
    const webhook: WebhookRead & { secret: string } = {
      id: crypto.randomUUID(), app_id: appId, name: body.name,
      target_url: body.target_url, events: body.events ?? [],
      is_active: true, custom_headers: body.custom_headers ?? {},
      timeout_seconds: body.timeout_seconds ?? 30, max_retries: body.max_retries ?? 3,
      created_at: now, updated_at: now,
      secret: crypto.randomUUID(),
    };
    webhooksByApp[appId].push(webhook);
    return HttpResponse.json(webhook, { status: 201 });
  }),

  http.patch(`${API}/apps/:appId/webhooks/:subId`, async ({ params, request }) => {
    const appId = params.appId as string;
    if (!webhooksByApp[appId]) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const idx = webhooksByApp[appId].findIndex((w) => w.id === params.subId);
    if (idx === -1) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    const body = (await request.json()) as Partial<WebhookRead>;
    webhooksByApp[appId][idx] = { ...webhooksByApp[appId][idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(webhooksByApp[appId][idx]);
  }),

  http.delete(`${API}/apps/:appId/webhooks/:subId`, ({ params }) => {
    const appId = params.appId as string;
    if (webhooksByApp[appId]) {
      const idx = webhooksByApp[appId].findIndex((w) => w.id === params.subId);
      if (idx !== -1) webhooksByApp[appId].splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
