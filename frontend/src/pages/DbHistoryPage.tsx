import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useEntities } from "@/shared/hooks/useEntities";
import { useAuditLogs } from "@/shared/hooks/useAuditLogs";
import type { AuditLogEntry } from "@/shared/api/auditlogs";

type HistoryFilter = "all" | "add" | "update" | "delete";

const ACTION_BY_LOG: Record<string, HistoryFilter> = {
  "record.created": "add",
  "record.updated": "update",
  "record.deleted": "delete",
};

const ACTION_LABELS: Record<HistoryFilter, { label: string; bg: string; text: string }> = {
  all:    { label: "—", bg: "", text: "" },
  add:    { label: "Добавление", bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]" },
  update: { label: "Изменение",  bg: "bg-[#EBF4FF]", text: "text-cta" },
  delete: { label: "Удаление",   bg: "bg-[#FFEBEE]", text: "text-[#D32F2F]" },
};

interface HistoryRow {
  id: string;
  time: string;
  timestamp: number;
  entityId: string;
  table: string;
  action: HistoryFilter;
  field: string;
  user: string;
  oldVal: string;
  newVal: string;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function summarizePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) return "—";
  return entries.slice(0, 3).map(([k, v]) => `${k}: ${formatValue(v)}`).join("; ");
}

function toRow(log: AuditLogEntry): HistoryRow | null {
  const action = ACTION_BY_LOG[log.action];
  if (!action) return null;
  const details = log.details ?? {};
  const entityId = typeof details.entity_id === "string" ? details.entity_id : "";
  const shortId = log.resource_id ? log.resource_id.slice(0, 8) : "—";

  let field = `Запись #${shortId}`;
  let oldVal = "—";
  let newVal = "—";

  if (action === "add") {
    newVal = summarizePayload(details.payload);
  } else if (action === "delete") {
    oldVal = summarizePayload(details.payload);
  } else if (action === "update") {
    const changedFields = Array.isArray(details.changed_fields) ? details.changed_fields as string[] : [];
    const fieldChanges = (details.field_changes ?? {}) as Record<string, { old?: unknown; new?: unknown }>;
    if (changedFields.length > 0) {
      field = `${changedFields.join(", ")} (#${shortId})`;
      oldVal = changedFields.map((f) => formatValue(fieldChanges[f]?.old)).join("; ") || "—";
      newVal = changedFields.map((f) => formatValue(fieldChanges[f]?.new)).join("; ") || "—";
    }
  }

  const created = new Date(log.created_at);
  return {
    id: log.id,
    time: created.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    timestamp: created.getTime(),
    entityId,
    table: entityId,
    action,
    field,
    user: log.actor_email ?? (log.user_id ? log.user_id.slice(0, 8) : "система"),
    oldVal,
    newVal,
  };
}

