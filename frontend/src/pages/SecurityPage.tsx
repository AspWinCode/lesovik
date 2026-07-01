import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps, useUpdateApp } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useEntities } from "@/shared/hooks/useEntities";
import { usePermissions, useReplacePermissions } from "@/shared/hooks/usePermissions";
import type { FieldPermissionUpsert } from "@/shared/api/permissions";
import {
  fetchLdapStatus,
  testLdapConnection,
  fetchPasswordPolicy,
  updatePasswordPolicy,
  type PasswordPolicy,
} from "@/shared/api/auth";
import {
  useSessionPolicy,
  useUpdateSessionPolicy,
  useAllSessions,
  useTerminateSession,
} from "@/shared/hooks/useSessions";

type SecuritySection =
  | "login"
  | "filters"
  | "auth"
  | "password"
  | "sessions"
  | "options"
  | "abac";

interface SecurityConfig {
  require_login?: boolean;
  allow_all_users?: boolean;
  auth_provider?: string;
  domain_restrict?: boolean;
  audit_log?: boolean;
}

interface NavItem {
  id: SecuritySection;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "login",    label: "Вход в систему",    icon: <LoginIcon /> },
  { id: "abac",     label: "Права полей",        icon: <ShieldIcon /> },
  { id: "filters",  label: "Защитные фильтры",  icon: <FilterIcon /> },
  { id: "auth",     label: "Аутентификация",     icon: <ClockIcon /> },
  { id: "password",  label: "Политика паролей",  icon: <KeyIcon /> },
  { id: "sessions",  label: "Сессии",            icon: <SessionIcon /> },
  { id: "options",   label: "Опции",             icon: <OptionsIcon /> },
];

export function SecurityPage() {
  const [railModule, setRailModule] = useState<RailModule>("security");
  const [active, setActive]         = useState<SecuritySection>("login");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const navigate = useNavigate();

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const updateApp = useUpdateApp();

  const [sec, setSec] = useState<SecurityConfig>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!app) return;
    setSec((app.settings?.security as SecurityConfig | undefined) ?? {});
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update local state immediately and persist the merged security block.
  function patch(partial: Partial<SecurityConfig>) {
    const next = { ...sec, ...partial };
    setSec(next);
    setError(null);
    if (!app) return;
    updateApp.mutate(
      { appId: app.id, body: { settings: { ...app.settings, security: next } } },
      { onError: () => setError("Не удалось сохранить изменения безопасности. Повторите позже.") },
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />

      {/* ── Security sidebar ── */}
      {!navCollapsed && <aside
        className="absolute bg-white overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        {/* Sidebar header */}
        <div className="flex items-center px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Безопасность</span>
        </div>

        {/* Nav items */}
        <nav className="py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                "w-full flex items-center gap-3 text-left text-[15px] px-5 py-[10px] transition-colors",
                active === item.id
                  ? "bg-[#EBF4FF] text-cta font-medium"
                  : "text-primary hover:bg-mainbg"
              )}
            >
              <span className="w-5 h-5 shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* System views section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-cardbg">
          <button disabled title="В разработке" className="w-full flex items-center gap-2 px-5 py-3 text-[13px] text-primary/40 cursor-not-allowed">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L8 9.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Системные представления
          </button>
        </div>
      </aside>}

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1235 : 945, height: 1010, transition: "left 0.2s, width 0.2s" }}
      >
        {error && (
          <div className="mx-[40px] mt-[20px] px-4 py-2 rounded-[8px] bg-[#FDECEC] text-mistake text-[14px]">
            {error}
          </div>
        )}
        {active === "login"    && <LoginSection sec={sec} patch={patch} onManageUsers={() => navigate("/admin")} />}
        {active === "abac"     && <AbacSection appId={app?.id} />}
        {active === "filters"  && <FiltersSection />}
        {active === "auth"     && <AuthSection />}
        {active === "password"  && <PasswordPolicySection />}
        {active === "sessions"  && <SessionsSection />}
        {active === "options" && <OptionsSection sec={sec} patch={patch} />}
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

