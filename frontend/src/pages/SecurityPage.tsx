import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps, useUpdateApp } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";

type SecuritySection =
  | "login"
  | "filters"
  | "auth"
  | "options";

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
  { id: "login",   label: "Вход в систему",    icon: <LoginIcon /> },
  { id: "filters", label: "Защитные фильтры",  icon: <FilterIcon /> },
  { id: "auth",    label: "Аутентификация",     icon: <ClockIcon /> },
  { id: "options", label: "Опции",              icon: <OptionsIcon /> },
];

export function SecurityPage() {
  const [railModule, setRailModule] = useState<RailModule>("security");
  const [active, setActive]         = useState<SecuritySection>("login");
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
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Security sidebar ── */}
      <aside
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
      </aside>

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 380, top: 70, width: 945, height: 1010 }}
      >
        {error && (
          <div className="mx-[40px] mt-[20px] px-4 py-2 rounded-[8px] bg-[#FDECEC] text-mistake text-[14px]">
            {error}
          </div>
        )}
        {active === "login"   && <LoginSection sec={sec} patch={patch} onManageUsers={() => navigate("/admin")} />}
        {active === "filters" && <FiltersSection />}
        {active === "auth"    && <AuthSection />}
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
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Аутентификация</h2>
      <p className="text-[15px] text-primary/60 mb-6">Настройте параметры аутентификации пользователей.</p>
      <div className="text-[15px] text-primary/40">Настройки по умолчанию.</div>
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

/* ── Icons ── */
const stroke = "#00205F";

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
