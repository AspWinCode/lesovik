import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/cn";
import { useUsers, useDeactivateUser, useUpdateUser, useInviteUser, useRoles } from "@/shared/hooks/useUsers";
import { useAuditLogs } from "@/shared/hooks/useAuditLogs";
import { useApps } from "@/shared/hooks/useApps";
import { useOrgs, useCreateOrg, useUpdateOrg } from "@/shared/hooks/useOrgs";
import { useAuthStore } from "@/shared/auth/store";

/* ── Types ── */
type AdminSection = "home" | "orgs" | "logs" | "users" | "apps" | "databases";

const ALL_ADMIN_ITEMS: { id: AdminSection; label: string; icon: React.ReactNode; platformOnly?: boolean }[] = [
  { id: "home",      label: "Главная",        icon: <HomeIcon /> },
  { id: "orgs",      label: "Организации",    icon: <OrgsIcon />, platformOnly: true },
  { id: "users",     label: "Пользователи",   icon: <UsersIcon /> },
  { id: "apps",      label: "Приложения",     icon: <AppsIcon />, platformOnly: true },
  { id: "databases", label: "Базы данных",    icon: <DbIcon />, platformOnly: true },
  { id: "logs",      label: "Журнал аудита",  icon: <LogsIcon /> },
];

function AdminSidebar({
  active,
  onChange,
  items,
}: {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
  items: typeof ALL_ADMIN_ITEMS;
}) {
  return (
    <aside
      className="absolute left-0 top-[70px] w-[280px] h-[1010px] flex"
      style={{ padding: "0 15px 12px" }}
    >
      <nav className="flex flex-col w-[250px] gap-[15px]">
        {items.map((item) => (
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
  const { data: appsData } = useApps();
  const { data: usersData } = useUsers();

  const totalApps = appsData?.total ?? 0;
  const activeApps = appsData?.items.filter((a) => a.is_published).length ?? 0;
  const devApps = totalApps - activeApps;

  const totalUsers = usersData?.total ?? 0;
  const activeUsers = usersData?.items.filter((u) => u.is_active).length ?? 0;

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
        {/* Card 1: Apps & Users */}
        <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[30px_20px] flex flex-col gap-[30px] w-[544px]">
          <h2 className="text-card-h font-semibold text-primary">Приложения и пользователи</h2>
          <div className="flex gap-[50px] items-end">
            {/* Legend column */}
            <div className="flex flex-col gap-[25px]">
              <div className="flex flex-col gap-[25px]">
                <span className="text-info text-primary">Пользователи</span>
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
              <StatRow label="" active={activeUsers} inDev={totalUsers - activeUsers} total={totalUsers} />
              <StatRow label="" active={activeApps} inDev={devApps} total={totalApps} />
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

interface LogEntry {
  time: string;
  user: string;
  action: string;
  level: "info" | "warn" | "error";
  ip: string;
  device: string;
  json: string;
}

const levelColors: Record<string, string> = {
  info:  "text-primary",
  warn:  "text-[#FFA600]",
  error: "text-[#C22A2A]",
};

const ACTION_LABELS: Record<string, string> = {
  login:            "Вход в систему",
  login_ldap:       "Вход через LDAP",
  login_yandex:     "Вход через Яндекс ID",
  user_created:     "Создание пользователя",
  user_invited:     "Приглашение пользователя",
  user_updated:     "Изменение пользователя",
  user_deactivated: "Деактивация пользователя",
};

function AdminLogs() {
  const [activeTab, setActiveTab] = useState("user");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const { data: rawLogs, isLoading } = useAuditLogs({ limit: 100 });
  const user = useAuthStore((s) => s.user);
  const isOrgAdmin = user?.roles.some((r) => r.id === "org_admin") &&
    !user?.roles.some((r) => r.id === "platform_admin");

  const logs: LogEntry[] = (rawLogs ?? []).map((e) => ({
    time:   new Date(e.created_at).toLocaleString("ru", { dateStyle: "short", timeStyle: "short" }),
    user:   e.actor_email ?? e.user_id ?? "—",
    action: ACTION_LABELS[e.action] ?? e.action,
    level:  e.level as "info" | "warn" | "error",
    ip:     e.ip_address ?? "—",
    device: e.user_agent ?? "—",
    json:   JSON.stringify({ action: e.action, resource: e.resource_type, id: e.resource_id, ...e.details }, null, 2),
  }));

  return (
    <div className="flex gap-[30px] items-start">
      {/* Left: list */}
      <div className="flex flex-col gap-[40px] flex-1 min-w-0">
        <div className="flex flex-col gap-[10px]">
          <h1 className="text-[40px] font-bold text-primary leading-[150%]">Журнал аудита</h1>
          <p className="text-[24px] font-medium text-primary leading-[150%]">
            История действий пользователей в системе
          </p>
          {isOrgAdmin && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-[10px] px-4 py-2 self-start">
              <span className="text-[14px] text-blue-700">
                Отображаются только действия пользователей вашей организации
              </span>
            </div>
          )}
        </div>

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
              {isLoading && (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-primary/50 text-[16px]">Загрузка…</td></tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-primary/50 text-[16px]">Записей пока нет</td></tr>
              )}
              {logs.map((log, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedLog(log === selectedLog ? null : log)}
                  className={cn(
                    "border-t border-mainbg cursor-pointer transition-colors",
                    log === selectedLog ? "bg-selected" : "hover:bg-mainbg/40"
                  )}
                >
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

      {/* Right: detail panel */}
      {selectedLog && <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}

/** Download a single audit log entry as a JSON file. */
function exportLog(log: LogEntry): void {
  const payload = {
    time: log.time, user: log.user, action: log.action,
    level: log.level, ip: log.ip, device: log.device,
    details: safeParse(log.json),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

function LogDetailPanel({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const criticalityLabel: Record<string, { label: string; color: string }> = {
    info:  { label: "Низкий",   color: "#20BE4F" },
    warn:  { label: "Средний",  color: "#FFA600" },
    error: { label: "Высокий",  color: "#C22A2A" },
  };
  const crit = criticalityLabel[log.level];

  return (
    <div className="w-[420px] shrink-0 bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-mainbg">
        <span className="text-[22px] font-bold text-primary">Детали действия</span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mainbg transition-colors"
          aria-label="Закрыть"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M3 3 L13 13 M13 3 L3 13" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-[12px] px-6 py-5">
        {[
          { label: "Пользователь", value: log.user },
          { label: "Действие",     value: log.action },
          { label: "Время",        value: log.time },
          { label: "IP",           value: log.ip },
          { label: "Устройство",   value: log.device },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-[2px]">
            <span className="text-[13px] text-primary/60">{label}</span>
            <span className="text-[16px] text-primary">{value}</span>
          </div>
        ))}
        <div className="flex flex-col gap-[2px]">
          <span className="text-[13px] text-primary/60">Уровень критичности</span>
          <span className="text-[16px] font-semibold" style={{ color: crit.color }}>{crit.label}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-[15px] px-6 pb-5">
        <button
          disabled
          title="В разработке"
          className="flex-1 h-[38px] border-2 border-cta/40 rounded-[20px] text-[14px] font-semibold text-cta/40 cursor-not-allowed"
        >
          Пометить как решённое
        </button>
        <button
          onClick={() => exportLog(log)}
          className="flex-1 h-[38px] border-2 border-cta rounded-[20px] text-[14px] font-semibold text-cta hover:bg-selected transition-colors"
        >
          Экспорт данных
        </button>
      </div>

      {/* JSON log */}
      <div className="flex flex-col gap-[10px] px-6 pb-6">
        <span className="text-[18px] font-bold text-primary">Подробное сообщение лога</span>
        <div className="bg-selected rounded-[5px] p-4">
          <div className="text-[12px] font-semibold text-primary/60 mb-2">JSON / TEXT</div>
          <pre className="text-[13px] text-primary font-mono whitespace-pre-wrap break-all">{log.json}</pre>
        </div>
      </div>
    </div>
  );
}

/* ── Invite dialog ── */
function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const { data: rolesData } = useRoles();
  const invite = useInviteUser();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name) return;
    invite.mutate(
      { email, display_name: name, roles: role ? [role] : [] },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[10px] shadow-lg w-[480px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-mainbg">
          <span className="text-[22px] font-bold text-primary">Пригласить пользователя</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mainbg">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M3 3L13 13M13 3L3 13" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 py-6">
          <div className="flex flex-col gap-1">
            <label className="text-[14px] text-primary/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@company.ru"
              className="h-[42px] px-4 bg-mainbg rounded-[5px] text-[16px] text-primary outline-none border border-transparent focus:border-cta"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[14px] text-primary/60">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Иванов Иван"
              className="h-[42px] px-4 bg-mainbg rounded-[5px] text-[16px] text-primary outline-none border border-transparent focus:border-cta"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[14px] text-primary/60">Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-[42px] px-4 bg-mainbg rounded-[5px] text-[16px] text-primary outline-none border border-transparent focus:border-cta"
            >
              <option value="">— без роли —</option>
              {(rolesData ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
          {invite.isError && (
            <p className="text-[14px] text-[#C22A2A]">Ошибка приглашения. Попробуйте снова.</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="h-[38px] px-6 border border-primary/30 rounded-[20px] text-[14px] text-primary hover:bg-mainbg">
              Отмена
            </button>
            <button type="submit" disabled={invite.isPending}
              className="h-[38px] px-6 bg-cta rounded-[20px] text-[14px] font-semibold text-white hover:bg-cta/90 disabled:opacity-50">
              {invite.isPending ? "Отправка…" : "Пригласить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Users ── */
function AdminUsers() {
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data, isLoading } = useUsers(search ? { search } : undefined);
  const deactivate = useDeactivateUser();
  const activate = useUpdateUser();

  const users = data?.items ?? [];

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="flex flex-col gap-[40px]">
      {inviteOpen && <InviteUserDialog onClose={() => setInviteOpen(false)} />}
      <div className="flex items-center justify-between">
        <h1 className="text-[40px] font-bold text-primary leading-[150%]">Пользователи</h1>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 h-[42px] px-6 bg-cta rounded-[20px] text-[16px] font-semibold text-white hover:bg-cta/90 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
            <line x1="10" y1="3" x2="10" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="10" x2="17" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Пригласить
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-[15px]">
        <div className="flex items-center gap-[10px] w-[400px] h-[42px] px-5 bg-white rounded-[30px] shadow-sm">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0">
            <circle cx="9" cy="9" r="6" stroke="#00205F" strokeWidth="1.8" />
            <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или email…"
            className="flex-1 bg-transparent text-[16px] text-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Имя", "Email", "Роли", "Статус", "Последний вход", "Создан", ""].map((h, i) => (
                <th key={i} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-primary/50 text-[16px]">Загрузка…</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-4 text-center text-primary/50 text-[16px]">Пользователи не найдены</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta font-semibold text-primary">{u.display_name}</td>
                <td className="px-6 py-3 text-meta text-primary">{u.email}</td>
                <td className="px-6 py-3 text-meta text-primary">
                  {u.roles.length > 0 ? u.roles.map((r) => r.display_name).join(", ") : "—"}
                </td>
                <td className={cn("px-6 py-3 text-meta font-semibold",
                  u.is_active ? "text-[#20BE4F]" : "text-[#FFA600]"
                )}>
                  {u.is_active ? "Активен" : "Неактивен"}
                </td>
                <td className="px-6 py-3 text-meta text-primary">
                  {u.last_login_at ? fmtDate(u.last_login_at) : "—"}
                </td>
                <td className="px-6 py-3 text-meta text-primary">{fmtDate(u.created_at)}</td>
                <td className="px-6 py-3">
                  {u.is_active ? (
                    <button
                      onClick={() => deactivate.mutate(u.id)}
                      className="text-[14px] text-[#C22A2A] hover:underline"
                    >
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      onClick={() => activate.mutate({ userId: u.id, body: { is_active: true } })}
                      className="text-[14px] text-[#20BE4F] hover:underline"
                    >
                      Активировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Apps ── */
function AdminApps() {
  const { data, isLoading } = useApps();
  const apps = data?.items ?? [];

  function fmtRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins} мин. назад`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ч. назад`;
    const days = Math.floor(hrs / 24);
    return `${days} дн. назад`;
  }

  function appStatus(app: { is_published: boolean; is_archived: boolean }) {
    if (app.is_archived) return { label: "В архиве", cls: "text-[#8898AA]" };
    if (app.is_published) return { label: "Активен",      cls: "text-[#20BE4F]" };
    return { label: "В разработке", cls: "text-[#FFA600]" };
  }

  return (
    <div className="flex flex-col gap-[40px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[40px] font-bold text-primary leading-[150%]">Приложения</h1>
        <span className="text-[18px] text-primary/60">{data?.total != null ? `Всего: ${data.total}` : ""}</span>
      </div>
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Название", "Описание", "Статус", "Версия", "Изменён"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-primary/50 text-[16px]">Загрузка…</td></tr>
            )}
            {!isLoading && apps.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-primary/50 text-[16px]">Приложений нет</td></tr>
            )}
            {apps.map((a) => {
              const st = appStatus(a);
              return (
                <tr key={a.id} className="border-t border-mainbg hover:bg-mainbg/40">
                  <td className="px-6 py-3 text-meta font-semibold text-primary">{a.name}</td>
                  <td className="px-6 py-3 text-meta text-primary max-w-[260px] truncate">{a.description ?? "—"}</td>
                  <td className={cn("px-6 py-3 text-meta font-semibold", st.cls)}>{st.label}</td>
                  <td className="px-6 py-3 text-meta text-primary">v{a.version}</td>
                  <td className="px-6 py-3 text-meta text-primary">{fmtRelative(a.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Databases ── */
export interface DbRow {
  name: string;
  app: string;
  status: string;
  statusCls: string;
  version: string;
}

/** Map backend apps into the per-app database rows shown in the admin table. */
export function appsToDbRows(
  apps: { slug: string; name: string; is_published: boolean; is_archived: boolean; version: number }[],
): DbRow[] {
  return apps.map((a) => {
    const status = a.is_archived ? "В архиве" : a.is_published ? "Активна" : "В разработке";
    const statusCls = a.is_archived ? "text-[#8898AA]" : a.is_published ? "text-[#20BE4F]" : "text-[#FFA600]";
    return { name: `${a.slug}_db`, app: a.name, status, statusCls, version: `v${a.version}` };
  });
}

function AdminDatabases() {
  const { data, isLoading } = useApps();
  const rows = appsToDbRows(data?.items ?? []);

  return (
    <div className="flex flex-col gap-[70px]">
      <h1 className="text-[40px] font-bold text-primary leading-[150%]">Базы данных</h1>
      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-mainbg">
            <tr>
              {["Имя базы", "Приложение", "Версия", "Статус"].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-info font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-primary/50 text-[16px]">Загрузка…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-primary/50 text-[16px]">Баз данных нет</td></tr>
            )}
            {rows.map((db, i) => (
              <tr key={i} className="border-t border-mainbg hover:bg-mainbg/40">
                <td className="px-6 py-3 text-meta font-semibold text-primary font-mono">{db.name}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.app}</td>
                <td className="px-6 py-3 text-meta text-primary">{db.version}</td>
                <td className={cn("px-6 py-3 text-meta font-semibold", db.statusCls)}>{db.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Organisations ── */
const PLAN_LABELS: Record<string, string> = {
  trial:    "Trial",
  pro:      "Про",
  business: "Бизнес",
};

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    display_name: "",
    slug: "",
    plan: "trial",
    admin_email: "",
    admin_display_name: "",
    admin_password: "",
  });
  const create = useCreateOrg();

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: onClose });
  }

  const fields: { key: keyof typeof form; label: string; type?: string; placeholder: string }[] = [
    { key: "display_name",      label: "Название организации",  placeholder: "ООО Ромашка" },
    { key: "slug",              label: "Slug (ID)",             placeholder: "romashka" },
    { key: "plan",              label: "Тариф",                 placeholder: "trial" },
    { key: "admin_email",       label: "Email администратора",  type: "email", placeholder: "admin@company.ru" },
    { key: "admin_display_name",label: "Имя администратора",    placeholder: "Иван Петров" },
    { key: "admin_password",    label: "Пароль администратора", type: "password", placeholder: "••••••••••" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,32,95,0.15)] w-[540px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#cbe3ff]">
          <span className="text-[24px] font-bold text-primary">Создать организацию</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mainbg"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M3 3L13 13M13 3L3 13" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 py-6">
          {fields.map(({ key, label, type = "text", placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[14px] font-semibold text-primary">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required
                placeholder={placeholder}
                className="h-[44px] px-4 bg-mainbg rounded-[8px] text-[15px] text-primary outline-none border border-[#cbe3ff] focus:border-cta"
              />
            </div>
          ))}
          {create.isError && (
            <p className="text-[14px] text-[#C22A2A]">Ошибка создания. Проверьте данные.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[44px] border-2 border-[#cbe3ff] rounded-[22px] text-[16px] font-semibold text-primary hover:bg-mainbg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 h-[44px] bg-cta rounded-[22px] text-[16px] font-semibold text-white hover:bg-cta/90 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? "Создание…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminOrgs() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: orgs, isLoading } = useOrgs();
  const updateOrg = useUpdateOrg();

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-[40px]">
      {createOpen && <CreateOrgDialog onClose={() => setCreateOpen(false)} />}

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-[10px]">
          <h1 className="text-[40px] font-bold text-primary leading-[150%]">Организации</h1>
          <p className="text-[18px] font-medium text-primary/60 leading-[150%]">
            Управление компаниями на платформе
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 h-[44px] px-6 bg-cta rounded-[22px] text-[15px] font-semibold text-white hover:bg-cta/90 transition-colors shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <line x1="10" y1="3" x2="10" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="10" x2="17" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Создать организацию
        </button>
      </div>

      <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#cbe3ff]">
              {["Название", "Slug", "Тариф", "Статус", "Дата создания", ""].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-[16px] font-semibold text-primary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-primary/50 text-[16px]">Загрузка…</td>
              </tr>
            )}
            {!isLoading && (orgs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-primary/50 text-[16px]">
                  Организаций пока нет
                </td>
              </tr>
            )}
            {(orgs ?? []).map((org) => (
              <tr
                key={org.id}
                className="border-t-2 border-[#cbe3ff] hover:bg-mainbg/40 transition-colors"
              >
                <td className="px-6 py-3 text-[15px] font-semibold text-primary">{org.display_name}</td>
                <td className="px-6 py-3 text-[14px] text-primary/70 font-mono">{org.slug}</td>
                <td className="px-6 py-3 text-[14px] font-medium text-primary">
                  {PLAN_LABELS[org.plan] ?? org.plan}
                </td>
                <td className={cn(
                  "px-6 py-3 text-[14px] font-medium",
                  org.is_active ? "text-[#20BE4F]" : "text-[#C22A2A]"
                )}>
                  {org.is_active ? "Активна" : "Отключена"}
                </td>
                <td className="px-6 py-3 text-[14px] text-primary">{fmtDate(org.created_at)}</td>
                <td className="px-6 py-3">
                  {org.is_active ? (
                    <button
                      onClick={() => updateOrg.mutate({ orgId: org.id, body: { is_active: false } })}
                      className="text-[13px] text-[#C22A2A] hover:underline"
                    >
                      Отключить
                    </button>
                  ) : (
                    <button
                      onClick={() => updateOrg.mutate({ orgId: org.id, body: { is_active: true } })}
                      className="text-[13px] text-[#20BE4F] hover:underline"
                    >
                      Включить
                    </button>
                  )}
                </td>
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
  const user = useAuthStore((s) => s.user);
  const isPlatformAdmin = user?.roles.some((r) => r.id === "platform_admin") ?? false;

  const sidebarItems = ALL_ADMIN_ITEMS.filter(
    (item) => !item.platformOnly || isPlatformAdmin
  );

  const defaultSection: AdminSection = isPlatformAdmin ? "home" : "logs";
  const [section, setSection] = useState<AdminSection>(defaultSection);

  const contentMap: Record<AdminSection, React.ReactNode> = {
    home:      <AdminDashboard />,
    orgs:      <AdminOrgs />,
    logs:      <AdminLogs />,
    users:     <AdminUsers />,
    apps:      <AdminApps />,
    databases: <AdminDatabases />,
  };

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <AdminSidebar active={section} onChange={setSection} items={sidebarItems} />

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
function OrgsIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <rect x="2" y="7" width="10" height="14" rx="2" stroke="#00205F" strokeWidth="2"/>
      <rect x="13" y="3" width="10" height="18" rx="2" stroke="#00205F" strokeWidth="2"/>
      <line x1="5" y1="11" x2="9" y2="11" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="14" x2="9" y2="14" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="7" x2="20" y2="7" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="11" x2="20" y2="11" stroke="#00205F" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

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
