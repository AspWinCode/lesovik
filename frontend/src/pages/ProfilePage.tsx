import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/shared/auth/store";

type ProfileTab =
  | "sources"
  | "integration"
  | "payment"
  | "app-info"
  | "db-info"
  | "partner"
  | "collab"
  | "settings";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "sources",     label: "Источники" },
  { id: "integration", label: "Интеграция" },
  { id: "payment",     label: "Оплата" },
  { id: "app-info",    label: "Информация о приложении" },
  { id: "db-info",     label: "Информация о базе данных" },
  { id: "partner",     label: "Партнер" },
  { id: "collab",      label: "Сотрудничество" },
  { id: "settings",    label: "Настройки" },
];

export function ProfilePage() {
  const [active, setActive] = useState<ProfileTab>("settings");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top navbar ── */}
      <header className="h-[56px] shrink-0 flex items-center px-6 gap-6 bg-white border-b border-cardbg">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold text-primary">OI</span>
          <span className="text-[18px] text-primary font-medium">Дикая Сибирь</span>
        </div>
        <div className="ml-auto flex items-center gap-6 text-[14px] text-primary">
          <span className="text-primary/60">{user?.email ?? "exampleemail@gmail.com"}</span>
          <button className="hover:underline">Мои приложения</button>
          <button className="flex items-center gap-1 hover:underline">
            Аккаунт
            <Chevron />
          </button>
          <button className="hover:underline">Шаблоны</button>
          <button className="flex items-center gap-1 hover:underline">
            Помощь
            <Chevron />
          </button>
          <button className="flex items-center gap-1 hover:underline">
            Больше
            <Chevron />
          </button>
        </div>
      </header>

      {/* ── Profile header ── */}
      <div className="px-[120px] pt-8 pb-5 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-primary mb-1">Дикая Сибирь</h1>
            <p className="text-[14px] text-primary/60">
              ID: {user?.id ?? "769413932"} {user?.email ?? "irinakoniushkina271@gmail.com"}(google)
            </p>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[13px] text-primary/50">Тарифный план: бесплатный</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-[13px] text-cta hover:underline"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Выйти
              </button>
            </div>
          </div>
          <button className="flex items-center gap-2 border border-cta text-cta rounded-[20px] px-4 py-2 text-[14px] font-medium hover:bg-[#EBF4FF] transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Активность пользователя
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-5 border-b border-cardbg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "px-4 py-2 text-[14px] border-b-2 transition-colors whitespace-nowrap",
                active === tab.id
                  ? "border-cta text-cta font-medium"
                  : "border-transparent text-primary/60 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-[120px] pt-6">
        {active === "sources"     && <SourcesTab />}
        {active === "integration" && <PlaceholderTab title="Интеграция" />}
        {active === "payment"     && <PlaceholderTab title="Оплата" />}
        {active === "app-info"    && <PlaceholderTab title="Информация о приложении" />}
        {active === "db-info"     && <PlaceholderTab title="Информация о базе данных" />}
        {active === "partner"     && <PlaceholderTab title="Партнер" />}
        {active === "collab"      && <PlaceholderTab title="Сотрудничество" />}
        {active === "settings"    && <SettingsTab />}
      </div>
    </div>
  );
}

/* ── Tab content ── */

function SourcesTab() {
  return (
    <div>
      <h2 className="text-[20px] font-semibold text-primary mb-2">Источники учётной записи</h2>
      <p className="text-[14px] text-primary/60 mb-5">Доступ к этим источникам могут получить все приложения в этой учётной записи.</p>
      <button className="flex items-center gap-2 border border-cta text-cta rounded-[20px] px-4 py-2 text-[14px] font-medium hover:bg-[#EBF4FF] transition-colors">
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
        Добавить новые данные
      </button>
    </div>
  );
}

function SettingsTab() {
  const [weeklyReport,  setWeeklyReport]  = useState(true);
  const [allowStaff,    setAllowStaff]    = useState(true);
  const [defaultPath] = useState("/appsheet/data");

  return (
    <div>
      {/* Creator settings */}
      <h2 className="text-[20px] font-semibold text-primary mb-5">Настройки создателя приложения</h2>

      <div className="flex flex-col gap-5 max-w-[750px]">
        <div className="flex items-center justify-between">
          <span className="text-[15px] text-primary">Путь к папке по умолчанию</span>
          <button className="bg-[#EBF4FF] text-cta text-[14px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-[#d4eaff] transition-colors">
            {defaultPath}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[15px] text-primary">Отправлять еженедельные сводки?</span>
          <Checkmark checked={weeklyReport} onChange={setWeeklyReport} />
        </div>

        <div className="flex items-start justify-between gap-10">
          <div>
            <p className="text-[15px] text-primary">Разрешить доступ сотрудникам</p>
            <p className="text-[13px] text-primary/60 mt-0.5 leading-snug">
              Разрешить сотрудникам AppSheet доступ ко всем моим приложениям и связанным с ними данным
              в любое время для оказания поддержки и технического обслуживания?
            </p>
          </div>
          <Checkmark checked={allowStaff} onChange={setAllowStaff} />
        </div>

        <button className="w-fit bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors">
          Сохранить
        </button>
      </div>

      {/* Corporate settings */}
      <h2 className="text-[20px] font-semibold text-primary mb-2 mt-10">Настройки корпоративного плана</h2>
      <p className="text-[13px] text-primary/60 mb-4">
        Используйте этот раздел для настройки корпоративной учётной записи. Эти параметры доступны только корпоративным клиентам.
      </p>
      <button className="flex items-center gap-1.5 border border-cta text-cta rounded-[20px] px-4 py-1.5 text-[14px] hover:bg-[#EBF4FF] transition-colors">
        Узнать больше о планах OI
      </button>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-[20px] font-semibold text-primary mb-3">{title}</h2>
      <p className="text-[14px] text-primary/50">Содержимое раздела появится здесь.</p>
    </div>
  );
}

/* ── UI helpers ── */
function Checkmark({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="shrink-0 w-7 h-7 flex items-center justify-center"
    >
      {checked ? (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-cta" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-cardbg" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )}
    </button>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
      <path d="M2 4l4 4 4-4H2z" />
    </svg>
  );
}
