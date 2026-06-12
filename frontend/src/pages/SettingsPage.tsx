import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps, useUpdateApp } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";

const CATEGORY_OPTIONS = [
  "Проверки и обследования", "Выездное обслуживание", "Управление недвижимостью",
  "Продажи и CRM", "Управление запасами", "Управление персоналом",
  "Планирование проектов", "Обучение и тренинги", "Другое",
];
const FUNCTION_OPTIONS = ["Отслеживание", "Управление", "Анализ", "Уведомления", "Автоматизация"];
const INDUSTRY_OPTIONS = ["Розничная торговля", "Производство", "Услуги", "Образование", "Логистика", "Финансы", "Другое"];

interface AppInfoSettings {
  version?: string;
  short_desc?: string;
  category?: string;
  func?: string;
  industry?: string;
}

type SettingsSection =
  | "info"
  | "data-relations"
  | "data-inheritance"
  | "views-general"
  | "views-params"
  | "views-locale"
  | "performance"
  | "autonomous"
  | "integrations";

interface NavItem {
  id: SettingsSection;
  label: string;
  indent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "info",             label: "Информация" },
  { id: "data-relations",   label: "Отношения",             indent: true },
  { id: "data-inheritance", label: "Наследование",          indent: true },
  { id: "views-general",    label: "Общая информация",      indent: true },
  { id: "views-params",     label: "Параметры просмотра",   indent: true },
  { id: "views-locale",     label: "Локализация",           indent: true },
  { id: "performance",      label: "Производительность" },
  { id: "autonomous",       label: "Автономный режим" },
  { id: "integrations",     label: "Интеграции" },
];

const GROUP_HEADERS: Partial<Record<SettingsSection, string>> = {
  "data-relations":   "Данные",
  "views-general":    "Представления",
};