/* ── Login section ── */
function LoginSection({ sec, patch, onManageUsers }: {
  sec: SecurityConfig;
  patch: (p: Partial<SecurityConfig>) => void;
  onManageUsers: () => void;
}) {
  const requireLogin = sec.require_login ?? false;
  const allowAllUsers = sec.allow_all_users ?? false;
  const authProvider = sec.auth_provider ?? "Google";

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Вход в систему</h2>
      <p className="text-[15px] text-primary/60 mb-6">Контролируйте, кто может получить доступ к приложению.</p>

      <div className="flex flex-col gap-6">
        {/* Require login */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[16px] font-semibold text-primary mb-1">Требуется ли вход в систему?</p>
            <p className="text-[13px] text-primary/60 leading-relaxed max-w-[540px]">
              Требовать от пользователей приложения входа в систему? (при развёртывании требуется план защищённой подписки).
              Этот параметр следует выбирать для всех приложений, используемых в компании или организации.
            </p>
          </div>
          <Toggle value={requireLogin} onChange={(v) => patch({ require_login: v })} />
        </div>

        {/* Auth provider */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[16px] font-semibold text-primary mb-1">Поставщик аутентификации</p>
            <p className="text-[13px] text-primary/60">Поставщик услуг для входа пользователей в систему и хранения файлов</p>
          </div>
          <div className="relative w-[200px] shrink-0">
            <select
              value={authProvider}
              onChange={(e) => patch({ auth_provider: e.target.value })}
              className="w-full bg-white border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary appearance-none focus:outline-none focus:border-cta pr-8"
            >
              <option>Google</option>
              <option>Microsoft</option>
              <option>Email</option>
            </select>
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Allow all users */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[16px] font-semibold text-primary mb-1">Разрешить вход всем пользователям?</p>
            <p className="text-[13px] text-primary/60 leading-relaxed max-w-[540px]">
              Если эта опция включена, список пользователей не требуется. Включите эту опцию, если вам не нужно
              ограничивать доступ определённому списку пользователей, но вы хотите получить доступ к личной
              информации пользователей, например к их электронной почте, или использовать фильтры безопасности
              или закрытые таблицы
            </p>
          </div>
          <Toggle value={allowAllUsers} onChange={(v) => patch({ allow_all_users: v })} />
        </div>

        {/* Manage users button */}
        <div>
          <button onClick={onManageUsers} className="flex items-center gap-2 border border-cta text-cta rounded-[20px] px-4 py-2 text-[14px] font-medium hover:bg-[#EBF4FF] transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Управление пользователями
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Filters section ── */
function FiltersSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Защитные фильтры</h2>
      <p className="text-[15px] text-primary/60 mb-6">Настройте фильтры для ограничения доступа к данным.</p>
      <div className="text-[15px] text-primary/40">Фильтры не настроены.</div>
    </div>
  );
}

/* ── Auth section ── */
function AuthSection() {
  const { data: ldap, isLoading, isError } = useQuery({
    queryKey: ["ldap-status"],
    queryFn: fetchLdapStatus,
    retry: 1,
  });

  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const testMutation = useMutation({
    mutationFn: testLdapConnection,
    onSuccess: (res) => setTestResult(res),
    onError: () => setTestResult({ ok: false, error: "Ошибка запроса к серверу" }),
  });

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Аутентификация</h2>
      <p className="text-[15px] text-primary/60 mb-6">Настройка подключения к корпоративному LDAP / Active Directory.</p>

      {isLoading && <div className="text-[15px] text-primary/40">Загрузка…</div>}
      {isError && <div className="text-[14px] text-mistake">Не удалось получить конфигурацию LDAP. Проверьте права доступа.</div>}

      {ldap && (
        <div className="flex flex-col gap-4">
          {/* Status banner */}
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-[10px] border",
            ldap.enabled
              ? "bg-[#EBF4FF] border-cta/30"
              : "bg-mainbg border-cardbg"
          )}>
            <span className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              ldap.enabled ? "bg-green-500" : "bg-gray-400"
            )} />
            <span className="text-[15px] font-medium text-primary">
              LDAP {ldap.enabled ? "включён" : "отключён"}
            </span>
            {!ldap.enabled && (
              <span className="text-[13px] text-primary/50 ml-1">
                — задайте <code className="font-mono bg-white/60 px-1 rounded">LDAP_ENABLED=true</code> в переменных окружения сервера
              </span>
            )}
          </div>

          {/* Config fields */}
          {ldap.enabled && (
            <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden">
              {[
                { label: "Сервер (URL)", value: ldap.url },
                { label: "Base DN поиска", value: ldap.search_base },
                { label: "Bind DN (сервисный аккаунт)", value: ldap.bind_dn },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center border-b last:border-0 border-cardbg px-5 py-3 gap-4">
                  <span className="text-[13px] text-primary/60 w-[220px] shrink-0">{label}</span>
                  <span className="text-[14px] font-mono text-primary">{value ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Password note */}
          {ldap.enabled && (
            <p className="text-[12px] text-primary/40">
              Пароль сервисного аккаунта (LDAP_BIND_PASSWORD) в целях безопасности не отображается.
            </p>
          )}

          {/* Test connection */}
          {ldap.enabled && (
            <div className="flex flex-col gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setTestResult(null); testMutation.mutate(); }}
                disabled={testMutation.isPending}
                className="self-start flex items-center gap-2 px-5 h-[38px] bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active disabled:opacity-50 transition-colors"
              >
                {testMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                    </svg>
                    Проверка…
                  </>
                ) : "Проверить соединение"}
              </button>

              {testResult && (
                <div className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-[8px] text-[14px]",
                  testResult.ok
                    ? "bg-[#E6F9EF] text-green-700 border border-green-200"
                    : "bg-[#FDECEC] text-mistake border border-red-200"
                )}>
                  <span className="mt-0.5 shrink-0">
                    {testResult.ok ? "✓" : "✗"}
                  </span>
                  <span>{testResult.ok ? testResult.message : testResult.error}</span>
                </div>
              )}
            </div>
          )}

          {/* How-to hint */}
          <div className="mt-2 p-4 bg-white rounded-[10px] border border-cardbg">
            <p className="text-[13px] font-semibold text-primary mb-2">Как настроить LDAP</p>
            <ol className="flex flex-col gap-1 text-[12px] text-primary/60 list-decimal list-inside leading-relaxed">
              <li>Задайте переменные окружения в файле <code className="font-mono bg-mainbg px-1 rounded">.env</code> или в <code className="font-mono bg-mainbg px-1 rounded">docker-compose.server.yml</code></li>
              <li><code className="font-mono bg-mainbg px-1 rounded">LDAP_ENABLED=true</code>, <code className="font-mono bg-mainbg px-1 rounded">LDAP_URL=ldap://dc.example.com</code></li>
              <li><code className="font-mono bg-mainbg px-1 rounded">LDAP_BIND_DN</code>, <code className="font-mono bg-mainbg px-1 rounded">LDAP_BIND_PASSWORD</code>, <code className="font-mono bg-mainbg px-1 rounded">LDAP_SEARCH_BASE</code></li>
              <li>Перезапустите сервер и нажмите «Проверить соединение»</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Password policy section ── */
function PasswordPolicySection() {
  const { data, isLoading } = useQuery({
    queryKey: ["password-policy"],
    queryFn: fetchPasswordPolicy,
    retry: 1,
  });

  const [draft, setDraft] = useState<PasswordPolicy | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: updatePasswordPolicy,
    onSuccess: (updated) => {
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading || !draft) {
    return <div className="px-[40px] py-[25px] text-primary/40">Загрузка…</div>;
  }

  function patchDraft(partial: Partial<PasswordPolicy>) {
    setDraft((d) => d ? { ...d, ...partial } : d);
    setSaved(false);
  }

  const AGE_OPTIONS = [
    { value: 0, label: "Без ограничений" },
    { value: 30, label: "30 дней" },
    { value: 60, label: "60 дней" },
    { value: 90, label: "90 дней" },
    { value: 180, label: "180 дней" },
    { value: 365, label: "1 год" },
  ];

  const HISTORY_OPTIONS = [
    { value: 0, label: "Не проверять" },
    { value: 3, label: "3 пароля" },
    { value: 5, label: "5 паролей" },
    { value: 10, label: "10 паролей" },
    { value: 24, label: "24 пароля" },
  ];

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Политика паролей</h2>
      <p className="text-[15px] text-primary/60 mb-6">
        Требования к паролям применяются при создании, смене и сбросе пароля.
      </p>

      <div className="flex flex-col gap-4 max-w-[680px]">

        {/* Min length */}
        <div className="bg-white rounded-[10px] border border-cardbg px-5 py-4 flex items-center justify-between gap-6">
          <div>
            <p className="text-[15px] font-semibold text-primary">Минимальная длина</p>
            <p className="text-[13px] text-primary/60 mt-0.5">Минимальное количество символов в пароле</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => patchDraft({ min_length: Math.max(6, draft.min_length - 1) })}
              className="w-8 h-8 rounded-full border border-cardbg flex items-center justify-center text-primary hover:bg-mainbg text-[18px] leading-none"
            >−</button>
            <span className="w-10 text-center text-[18px] font-bold text-primary tabular-nums">
              {draft.min_length}
            </span>
            <button
              onClick={() => patchDraft({ min_length: Math.min(128, draft.min_length + 1) })}
              className="w-8 h-8 rounded-full border border-cardbg flex items-center justify-center text-primary hover:bg-mainbg text-[18px] leading-none"
            >+</button>
          </div>
        </div>

        {/* Required character types */}
        <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden">
          <div className="px-5 py-3 border-b border-cardbg">
            <p className="text-[15px] font-semibold text-primary">Обязательные символы</p>
          </div>
          {([
            { key: "require_uppercase" as const, label: "Заглавные буквы (A–Z, А–Я)" },
            { key: "require_lowercase" as const, label: "Строчные буквы (a–z, а–я)" },
            { key: "require_digit"     as const, label: "Цифры (0–9)" },
            { key: "require_special"   as const, label: "Спецсимволы (!@#$%^&*…)" },
          ] as const).map(({ key, label }, i, arr) => (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between px-5 py-3 gap-6",
                i < arr.length - 1 && "border-b border-cardbg"
              )}
            >
              <span className="text-[14px] text-primary">{label}</span>
              <Toggle value={draft[key]} onChange={(v) => patchDraft({ [key]: v })} />
            </div>
          ))}
        </div>

        {/* Password expiry */}
        <div className="bg-white rounded-[10px] border border-cardbg px-5 py-4 flex items-center justify-between gap-6">
          <div>
            <p className="text-[15px] font-semibold text-primary">Срок действия пароля</p>
            <p className="text-[13px] text-primary/60 mt-0.5">
              Пользователь будет обязан сменить пароль по истечении срока
            </p>
          </div>
          <div className="relative shrink-0 w-[170px]">
            <select
              value={draft.max_age_days}
              onChange={(e) => patchDraft({ max_age_days: Number(e.target.value) })}
              className="w-full h-[36px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[14px] text-primary appearance-none outline-none focus:border-cta pr-8"
            >
              {AGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Password history */}
        <div className="bg-white rounded-[10px] border border-cardbg px-5 py-4 flex items-center justify-between gap-6">
          <div>
            <p className="text-[15px] font-semibold text-primary">История паролей</p>
            <p className="text-[13px] text-primary/60 mt-0.5">
              Запрет повторного использования последних N паролей
            </p>
          </div>
          <div className="relative shrink-0 w-[170px]">
            <select
              value={draft.history_depth}
              onChange={(e) => patchDraft({ history_depth: Number(e.target.value) })}
              className="w-full h-[36px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[14px] text-primary appearance-none outline-none focus:border-cta pr-8"
            >
              {HISTORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#EBF4FF] rounded-[10px] border border-cta/20 px-5 py-4">
          <p className="text-[13px] font-semibold text-primary mb-2">Текущие требования к паролю</p>
          <ul className="flex flex-col gap-1">
            <PolicyHint ok={true} text={`Минимум ${draft.min_length} символов`} />
            {draft.require_uppercase && <PolicyHint ok={true} text="Хотя бы одна заглавная буква" />}
            {draft.require_lowercase && <PolicyHint ok={true} text="Хотя бы одна строчная буква" />}
            {draft.require_digit     && <PolicyHint ok={true} text="Хотя бы одна цифра" />}
            {draft.require_special   && <PolicyHint ok={true} text="Хотя бы один специальный символ" />}
            {draft.max_age_days > 0  && <PolicyHint ok={true} text={`Смена пароля каждые ${draft.max_age_days} дней`} />}
            {draft.history_depth > 0 && <PolicyHint ok={true} text={`Нельзя повторять последние ${draft.history_depth} паролей`} />}
          </ul>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => mutation.mutate(draft)}
            disabled={mutation.isPending}
            className="px-6 h-[40px] bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Сохранение…" : "Сохранить политику"}
          </button>
          {saved && <span className="text-[13px] text-green-600">Сохранено</span>}
          {mutation.isError && <span className="text-[13px] text-mistake">Ошибка сохранения</span>}
        </div>
      </div>
    </div>
  );
}

