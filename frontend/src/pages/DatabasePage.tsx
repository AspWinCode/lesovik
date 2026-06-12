import { useState } from "react";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useEntities } from "@/shared/hooks/useEntities";
import { useRecords, useCreateRecord, useUpdateRecord } from "@/shared/hooks/useRecords";
import type { FieldRead } from "@/shared/api/entities";

type ViewMode = "grid" | "table";

/* ── Field-type column width ── */
function colWidth(ft: string): number {
  if (ft === "long_text" || ft === "rich_text") return 300;
  if (ft === "number" || ft === "decimal")       return 120;
  if (ft === "boolean")                          return 80;
  if (ft === "select" || ft === "multi_select")  return 160;
  if (ft === "date" || ft === "datetime")        return 140;
  return 200;
}

export function DatabasePage() {
  const [activeEntityIdx, setActiveEntityIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  /* ── Data ── */
  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const app = useActiveApp(apps);
  const appId = app?.id;

  const entitiesQuery = useEntities(appId);
  const entities = entitiesQuery.data ?? [];
  const entity = entities[activeEntityIdx];

  const recordsQuery = useRecords(appId, entity?.id, { limit: 100 });
  const records = recordsQuery.data?.items ?? [];

  const displayFields: FieldRead[] = entity?.fields.filter((f) => !f.is_system) ?? [];

  const createRecord = useCreateRecord(appId ?? "", entity?.id ?? "");
  const updateRecord = useUpdateRecord(appId ?? "", entity?.id ?? "");

  /* ── Handlers ── */
  function handleAddRow() {
    createRecord.mutate({ payload: {} }, {
      onSuccess: (rec) => {
        setActiveRow(records.length); // will be last after refetch
        void rec;
      },
    });
  }

  function startEdit(rowIdx: number, record: { payload: Record<string, unknown> }) {
    setActiveRow(rowIdx);
    const vals: Record<string, string> = {};
    displayFields.forEach((f) => {
      const v = record.payload[f.name];
      vals[f.name] = v !== undefined && v !== null ? String(v) : "";
    });
    setEditValues(vals);
  }

  function commitEdit(recordId: string) {
    const payload: Record<string, unknown> = {};
    displayFields.forEach((f) => {
      const v = editValues[f.name];
      if (v !== undefined) {
        if (f.field_type === "number" || f.field_type === "decimal") {
          payload[f.name] = v === "" ? null : Number(v);
        } else if (f.field_type === "boolean") {
          payload[f.name] = v === "true";
        } else {
          payload[f.name] = v === "" ? null : v;
        }
      }
    });
    updateRecord.mutate({ recordId, payload });
    setActiveRow(null);
    setEditValues({});
  }

  /* ── Loading / empty ── */
  const isLoading = appsQuery.isLoading || entitiesQuery.isLoading;
  if (isLoading) {
    return (
      <div className="relative w-[1920px] h-[1080px] bg-white flex items-center justify-center">
        <span className="text-[20px] text-primary/50">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top mini navbar ── */}
      <header className="h-[50px] shrink-0 flex items-center px-6 gap-4 bg-white border-b border-cardbg">
        <span className="text-[18px] font-bold text-primary">
          {app?.name?.slice(0, 2).toUpperCase() ?? "–"}
        </span>
        <span className="text-[16px] text-primary font-medium">
          {app?.name ?? "Нет приложения"}
        </span>
      </header>

      {/* ── Entity tabs ── */}
      <div className="h-[44px] shrink-0 flex items-center border-b border-cardbg bg-white overflow-x-hidden">
        {entities.length === 0 ? (
          <span className="px-5 text-[14px] text-primary/40">Нет таблиц</span>
        ) : (
          entities.map((e, i) => (
            <button
              key={e.id}
              onClick={() => { setActiveEntityIdx(i); setActiveRow(null); }}
              className={cn(
                "h-full px-5 text-[14px] whitespace-nowrap border-b-2 transition-colors",
                activeEntityIdx === i
                  ? "border-cta text-cta font-medium"
                  : "border-transparent text-primary/70 hover:text-primary"
              )}
            >
              {e.display_name}
            </button>
          ))
        )}
        <button
          disabled
          className="h-full px-5 text-[14px] text-cta/40 flex items-center gap-1 cursor-not-allowed whitespace-nowrap"
          title="В разработке"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Новая таблица
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="h-[46px] shrink-0 flex items-center gap-4 px-4 bg-white border-b border-cardbg">
        <div className="flex items-center gap-2">
          <ToolButton icon={<SearchIcon />} />
          <ToolButton icon={<PlusIcon />} onClick={handleAddRow} title="Добавить строку" />
          <ToolButton icon={<HistoryIcon />} />
        </div>
        <div className="h-5 w-px bg-cardbg" />
        <DropdownButton label="Основной вид" />
        <div className="h-5 w-px bg-cardbg" />
        <div className="flex items-center gap-1 bg-mainbg rounded-[6px] p-[3px]">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3 py-1 text-[13px] rounded-[4px] transition-colors",
              viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-primary/60 hover:text-primary"
            )}
          >
            Сетка
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "px-3 py-1 text-[13px] rounded-[4px] transition-colors",
              viewMode === "table" ? "bg-white text-primary shadow-sm" : "text-primary/60 hover:text-primary"
            )}
          >
            Таблица
          </button>
        </div>
        <div className="h-5 w-px bg-cardbg" />
        <DropdownButton icon={<FilterIcon />} label="Фильтр" />
        <DropdownButton icon={<SortIcon />}   label="Сортировка" />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[13px] text-primary/50">
            {recordsQuery.isLoading ? "загрузка..." : `${records.length} записей`}
          </span>
        </div>
      </div>

      {/* ── Data table ── */}
      <div className="flex-1 overflow-auto">
        {!entity ? (
          <div className="flex items-center justify-center h-full text-primary/40 text-[16px]">
            Выберите таблицу
          </div>
        ) : recordsQuery.isLoading ? (
          <div className="flex items-center justify-center h-full text-primary/40 text-[16px]">
            Загрузка записей...
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-white border-b border-cardbg sticky top-0 z-10">
                <th className="w-10 min-w-[40px] border-r border-cardbg" />
                {displayFields.map((f) => (
                  <th
                    key={f.id}
                    style={{ width: colWidth(f.field_type), minWidth: colWidth(f.field_type) }}
                    className="border-r border-cardbg px-3 py-2 text-left font-medium text-primary whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <ColTypeIcon type={f.field_type} />
                      <span>{f.display_name}</span>
                      <SortArrows />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2 text-left">
                  <button disabled title="В разработке" className="flex items-center gap-1 text-cta/40 text-[13px] font-medium cursor-not-allowed whitespace-nowrap">
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                    </svg>
                    Добавить поле
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={displayFields.length + 2} className="py-16 text-center text-primary/40 text-[14px]">
                    Нет записей. Нажмите «+» чтобы добавить.
                  </td>
                </tr>
              ) : (
                records.map((rec, i) => {
                  const isActive = activeRow === i;
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => !isActive && startEdit(i, rec)}
                      className={cn(
                        "border-b border-cardbg cursor-pointer",
                        isActive ? "bg-[#EBF4FF]" : "hover:bg-mainbg/60"
                      )}
                    >
                      <td className="w-10 border-r border-cardbg px-2 text-center text-primary/50 select-none">
                        {i + 1}
                      </td>
                      {displayFields.map((f) => {
                        const raw = rec.payload[f.name];
                        return (
                          <td
                            key={f.id}
                            className={cn(
                              "border-r border-cardbg px-3 py-[6px]",
                              f.field_type === "number" || f.field_type === "decimal" ? "text-right" : ""
                            )}
                          >
                            {isActive && canInlineEdit(f.field_type) ? (
                              <input
                                autoFocus={displayFields[0].id === f.id}
                                value={editValues[f.name] ?? ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, [f.name]: e.target.value }))}
                                onBlur={() => commitEdit(rec.id)}
                                onKeyDown={(e) => e.key === "Enter" && commitEdit(rec.id)}
                                className="w-full bg-white border border-cta rounded-[3px] px-1 outline-none text-primary"
                              />
                            ) : (
                              <CellValue value={raw} field={f} />
                            )}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  );
                })
              )}
              {/* Add row inline ── */}
              <tr
                onClick={handleAddRow}
                className="border-b border-cardbg cursor-pointer hover:bg-mainbg/60 group"
              >
                <td className="w-10 border-r border-cardbg px-2 text-center text-primary/30 group-hover:text-cta select-none">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                </td>
                <td colSpan={displayFields.length + 1} className="px-3 py-[6px] text-[13px] text-primary/30 group-hover:text-cta">
                  Добавить запись
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="h-[44px] shrink-0 flex items-center justify-end gap-4 px-6 bg-white border-t border-cardbg">
        <span className="text-[13px] text-primary/60">Строки:</span>
        <span className="text-[13px] font-medium text-primary">{records.length}</span>
        <span className="text-[13px] text-primary/60">
          {entity ? `• ${entity.display_name}` : ""}
        </span>
      </footer>
    </div>
  );
}

