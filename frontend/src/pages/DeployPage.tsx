import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";

type DeploySection = "deploy" | "versions" | "monitoring" | "upload";

const NAV_ITEMS: { id: DeploySection; label: string; icon: React.ReactNode }[] = [
  { id: "deploy",     label: "Развёртывание",                icon: <DeployIcon /> },
  { id: "versions",   label: "Версии",                       icon: <VersionIcon /> },
  { id: "monitoring", label: "Мониторинг",                   icon: <MonitorIcon /> },
  { id: "upload",     label: "Выгрузка приложения на IOS и Android", icon: <UploadIcon /> },
];

export function DeployPage() {
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [active, setActive]         = useState<DeploySection>("versions");

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sidebar ── */}
      <aside
        className="absolute bg-white overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="flex items-center px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Управление</span>
        </div>

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

        <div className="absolute bottom-0 left-0 right-0 border-t border-cardbg">
          <button className="w-full flex items-center gap-2 px-5 py-3 text-[13px] text-primary/60 hover:bg-mainbg transition-colors">
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
        {active === "deploy"     && <DeploySection />}
        {active === "versions"   && <VersionsSection />}
        {active === "monitoring" && <MonitoringSection />}
        {active === "upload"     && <UploadSection />}
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

/* ── Sections ── */

function VersionsSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-6">Версии</h2>
      <div className="flex flex-col gap-4">
        <InfoCard
          title="История версий"
          desc="Ознакомьтесь с предыдущими версиями приложения. При каждом изменении определения приложения создаётся новая версия"
        />
        <InfoCard
          title="Обновление приложения"
          desc="Обновите приложение до новой версии"
          action="Обновить"
          onAction={() => {}}
        />
        <InfoCard
          title="Стабильная версия"
          desc="Установите для своих пользователей определённую стабильную версию приложения, пока вы разрабатываете новые версии"
        />
      </div>
    </div>
  );
}

function DeploySection() {
  const checks = [
    { label: "Предупреждения и ошибки при определении приложения", status: "error" as const },
    { label: "Предупреждения и ошибки при определении приложения", status: "error" as const },
    { label: "Приложение надоступно для запуска", status: "info" as const },
    { label: "Ошибки в определении приложения", status: "warn" as const },
    { label: "Ошибки в определении приложения", status: "warn" as const },
    { label: "Пожалуйста, укажите сферу применения вашего приложения", status: "info" as const },
    { label: "Данные соответствуют ожидаемой структуре", status: "success" as const },
    { label: "Данные соответствуют ожидаемой структуре", status: "success" as const },
  ];

  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Развёртывание</h2>
      <p className="text-[14px] text-primary/60 mb-5">Пройдите проверку, прежде чем использовать приложение в режиме, отличном от тестового.</p>

      <button className="bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors mb-6">
        Запустить проверку развёртывания
      </button>

      <p className="text-[15px] font-semibold text-primary mb-4">
        Ваше приложение не готово к запуску. Пожалуйста, исправьте указанные ошибки.
      </p>

      <div className="flex flex-col gap-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-[6px] border border-cardbg px-4 py-2">
            <span className="text-[14px] text-primary">{c.label}</span>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button className="bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors">
          Продолжить редактирование
        </button>
        <button className="border border-cta text-cta text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-[#EBF4FF] transition-colors">
          Развернуть несмотря на ошибки
        </button>
      </div>
    </div>
  );
}

function MonitoringSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-6">Мониторинг</h2>
      <div className="flex flex-col gap-4">
        <InfoCard
          title="Монитор автоматизаций"
          desc="Следите за выполнением автоматизированных процессов и показателями."
          action="Монитор автоматизации запуска"
          onAction={() => {}}
        />
        <InfoCard
          title="Статистика использования"
          desc="Эти графики показывают фактическое использование приложения."
          action="Получить статистику использования"
          onAction={() => {}}
        />
        <InfoCard
          title="Профиль производительности"
          desc="Профиль производительности помогает понять и настроить производительность операций синхронизации"
          action="Анализатор производительности запуска"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}

function UploadSection() {
  return (
    <div className="px-[40px] py-[25px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Выгрузка приложения на IOS и Android</h2>
      <p className="text-[14px] text-primary/60 mb-6">Опубликуйте приложение в Apple App Store или Google Play.</p>
      <div className="flex flex-col gap-4">
        <InfoCard title="App Store (iOS)" desc="Подготовьте и загрузите приложение в Apple App Store" action="Начать" onAction={() => {}} />
        <InfoCard title="Google Play (Android)" desc="Подготовьте и загрузите приложение в Google Play Store" action="Начать" onAction={() => {}} />
      </div>
    </div>
  );
}

/* ── Helpers ── */
function InfoCard({ title, desc, action, onAction }: { title: string; desc: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-[8px] border border-cardbg px-5 py-4">
      <p className="text-[16px] font-semibold text-primary mb-1">{title}</p>
      <p className="text-[13px] text-primary/60 mb-3">{desc}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="bg-cta text-white text-[14px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-active transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "error" | "warn" | "success" | "info" }) {
  const map = {
    error:   { bg: "bg-[#FFEBEE]", text: "text-[#D32F2F]", label: "Ошибка" },
    warn:    { bg: "bg-[#FFF8E1]", text: "text-[#E65100]", label: "Предупреждение" },
    success: { bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]", label: "Успешно" },
    info:    { bg: "bg-[#EBF4FF]", text: "text-cta",        label: "Подробная информация" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("text-[12px] font-medium px-3 py-1 rounded-[20px]", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

/* ── Icons ── */
const stroke = "#00205F";

function DeployIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 3l7 7-7 7M3 10h14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VersionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="1.5" />
      <path d="M10 6v4l3 2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <rect x="2" y="3" width="16" height="11" rx="2" stroke={stroke} strokeWidth="1.5" />
      <path d="M7 17h6M10 14v3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 10l2-3 3 4 2-2 3 1" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 13V5M7 8l3-3 3 3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