function downloadCsv(rows: HistoryRow[], entityNames: Record<string, string>) {
  const header = ["Время", "Таблица", "Действие", "Поле / Запись", "Пользователь", "Было", "Стало"];
  const lines = rows.map((r) => [
    r.time,
    entityNames[r.entityId] ?? r.table,
    ACTION_LABELS[r.action].label,
    r.field,
    r.user,
    r.oldVal,
    r.newVal,
  ].map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","));
  const csv = [header.join(","), ...lines].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `db-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DbHistoryPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const { data: entities = [] } = useEntities(app?.id);
  const { data: logs = [], isLoading } = useAuditLogs({ limit: 500 });

  const entityNames = useMemo(
    () => Object.fromEntries(entities.map((e) => [e.id, e.display_name])),
    [entities],
  );

  const rows = useMemo(() => {
    if (!app) return [];
    return logs
      .filter((l) => l.details?.app_id === app.id)
      .map(toRow)
      .filter((r): r is HistoryRow => r !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, app]);

  const ROWS_PER_PAGE = 10;

  const filtered = rows.filter((row) => {
    if (filter !== "all" && row.action !== filter) return false;
    if (activeEntityId && row.entityId !== activeEntityId) return false;
    if (dateFrom && row.timestamp < new Date(dateFrom).getTime()) return false;
    if (dateTo && row.timestamp > new Date(dateTo).getTime() + 86_400_000) return false;
    if (search) {
      const haystack = `${entityNames[row.entityId] ?? ""} ${row.field} ${row.user} ${row.oldVal} ${row.newVal}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />

      {/* ── Sidebar ── */}
      {!navCollapsed && <aside
        className="absolute bg-white border-r border-cardbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">История</span>
          {app && <p className="text-[12px] text-primary/40 mt-0.5 truncate">{app.name}</p>}
        </div>

        <div className="py-3 px-4">
          <p className="text-[12px] text-primary/50 mb-2 uppercase tracking-wide font-medium">Фильтр действий</p>
          <div className="flex flex-col gap-1">
            {([
              { id: "all",    label: "Все действия" },
              { id: "add",    label: "Добавления" },
              { id: "update", label: "Изменения" },
              { id: "delete", label: "Удаления" },
            ] as { id: HistoryFilter; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setFilter(id); setPage(1); }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors",
                  filter === id ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 px-4 border-t border-cardbg pt-3">
          <p className="text-[12px] text-primary/50 mb-2 uppercase tracking-wide font-medium">Таблицы</p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveEntityId(null); setPage(1); }}
              className={cn("w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors", activeEntityId === null ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg")}
            >
              Все таблицы
            </button>
            {entities.map((e) => (
              <button
                key={e.id}
                onClick={() => { setActiveEntityId(e.id); setPage(1); }}
                className={cn("w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors truncate", activeEntityId === e.id ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg")}
              >
                {e.display_name}
              </button>
            ))}
          </div>
        </div>
      </aside>}

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto flex flex-col"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1830 : 1540, height: 1010, transition: "left 0.2s, width 0.2s" }}
      >
        <div className="px-8 py-6 bg-white border-b border-cardbg shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[22px] font-bold text-primary">История изменений базы данных</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadCsv(filtered, entityNames)}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 border border-cardbg bg-white text-primary text-[14px] rounded-[6px] px-4 py-2 hover:border-cta hover:text-cta transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ExportIcon className="w-4 h-4" />
                Экспорт CSV
              </button>
              <button
                disabled
                title="Откат изменений пока не поддерживается"
                className="flex items-center gap-2 border border-cardbg bg-white text-primary/40 text-[14px] rounded-[6px] px-4 py-2 cursor-not-allowed"
              >
                <TrashIcon className="w-4 h-4" />
                Очистить историю
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[400px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по истории…"
                className="w-full pl-9 pr-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary placeholder:text-primary/40 focus:outline-none focus:border-cta"
              />
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
            />
            <span className="text-primary/40 text-[14px]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
            />
          </div>
        </div>

        <div className="flex-1 px-8 py-5">
          {/* Table */}
          <div className="bg-white rounded-[8px] border border-cardbg overflow-hidden">
            {/* Header */}
            <div className="grid border-b border-cardbg bg-[#F5F6F8]" style={{ gridTemplateColumns: "160px 120px 110px 220px 160px 1fr 1fr" }}>
              {["Время", "Таблица", "Действие", "Поле / Запись", "Пользователь", "Было", "Стало"].map((h) => (
                <div key={h} className="px-3 py-2.5 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{h}</div>
              ))}
            </div>

            {isLoading && (
              <div className="py-12 text-center text-[14px] text-primary/40">Загрузка…</div>
            )}

            {!isLoading && !app && (
              <div className="py-12 text-center text-[14px] text-primary/40">Нет доступных приложений</div>
            )}

            {!isLoading && app && pageRows.length === 0 && (
              <div className="py-12 text-center text-[14px] text-primary/40">Нет записей</div>
            )}

            {pageRows.map((row) => {
              const act = ACTION_LABELS[row.action];
              return (
                <div
                  key={row.id}
                  className="grid border-b border-cardbg last:border-b-0 hover:bg-mainbg transition-colors"
                  style={{ gridTemplateColumns: "160px 120px 110px 220px 160px 1fr 1fr" }}
                >
                  <div className="px-3 py-2.5 text-[12px] text-primary/70 border-r border-cardbg">{row.time}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary border-r border-cardbg truncate">{entityNames[row.entityId] ?? row.table.slice(0, 8)}</div>
                  <div className="px-3 py-2.5 border-r border-cardbg">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[20px]", act.bg, act.text)}>{act.label}</span>
                  </div>
                  <div className="px-3 py-2.5 text-[12px] text-primary border-r border-cardbg truncate">{row.field}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary/70 border-r border-cardbg truncate">{row.user}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary/50 border-r border-cardbg truncate">{row.oldVal}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary truncate">{row.newVal}</div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <PaginationBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PaginationBtn key={n} onClick={() => setPage(n)} active={page === n}>{n}</PaginationBtn>
              ))}
              <PaginationBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PaginationBtn>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PaginationBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-[6px] text-[14px] transition-colors",
        active   ? "bg-cta text-white font-medium" :
        disabled ? "text-primary/30 cursor-not-allowed" :
        "text-primary hover:bg-white border border-cardbg"
      )}
    >
      {children}
    </button>
  );
}

/* ── Icons ── */
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" /><path d="M10.5 10.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" /></svg>;
}
function ExportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