/* ── Cell value renderer ── */
function CellValue({ value, field }: { value: unknown; field: FieldRead }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-primary/25">—</span>;
  }

  if (field.field_type === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-cta/10 text-cta">
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ) : <span className="text-primary/25">—</span>;
  }

  if (field.field_type === "select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    const choice = choices.find((c) => c.value === String(value));
    const label = choice?.label ?? String(value);
    return (
      <span className="inline-block px-2 py-0.5 rounded-[4px] text-[12px] font-medium bg-[#EBF4FF] text-cta">
        {label}
      </span>
    );
  }

  if (field.field_type === "long_text" || field.field_type === "rich_text") {
    return (
      <span className="block truncate max-w-[280px] text-primary" title={String(value)}>
        {String(value)}
      </span>
    );
  }

  if (field.field_type === "number" || field.field_type === "decimal") {
    return <span className="text-primary font-mono">{String(value)}</span>;
  }

  if (field.field_type === "email") {
    return <span className="text-cta underline truncate">{String(value)}</span>;
  }

  return <span className="text-primary truncate">{String(value)}</span>;
}

function canInlineEdit(ft: string): boolean {
  return ["text", "long_text", "number", "decimal", "email", "phone", "url"].includes(ft);
}

/* ── Small helpers ── */
function ToolButton({ icon, onClick, title }: { icon: React.ReactNode; onClick?: () => void; title?: string }) {
  const inert = !onClick;
  return (
    <button
      onClick={onClick}
      disabled={inert}
      title={inert ? "В разработке" : title}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 transition-colors",
        inert ? "opacity-40 cursor-not-allowed" : "hover:bg-mainbg hover:text-primary",
      )}
    >
      {icon}
    </button>
  );
}

