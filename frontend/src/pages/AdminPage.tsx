import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/cn";

/* ── Types ── */
type AdminSection = "home" | "logs" | "users" | "apps" | "databases";

/* ── Admin Sidebar ── */
const adminItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: "home",      label: "Главная",      icon: <HomeIcon /> },
  { id: "logs",      label: "Логи",         icon: <LogsIcon /> },
  { id: "users",     label: "Пользователи", icon: <UsersIcon /> },
  { id: "apps",      label: "Приложения",   icon: <AppsIcon /> },
  { id: "databases", label: "Базы данных",  icon: <DbIcon /> },
];

function AdminSidebar({
  active,
  onChange,
}: {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
}) {
  return (
    <aside
      className="absolute left-0 top-[70px] w-[280px] h-[1010px] flex"
      style={{ padding: "0 15px 12px" }}
    >
      <nav className="flex flex-col w-[250px] gap-[15px]">
        {adminItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "nav-item",
              active === item.id && "active"
            )}
          >
            <span className="w-[25px] h-[25px] shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ── Dashboard (Главная) ── */
function StatRow({
  label,
  active,
  inDev,
  total,
}: {
  label: string;
  active: number;
  inDev: number;
  total: number;
}) {
  return (
    <div className="flex justify-between items-center w-full">
      <span className="text-info text-primary w-[117px]">{label}</span>
      <span className="text-info text-primary text-center w-[75px]">{active}</span>
      <span className="text-info text-primary text-center w-[120px]">{inDev}</span>
      <span className="text-info text-[#35A7FF] text-center w-[52px]">{total}</span>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  maxLabel,
}: {
  label: string;
  value: number;
  maxLabel: string;
}) {
  return (
    <div className="flex items-center gap-[39px] w-[571px]">
      <span className="text-info text-primary w-[50px] shrink-0">{label}</span>
      <div className="flex items-center gap-5">
        <div className="w-[345px] h-6 bg-cardbg rounded-[30px] overflow-hidden">
          <div
            className="h-full bg-cta rounded-[30px]"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-info text-cta w-[120px]">{maxLabel}</span>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="flex flex-col gap-[70px] h-full">
      {/* Header */}
      <div className="flex flex-col gap-[10px]">
        <h1 className="text-[40px] font-bold text-primary leading-[150%]">
          Панель администратора
        </h1>
        <p className="text-[24px] font-medium text-primary leading-[150%]">
          Обзор состояния платформы и ключевых метрик в реальном времени
        </p>
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap gap-x-5 gap-y-[50px]">
        {/* Card 1: Apps & Databases */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_20px] flex flex-col gap-[30px] w-[544px]">
          <h2 className="text-card-h font-semibold text-primary">Приложения и базы данных</h2>
          <div className="flex gap-[50px] items-end">
            {/* Legend column */}
            <div className="flex flex-col gap-[25px]">
              <div className="flex flex-col gap-[25px]">
                <span className="text-info text-primary">Базы данных</span>
                <span className="text-info text-primary">Приложения</span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 flex flex-col gap-[25px]">
              <div className="flex justify-between text-info">
                <span className="text-[#20BE4F] w-[75px]">Активно</span>
                <span className="text-[#FFA600] w-[120px]">В разработке</span>
                <span className="text-cta w-[52px]">Всего</span>
              </div>
              <StatRow label="" active={2} inDev={10} total={12} />
              <StatRow label="" active={2} inDev={10} total={12} />
            </div>
          </div>
        </div>

        {/* Card 2: System Health */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_20px] flex flex-col gap-[30px] w-[611px]">
          <h2 className="text-card-h font-semibold text-primary">Панель системного здоровья</h2>
          <div className="flex flex-col gap-5">
            <ProgressBar label="vCPU"   value={30} maxLabel="30%" />
            <ProgressBar label="RAM"    value={30} maxLabel="30%" />
            <ProgressBar label="API"    value={23} maxLabel="2,340/10,000" />
            <ProgressBar label="GPU"    value={30} maxLabel="30%" />
            <ProgressBar label="Память" value={25} maxLabel="2,5 Гб / 10 Гб" />
          </div>
        </div>

        {/* Card 3: Warnings */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_20px] flex flex-col gap-[30px] w-[315px]">
          <h2 className="text-card-h font-semibold text-[#FFA600]">Предупреждения</h2>
          <div className="flex gap-[30px]">
            <div className="flex flex-col gap-[10px] flex-1">
              {["ошибки сборок", "ошибки БД", "инциденты безопасности", "интеграции недоступны"].map(
                (w) => (
                  <span key={w} className="text-info text-primary">{w}</span>
                )
              )}
            </div>
            <div className="flex flex-col gap-[5px]">
              {[5, 1, 0, 0].map((n, i) => (
                <span key={i} className="text-info text-primary w-[12px]">{n}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Tariff distribution */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_0_30px_0] flex flex-col gap-0 w-[544px]">
          <h2 className="text-card-h font-semibold text-primary px-5 mb-5">Распределение по тарифам</h2>
          <div className="flex items-center justify-between px-5">
            {/* Pie chart placeholder */}
            <div className="relative w-[200px] h-[200px] shrink-0">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="80" fill="#35A7FF" />
                <path d="M100 100 L100 20 A80 80 0 0 1 169 140 Z" fill="#20BE4F" />
                <path d="M100 100 L169 140 A80 80 0 0 1 31 140 Z" fill="#FFA600" />
                <circle cx="100" cy="100" r="40" fill="white" />
              </svg>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-[30px]">
              {[
                { color: "#35A7FF", label: "Бесплатный" },
                { color: "#20BE4F", label: "Про план" },
                { color: "#FFA600", label: "Бизнес план" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-6">
                  <div className="w-[42px] h-[25px] rounded-sm shrink-0" style={{ background: t.color }} />
                  <span className="text-info text-primary">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 5: New users chart */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_0_30px_0] flex flex-col gap-5 w-[625px]">
          <h2 className="text-card-h font-semibold text-primary px-5">Новые пользователи (чел./день)</h2>
          <div className="flex items-start px-5">
            {/* Y-axis */}
            <div className="flex flex-col gap-[15px] w-[75px] shrink-0">
              {[50, 40, 30, 20, 10, 0].map((v) => (
                <span key={v} className="text-info text-primary text-center">{v}</span>
              ))}
            </div>
            {/* Bar chart placeholder */}
            <div className="flex-1 flex items-end justify-around h-[193px] border-b-2 border-l-2 border-cta px-2">
              {[35, 20, 45, 30, 50, 25, 40].map((h, i) => (
                <div
                  key={i}
                  className="w-[40px] bg-cta rounded-t-sm"
                  style={{ height: `${(h / 50) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Logs ── */
const LOG_TABS = [
  { id: "user",  label: "Действия пользователя" },
  { id: "admin", label: "Действия администратора" },
];

const MOCK_LOGS = [
  { time: "2026-05-29 12:03", user: "ivan@mail.ru",   action: "Создал проект «Fitness App»",       level: "info" },
  { time: "2026-05-29 11:55", user: "admin",           action: "Изменил роль пользователя",          level: "warn" },
  { time: "2026-05-29 11:40", user: "anna@corp.ru",    action: "Экспортировал базу данных",          level: "info" },
  { time: "2026-05-29 11:12", user: "dev@example.com", action: "Ошибка сборки прототипа",            level: "error" },
  { time: "2026-05-29 10:58", user: "ivan@mail.ru",    action: "Добавил пользователя в проект",      level: "info" },
  { time: "2026-05-29 10:30", user: "anna@corp.ru",    action: "Изменил настройки безопасности",    level: "warn" },
];

const levelColors: Record<string, string> = {
  info:  "text-primary",
  warn:  "text-[#FFA600]",
  error: "text-[#C22A2A]",
};

function AdminLogs() {
  const [activeTab, setActiveTab] = useState("user");

  return (
    <div className="flex flex-col gap-[40px]">
      <div className="flex flex-col gap-[10px]">
        <h1 className="text-[40px] font-bold text-primary leading-[150%]">Логи и мониторинг</h1>
        <p className="text-[24px] font-medium text-primary leading-[150%]">
          Обзор состояния платформы и ключевых метрик в реальном времени
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center bg-white rounded-tab p-[3.6px] gap-2 self-start">
        {LOG_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-5 py-[3.6px] rounded-tab text-info text-primary transition-colors",
              activeTab === t.id ? "bg-cardbg font-semibold" : "hover:bg-mainbg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              <th className="text-left px-6 py-3 text-info font-semibold text-primary">Время</th>
              <th className="text-left px-6 py-3 text-info font-semibold text-primary">Пользователь</th>
              <th className="text-left px-6 py-3 text-info font-semibold text-primary">Действие</th>
              <th className="text-left px-6 py-3 text-info font-semibold text-primary">Уровень</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_LOGS.map((log, i) => (
              <tr key={i} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta text-primary font-mono">{log.time}</td>
                <td className="px-6 py-3 text-meta text-primary">{log.user}</td>
                <td className={cn("px-6 py-3 text-meta", levelColors[log.level])}>{log.action}</td>
                <td className={cn("px-6 py-3 text-meta font-semibold", levelColors[log.level])}>
                  {log.level.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Users ── */
const MOCK_USERS = [
  { name: "Иван Петров",   email: "ivan@mail.ru",    role: "Пользователь", plan: "Про план",    status: "Активен",    created: "01.01.2026" },
  { name: "Анна Соколова", email: "anna@corp.ru",    role: "Пользователь", plan: "Бизнес план", status: "Активен",    created: "15.02.2026" },
  { name: "dev",           email: "dev@example.com", role: "Разработчик",  plan: "Бесплатный",  status: "В разработке", created: "20.03.2026" },
  { name: "Мария Иванова", email: "maria@mail.ru",   role: "Пользователь", plan: "Про план",    status: "Активен",    created: "05.04.2026" },
  { name: "Сергей Орлов",  email: "sergei@biz.ru",   role: "Пользователь", plan: "Бизнес план", status: "Активен",    created: "10.04.2026" },
];

function AdminUsers() {
  return (
    <div className="flex flex-col gap-[70px]">
      <h1 className="text-[40px] font-bold text-primary leading-[150%]">Пользователи</h1>
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Имя", "Email", "Роль", "Тариф", "Статус", "Создан"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((u, i) => (
              <tr key={i} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta font-semibold text-primary">{u.name}</td>
                <td className="px-6 py-3 text-meta text-primary">{u.email}</td>
                <td className="px-6 py-3 text-meta text-primary">{u.role}</td>
                <td className="px-6 py-3 text-meta text-primary">{u.plan}</td>
                <td className={cn("px-6 py-3 text-meta font-semibold",
                  u.status === "Активен" ? "text-[#20BE4F]" : "text-[#FFA600]"
                )}>
                  {u.status}
                </td>
                <td className="px-6 py-3 text-meta text-primary">{u.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Apps ── */
const MOCK_APPS = [
  { name: "Fitness App",  owner: "ivan@mail.ru",   status: "Прототип",    db: "3 таблицы",  modified: "6 дн. назад" },
  { name: "Delivery App", owner: "anna@corp.ru",   status: "В разработке", db: "5 таблиц",  modified: "2 дн. назад" },
  { name: "HR Portal",    owner: "maria@mail.ru",  status: "Активен",     db: "8 таблиц",  modified: "1 дн. назад" },
  { name: "CRM System",   owner: "sergei@biz.ru",  status: "Активен",     db: "12 таблиц", modified: "3 часа назад" },
];

const appStatusColor: Record<string, string> = {
  "Прототип":     "text-[#35A7FF]",
  "В разработке": "text-[#FFA600]",
  "Активен":      "text-[#20BE4F]",
};

function AdminApps() {
  return (
    <div className="flex flex-col gap-[70px]">
      <h1 className="text-[40px] font-bold text-primary leading-[150%]">Приложения</h1>
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Название", "Владелец", "Статус", "БД", "Изменён"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_APPS.map((a, i) => (
              <tr key={i} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta font-semibold text-primary">{a.name}</td>
                <td className="px-6 py-3 text-meta text-primary">{a.owner}</td>
                <td className={cn("px-6 py-3 text-meta font-semibold", appStatusColor[a.status])}>{a.status}</td>
                <td className="px-6 py-3 text-meta text-primary">{a.db}</td>
                <td className="px-6 py-3 text-meta text-primary">{a.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Databases ── */
const MOCK_DBS = [
  { name: "fitness_db",  app: "Fitness App",  tables: 3,  rows: 1240,  size: "12 МБ",  status: "Активна" },
  { name: "delivery_db", app: "Delivery App", tables: 5,  rows: 8300,  size: "45 МБ",  status: "Активна" },
  { name: "hr_db",       app: "HR Portal",    tables: 8,  rows: 2100,  size: "28 МБ",  status: "Активна" },
  { name: "crm_db",      app: "CRM System",   tables: 12, rows: 54200, size: "320 МБ", status: "Активна" },
];

function AdminDatabases() {
  return (
    <div className="flex flex-col gap-[70px]">
      <h1 className="text-[40px] font-bold text-primary leading-[150%]">Базы данных</h1>
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Имя базы", "Приложение", "Таблиц", "Строк", "Размер", "Статус"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_DBS.map((db, i) => (
              <tr key={i} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta font-semibold text-primary font-mono">{db.name}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.app}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.tables}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.rows.toLocaleString("ru")}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.size}</td>
                <td className="px-6 py-3 text-meta font-semibold text-[#20BE4F]">{db.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main export ── */
export function AdminPage() {
  const [section, setSection] = useState<AdminSection>("home");

  const contentMap: Record<AdminSection, React.ReactNode> = {
    home:      <AdminDashboard />,
    logs:      <AdminLogs />,
    users:     <AdminUsers />,
    apps:      <AdminApps />,
    databases: <AdminDatabases />,
  };

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <AdminSidebar active={section} onChange={setSection} />

      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{
          left: 280,
          top: 70,
          width: 1625,
          height: 1000,
          borderRadius: 20,
          padding: 40,
        }}
      >
        {contentMap[section]}
      </main>
    </div>
  );
}

/* ── Icons ── */
function HomeIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <path d="M3 10 L12.5 3 L22 10 L22 22 L3 22 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="9" y="15" width="7" height="7" fill="#00205F" rx="1"/>
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <rect x="4" y="2" width="17" height="21" rx="2" stroke="#00205F" strokeWidth="2"/>
      <line x1="8" y1="8"  x2="17" y2="8"  stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="17" y2="12" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="13" y2="16" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 29 29" fill="none" className="w-full h-full">
      <circle cx="14.5" cy="10" r="5" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 26 C4 20 8.5 17 14.5 17 C20.5 17 25 20 25 26" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function AppsIcon() {
  return (
    <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
      <rect x="4" y="1" width="15" height="21" rx="3" stroke="#00205F" strokeWidth="2"/>
      <circle cx="11.5" cy="18.5" r="1" fill="#00205F"/>
    </svg>
  );
}

function DbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 6 L4 18 C4 19.66 7.58 21 12 21 C16.42 21 20 19.66 20 18 L20 6" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke="#00205F" strokeWidth="2"/>
    </svg>
  );
}