function PolicyHint({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2 text-[13px] text-primary/70">
      <span className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]", ok ? "bg-green-500 text-white" : "bg-gray-300")}>✓</span>
      {text}
    </li>
  );
}

/* ── Sessions section ── */
function SessionsSection() {
  const { data: policy, isLoading: policyLoading } = useSessionPolicy();
  const [draft, setDraft] = useState<{ timeout_minutes: number; max_concurrent_sessions: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const updatePolicy = useUpdateSessionPolicy();

  useEffect(() => {
    if (policy && !draft) setDraft({ timeout_minutes: policy.timeout_minutes, max_concurrent_sessions: policy.max_concurrent_sessions });
  }, [policy]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: sessions = [], isLoading: sessionsLoading, refetch } = useAllSessions();
  const terminate = useTerminateSession();

  const TIMEOUT_OPTIONS = [
    { value: 15, label: "15 минут" },
    { value: 30, label: "30 минут" },
    { value: 60, label: "1 час" },
    { value: 120, label: "2 часа" },
    { value: 480, label: "8 часов" },
    { value: 0, label: "Без ограничений" },
  ];

  const CONCURRENT_OPTIONS = [
    { value: 0, label: "Без ограничений" },
    { value: 1, label: "1 сессия" },
    { value: 2, label: "2 сессии" },
    { value: 3, label: "3 сессии" },
    { value: 5, label: "5 сессий" },
    { value: 10, label: "10 сессий" },
  ];

  function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function fmtAgent(ua: string | null): string {
    if (!ua) return "—";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return ua.slice(0, 30);
  }

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Сессии</h2>
      <p className="text-[15px] text-primary/60 mb-6">Управление таймаутом бездействия и активными сессиями пользователей.</p>

      <div className="flex flex-col gap-6 max-w-[800px]">

        {/* Policy settings */}
        {!policyLoading && draft && (
          <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden">
            <div className="px-5 py-3 border-b border-cardbg flex items-center justify-between">
              <p className="text-[15px] font-semibold text-primary">Параметры сессий</p>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-cardbg gap-6">
              <div>
                <p className="text-[14px] font-medium text-primary">Таймаут бездействия</p>
                <p className="text-[12px] text-primary/50 mt-0.5">Сессия завершается при отсутствии активности</p>
              </div>
              <div className="relative w-[170px] shrink-0">
                <select
                  value={draft.timeout_minutes}
                  onChange={(e) => setDraft((d) => d ? { ...d, timeout_minutes: Number(e.target.value) } : d)}
                  className="w-full h-[36px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[14px] text-primary appearance-none outline-none focus:border-cta pr-8"
                >
                  {TIMEOUT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4 gap-6">
              <div>
                <p className="text-[14px] font-medium text-primary">Максимум одновременных сессий</p>
                <p className="text-[12px] text-primary/50 mt-0.5">При превышении — старейшая сессия завершается</p>
              </div>
              <div className="relative w-[170px] shrink-0">
                <select
                  value={draft.max_concurrent_sessions}
                  onChange={(e) => setDraft((d) => d ? { ...d, max_concurrent_sessions: Number(e.target.value) } : d)}
                  className="w-full h-[36px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[14px] text-primary appearance-none outline-none focus:border-cta pr-8"
                >
                  {CONCURRENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-cardbg flex items-center gap-3">
              <button
                onClick={() => { updatePolicy.mutate(draft); setSaved(false); updatePolicy.mutateAsync(draft).then(() => setSaved(true)).catch(() => null); }}
                disabled={updatePolicy.isPending}
                className="px-5 h-[36px] bg-cta text-white text-[13px] font-medium rounded-btn hover:bg-active disabled:opacity-50 transition-colors"
              >
                {updatePolicy.isPending ? "Сохранение…" : "Сохранить"}
              </button>
              {saved && <span className="text-[13px] text-green-600">Сохранено</span>}
            </div>
          </div>
        )}

        {/* Active sessions list */}
        <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden">
          <div className="px-5 py-3 border-b border-cardbg flex items-center justify-between">
            <p className="text-[15px] font-semibold text-primary">
              Активные сессии
              {sessions.length > 0 && <span className="ml-2 text-[13px] font-normal text-primary/50">({sessions.length})</span>}
            </p>
            <button
              onClick={() => void refetch()}
              className="text-[13px] text-cta hover:underline"
            >
              Обновить
            </button>
          </div>

          {sessionsLoading ? (
            <div className="px-5 py-4 text-[14px] text-primary/40">Загрузка…</div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-4 text-[14px] text-primary/40">Нет активных сессий</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-mainbg border-b border-cardbg">
                    <th className="text-left px-4 py-2 font-semibold text-primary/60">Пользователь</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary/60">IP</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary/60">Браузер</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary/60">Активность</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary/60">Создана</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s.id} className={cn("border-b last:border-0 border-cardbg", i % 2 === 0 ? "bg-white" : "bg-mainbg/30")}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-primary">{s.user_name ?? "—"}</div>
                        <div className="text-[11px] text-primary/50">{s.user_email ?? ""}</div>
                      </td>
                      <td className="px-4 py-2.5 text-primary/70 font-mono">{s.ip_address ?? "—"}</td>
                      <td className="px-4 py-2.5 text-primary/70">{fmtAgent(s.user_agent)}</td>
                      <td className="px-4 py-2.5 text-primary/70">{fmtDate(s.last_activity_at)}</td>
                      <td className="px-4 py-2.5 text-primary/70">{fmtDate(s.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => terminate.mutate(s.id)}
                          disabled={terminate.isPending}
                          className="text-[12px] text-mistake hover:underline disabled:opacity-40"
                        >
                          Завершить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Options section ── */
function OptionsSection({ sec, patch }: {
  sec: SecurityConfig;
  patch: (p: Partial<SecurityConfig>) => void;
}) {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Опции</h2>
      <div className="flex flex-col gap-5 mt-4">
        <OptionRow
          label="Ограничение по домену"
          hint="Разрешить доступ только пользователям с определённым доменом электронной почты"
          value={sec.domain_restrict ?? false}
          onChange={(v) => patch({ domain_restrict: v })}
        />
        <OptionRow
          label="Журнал аудита"
          hint="Включить запись действий пользователей для аудита безопасности"
          value={sec.audit_log ?? false}
          onChange={(v) => patch({ audit_log: v })}
        />
      </div>
    </div>
  );
}

function OptionRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 bg-white rounded-[8px] border border-cardbg px-5 py-4">
      <div>
        <p className="text-[15px] font-medium text-primary">{label}</p>
        <p className="text-[13px] text-primary/60 mt-0.5">{hint}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative shrink-0 w-[46px] h-[26px] rounded-full transition-colors",
        value ? "bg-[#35A7FF]" : "bg-gray-300"
      )}
    >
      <span className={cn(
        "absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow transition-transform",
        value ? "translate-x-[23px]" : "translate-x-[3px]"
      )} />
    </button>
  );
}

/* ── ABAC: field-level permissions ── */

const ROLES = [
  { id: "platform_admin", label: "Платформ-Адм." },
  { id: "app_admin",      label: "Адм. приложения" },
  { id: "app_editor",     label: "Редактор" },
  { id: "app_viewer",     label: "Просмотр" },
];

function AbacSection({ appId }: { appId: string | undefined }) {
  const { data: entities = [] } = useEntities(appId);
  const [entityId, setEntityId] = useState<string>("");

  // Sync default entity selection
  useEffect(() => {
    if (entities.length > 0 && !entityId) setEntityId(entities[0].id);
  }, [entities, entityId]);

  const selectedEntity = entities.find((e) => e.id === entityId);
  const userFields = (selectedEntity?.fields ?? []).filter((f) => !f.is_system);

  const { data: perms = [], isLoading } = usePermissions(appId, entityId || undefined);
  const replace = useReplacePermissions(appId ?? "", entityId);

  // Build working matrix: { "fieldName:roleId" → { can_read, can_write } }
  const [matrix, setMatrix] = useState<Record<string, { can_read: boolean; can_write: boolean }>>({});

  // Sync matrix from fetched perms
  useEffect(() => {
    const m: Record<string, { can_read: boolean; can_write: boolean }> = {};
    for (const p of perms) {
      m[`${p.field_name}:${p.role_id}`] = { can_read: p.can_read, can_write: p.can_write };
    }
    setMatrix(m);
  }, [perms]);

  function getCell(fieldName: string, roleId: string) {
    return matrix[`${fieldName}:${roleId}`] ?? { can_read: true, can_write: true };
  }

  function toggleCell(fieldName: string, roleId: string, prop: "can_read" | "can_write") {
    const key = `${fieldName}:${roleId}`;
    const cur = matrix[key] ?? { can_read: true, can_write: true };
    setMatrix((m) => ({ ...m, [key]: { ...cur, [prop]: !cur[prop] } }));
  }

  async function savePermissions() {
    // Only persist non-default (i.e. deny) rows
    const body: FieldPermissionUpsert[] = [];
    for (const [key, val] of Object.entries(matrix)) {
      if (!val.can_read || !val.can_write) {
        const [fieldName, roleId] = key.split(":");
        body.push({ field_name: fieldName, role_id: roleId, ...val });
      }
    }
    replace.mutate(body);
  }

  if (!appId) return <div className="px-[40px] py-[25px] text-primary/40">Нет активного приложения.</div>;

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-1">Права доступа к полям</h2>
      <p className="text-[14px] text-primary/60 mb-5">
        Управляйте чтением и записью отдельных полей по ролям.
        Галочка — доступ разрешён; снять — запрещён. Сохраните изменения кнопкой ниже.
      </p>

      {/* Entity selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[15px] font-medium text-primary">Таблица:</span>
        <select
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="h-[36px] px-3 bg-white border border-cardbg rounded-[8px] text-[14px] text-primary outline-none focus:border-cta"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.display_name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-primary/40 text-[14px]">Загрузка прав…</div>
      ) : userFields.length === 0 ? (
        <div className="text-primary/40 text-[14px]">В таблице нет пользовательских полей.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[10px] border border-cardbg bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-mainbg border-b border-cardbg">
                  <th className="text-left px-4 py-3 text-[14px] font-semibold text-primary w-[200px]">Поле</th>
                  {ROLES.map((r) => (
                    <th key={r.id} colSpan={2} className="text-center px-3 py-3 font-semibold text-primary border-l border-cardbg">
                      {r.label}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-cardbg bg-white">
                  <th className="px-4 py-2 text-left text-[12px] text-primary/50">Тип</th>
                  {ROLES.map((r) => (
                    <>
                      <th key={`${r.id}-r`} className="text-center px-2 py-2 text-[11px] text-primary/50 border-l border-cardbg">Чтение</th>
                      <th key={`${r.id}-w`} className="text-center px-2 py-2 text-[11px] text-primary/50">Запись</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userFields.map((f, fi) => (
                  <tr key={f.id} className={cn("border-b border-cardbg last:border-0", fi % 2 === 0 ? "bg-white" : "bg-mainbg/40")}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-primary">{f.display_name}</div>
                      <div className="text-[11px] text-primary/40 font-mono">{f.field_type}</div>
                    </td>
                    {ROLES.map((r) => {
                      const cell = getCell(f.name, r.id);
                      return (
                        <>
                          <td key={`${r.id}-r`} className="text-center px-2 py-2 border-l border-cardbg">
                            <Checkbox
                              checked={cell.can_read}
                              onChange={() => toggleCell(f.name, r.id, "can_read")}
                            />
                          </td>
                          <td key={`${r.id}-w`} className="text-center px-2 py-2">
                            <Checkbox
                              checked={cell.can_write}
                              onChange={() => toggleCell(f.name, r.id, "can_write")}
                            />
                          </td>
                        </>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={savePermissions}
              disabled={replace.isPending}
              className="px-5 h-[38px] bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active disabled:opacity-50 transition-colors"
            >
              {replace.isPending ? "Сохранение…" : "Сохранить права"}
            </button>
            {replace.isSuccess && (
              <span className="text-[13px] text-green-600">Сохранено</span>
            )}
            {replace.isError && (
              <span className="text-[13px] text-red-500">Ошибка сохранения</span>
            )}
          </div>
          <p className="mt-3 text-[12px] text-primary/40">
            Снятая галочка = явный запрет. Если роль не перечислена в правиле — доступ разрешён по умолчанию.
          </p>
        </>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-[22px] h-[22px] rounded-[5px] border-2 mx-auto flex items-center justify-center transition-colors",
        checked ? "bg-cta border-cta" : "bg-white border-primary/30"
      )}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-3 h-3">
          <path d="M2 6 L5 9 L10 3" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* ── Icons ── */
const stroke = "#00205F";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 2 L17 5 L17 10 C17 14 13.5 17.5 10 18.5 C6.5 17.5 3 14 3 10 L3 5 Z"
        stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10 L9 12 L13 8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke={stroke} strokeWidth="1.5" />
      <path d="M10 7v6M7 10h6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M3 5h14M6 10h8M9 15h2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="1.5" />
      <path d="M10 6v4l3 2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OptionsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M4 6h12M4 10h7M4 14h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="10" r="2" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="8" cy="9" r="4" stroke={stroke} strokeWidth="1.5" />
      <path d="M12 12l5 5M14.5 14.5l1.5-1.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <rect x="3" y="5" width="14" height="10" rx="2" stroke={stroke} strokeWidth="1.5" />
      <path d="M3 8h14" stroke={stroke} strokeWidth="1.5" />
      <circle cx="6.5" cy="12" r="1" fill={stroke} />
    </svg>
  );
}