function DropdownButton({ icon, label, small }: { icon?: React.ReactNode; label: string; small?: boolean }) {
  return (
    <button
      disabled
      title="В разработке"
      className={cn(
        "flex items-center gap-1.5 rounded-[6px] text-primary/40 cursor-not-allowed",
        small ? "px-2 py-1 text-[13px]" : "px-3 py-1.5 text-[13px]"
      )}>
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      {label}
      <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40" fill="currentColor">
        <path d="M2 4l4 4 4-4H2z" />
      </svg>
    </button>
  );
}

function ColTypeIcon({ type }: { type: string }) {
  if (type === "number" || type === "decimal") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2l-1 12M13 2l-1 12M2 6h12M2 10h12" strokeLinecap="round" />
    </svg>
  );
  if (type === "boolean") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="12" height="8" rx="4" />
      <circle cx="11" cy="8" r="2.5" fill="currentColor" className="text-primary/50" />
    </svg>
  );
  if (type === "select" || type === "multi_select") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="4" rx="1.5" />
      <rect x="2" y="9" width="8" height="4" rx="1.5" />
    </svg>
  );
  if (type === "date" || type === "datetime") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 7h12M5 2v2M11 2v2" strokeLinecap="round" />
    </svg>
  );
  if (type === "email") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <path d="M2 6l6 4 6-4" />
    </svg>
  );
  /* default: text */
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h10M3 8h7M3 11h5" strokeLinecap="round" />
    </svg>
  );
}

function SortArrows() {
  return (
    <svg viewBox="0 0 12 16" className="w-2.5 h-3 text-primary/30 ml-0.5" fill="currentColor">
      <path d="M6 1l3 4H3l3-4zM6 15l-3-4h6l-3 4z" />
    </svg>
  );
}

function SearchIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>; }
function PlusIcon()    { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12" strokeLinecap="round" /></svg>; }
function HistoryIcon() { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function FilterIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>; }
function SortIcon()    { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h14M5 10h10M7 15h6" strokeLinecap="round"/></svg>; }