export function SettingsPage() {
  const [railModule, setRailModule] = useState<RailModule>("constructor");
  const [active, setActive]         = useState<SettingsSection>("info");

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const updateApp = useUpdateApp();
  const info = (app?.settings?.info as AppInfoSettings | undefined) ?? {};

  const [appName,    setAppName]    = useState("");
  const [version,    setVersion]    = useState("");
  const [shortDesc,  setShortDesc]  = useState("");
  const [category,   setCategory]   = useState("");
  const [func,       setFunc]       = useState("");
  const [industry,   setIndustry]   = useState("");
  const [saved,      setSaved]      = useState(false);

  // Hydrate the form whenever the active app resolves / changes.
  useEffect(() => {
    if (!app) return;
    setAppName(app.name);
    setVersion(info.version ?? String(app.version));
    setShortDesc(info.short_desc ?? app.description ?? "");
    setCategory(info.category ?? "");
    setFunc(info.func ?? "");
    setIndustry(info.industry ?? "");
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!app) return;
    setSaved(false);
    updateApp.mutate(
      {
        appId: app.id,
        body: {
          name: appName.trim() || app.name,
          description: shortDesc || null,
          settings: {
            ...app.settings,
            info: { version, short_desc: shortDesc, category, func, industry },
          },
        },
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Settings sidebar ── */}
      <aside
        className="absolute bg-white overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Настройки</span>
          <div className="flex items-center gap-3">
            <button className="text-yellow-500 hover:opacity-70">
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="text-primary/50 hover:text-primary">
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="py-2">
          {NAV_ITEMS.map((item) => {
            const header = GROUP_HEADERS[item.id];
            return (
              <div key={item.id}>
                {header && (
                  <div className="flex items-center gap-1 px-5 py-2 mt-1">
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary" fill="currentColor">
                      <path d="M2 4l6 6 6-6H2z" />
                    </svg>
                    <span className="text-[15px] font-semibold text-primary">{header}</span>
                  </div>
                )}
                <button
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "w-full text-left text-[15px] py-[7px] transition-colors",
                    item.indent ? "pl-[48px] pr-5" : "px-5",
                    active === item.id
                      ? "bg-[#EBF4FF] text-cta font-medium"
                      : "text-primary hover:bg-mainbg"
                  )}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 380, top: 70, width: 945, height: 1010 }}
      >
        {active === "info" && <InfoSection
          appName={appName}       setAppName={setAppName}
          version={version}       setVersion={setVersion}
          shortDesc={shortDesc}   setShortDesc={setShortDesc}
          category={category}     setCategory={setCategory}
          func={func}             setFunc={setFunc}
          industry={industry}     setIndustry={setIndustry}
          onSave={handleSave}
          saving={updateApp.isPending}
          saved={saved}
          disabled={!app}
        />}

        {(active === "data-relations" || active === "data-inheritance") && (
          <DataSection section={active} />
        )}

        {(active === "views-general" || active === "views-params" || active === "views-locale") && (
          <ViewsSection section={active} />
        )}

        {active === "performance" && <PerformanceSection />}
        {active === "autonomous"  && <AutonomousSection />}
        {active === "integrations" && <IntegrationsSection />}
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

/* ── Info section ── */
interface InfoProps {
  appName: string;    setAppName: (v: string) => void;
  version: string;    setVersion: (v: string) => void;
  shortDesc: string;  setShortDesc: (v: string) => void;
  category: string;   setCategory: (v: string) => void;
  func: string;       setFunc: (v: string) => void;
  industry: string;   setIndustry: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  disabled: boolean;
}

function InfoSection({ appName, setAppName, version, setVersion, shortDesc, setShortDesc, category, setCategory, func, setFunc, industry, setIndustry, onSave, saving, saved, disabled }: InfoProps) {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-4">Информация</h2>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#EBF4FF] rounded-[8px] px-4 py-3 mb-6">
        <svg viewBox="0 0 20 20" className="w-5 h-5 text-cta mt-0.5 shrink-0" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-[14px] text-primary/80">
          Настройте отображение информации для пользователей приложения и задайте свойства приложения
        </p>
      </div>

      <h3 className="text-[18px] font-semibold text-primary mb-4">Свойства приложения</h3>

      <div className="flex flex-col gap-5">
        <FieldRow label="Короткое название" hint="Уникальный (состоящий из одного слова) дескриптор для приложения">
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full bg-white border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary focus:outline-none focus:border-cta"
          />
        </FieldRow>

        <FieldRow label="Версия" hint="Основной и дополнительный номер версии. Увеличивайте основной номер версии при внесении существенных изменений в структуру столбцов приложения">
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full bg-white border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary focus:outline-none focus:border-cta"
          />
        </FieldRow>

        <FieldRow label="Короткое описание" hint="Описание приложения в одном предложении">
          <input
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            className="w-full bg-white border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary focus:outline-none focus:border-cta"
          />
        </FieldRow>

        <FieldRow label="Категория" hint="Категория приложения">
          <SelectField value={category} onChange={setCategory} placeholder="Выберите категорию" options={CATEGORY_OPTIONS} />
        </FieldRow>

        <FieldRow label="Функция" hint="Целевая функция приложения">
          <SelectField value={func} onChange={setFunc} placeholder="Выберите функцию" options={FUNCTION_OPTIONS} />
        </FieldRow>

        <FieldRow label="Отрасль" hint="Целевая отрасль приложения">
          <SelectField value={industry} onChange={setIndustry} placeholder="Выберите отрасль" options={INDUSTRY_OPTIONS} />
        </FieldRow>

        <FieldRow label="Теги" hint="Теги функций, используемые в этом приложении">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-cardbg rounded-[8px] px-3 py-2 min-h-[38px] flex items-center gap-2 flex-wrap" />
            <button className="w-8 h-8 flex items-center justify-center border border-cardbg rounded-[6px] hover:bg-white">
              <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-cardbg rounded-[6px] hover:bg-white text-mistake">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </FieldRow>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={onSave}
          disabled={disabled || saving}
          className="bg-cta text-white text-[15px] font-medium rounded-[20px] px-6 py-2 hover:bg-active transition-colors disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        {saved && !saving && <span className="text-[14px] text-[#20BE4F]">Сохранено</span>}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "220px 1fr" }}>
      <div>
        <p className="text-[15px] font-medium text-primary">{label}</p>
        <p className="text-[12px] text-primary/50 leading-snug mt-0.5">{hint}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SelectField({ value, onChange, placeholder, options = [] }: { value: string; onChange: (v: string) => void; placeholder: string; options?: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary appearance-none focus:outline-none focus:border-cta pr-8"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

/* ── Data section ── */
function DataSection({ section }: { section: "data-relations" | "data-inheritance" }) {
  const title = section === "data-relations" ? "Данные: Взаимосвязи" : "Данные: Наследование";
  const rows = [
    "В этом приложении есть коллекция Заказов",
    "В этом приложении есть коллекция Клиентов",
    "Клиент имеет много Заказов",
    "В этом приложении есть коллекция Заказов",
    "В этом приложении есть коллекция Клиентов",
    "Клиент имеет много Заказов",
    "В этом приложении есть коллекция Заказов",
    "В этом приложении есть коллекция Клиентов",
    "Клиент имеет много Заказов",
    "В этом приложении есть коллекция Заказов",
    "В этом приложении есть коллекция Клиентов",
    "Клиент имеет много Заказов",
  ];

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-4">{title}</h2>
      <div className="flex items-center gap-3 mb-4">
        <button className="w-8 h-8 flex items-center justify-center bg-white border border-cardbg rounded-[6px] hover:bg-mainbg">
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center bg-white border border-cardbg rounded-[6px] hover:bg-mainbg">
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="5" height="5" /><rect x="9" y="2" width="5" height="5" />
            <rect x="2" y="9" width="5" height="5" /><rect x="9" y="9" width="5" height="5" />
          </svg>
        </button>
        <span className="text-[15px] text-primary font-medium">Список</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div
            key={i}
            className="bg-white rounded-[6px] px-4 py-2 text-[14px] text-primary border border-cardbg hover:border-cta/40 cursor-pointer"
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Views section ── */
function ViewsSection({ section }: { section: "views-general" | "views-params" | "views-locale" }) {
  const titles: Record<typeof section, string> = {
    "views-general": "Представления: Общая информация",
    "views-params":  "Представления: Параметры просмотра",
    "views-locale":  "Представления: Локализация",
  };

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-6">{titles[section]}</h2>
      <div className="text-[15px] text-primary/60">Настройки появятся здесь.</div>
    </div>
  );
}

/* ── Performance section ── */
function PerformanceSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-4">Производительность</h2>
      <div className="bg-white rounded-[8px] border border-cardbg p-5 mb-4">
        <p className="text-[15px] font-semibold text-primary mb-1">Профиль производительности</p>
        <p className="text-[13px] text-primary/60 mb-4">Профиль производительности помогает понять и настроить производительность операций синхронизации</p>
        <button className="bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors">
          Анализатор производительности запуска
        </button>
      </div>
    </div>
  );
}

/* ── Autonomous section ── */
function AutonomousSection() {
  const [offlineEnabled, setOfflineEnabled] = useState(false);

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-4">Автономный режим</h2>
      <div className="bg-white rounded-[8px] border border-cardbg p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium text-primary">Автономное использование</p>
            <p className="text-[13px] text-primary/60 mt-0.5">Разрешить использование приложения без подключения к сети</p>
          </div>
          <button
            onClick={() => setOfflineEnabled(!offlineEnabled)}
            className={cn(
              "relative w-[46px] h-[26px] rounded-full transition-colors",
              offlineEnabled ? "bg-[#35A7FF]" : "bg-gray-300"
            )}
          >
            <span className={cn(
              "absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow transition-transform",
              offlineEnabled ? "translate-x-[23px]" : "translate-x-[3px]"
            )} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Integrations section ── */
function IntegrationsSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-4">Интеграции</h2>
      <div className="text-[15px] text-primary/60">Настройки интеграций появятся здесь.</div>
    </div>
  );
}
