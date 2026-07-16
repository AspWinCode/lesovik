import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useEntities, useCreateEntity, useCreateField, useRelations, useCreateRelation, useDeleteRelation } from "@/shared/hooks/useEntities";
import { useRecords, useCreateRecord, useUpdateRecord } from "@/shared/hooks/useRecords";
import { uploadRecordFile, getRecordFileDownloadUrl } from "@/shared/api/records";
import type { FieldRead, FieldType } from "@/shared/api/entities";
import { ImportModal } from "@/components/ImportModal";
import { EditTableModal, EditColumnModal, RelationsModal, COLUMN_TYPE_TO_FIELD_TYPE, type ColumnOptions, type RelationItem } from "@/components/modals/DbModals";
import { SortingModal } from "@/components/modals/ViewModals";
import { CopyTableModal, MoveModal } from "@/components/modals/MiscModals";

type ViewMode = "grid" | "table";

type FilterOperator = "contains" | "equals" | "starts_with" | "not_empty" | "is_empty" | "gt" | "lt";

interface FilterRule {
  id: string;
  fieldName: string;
  operator: FilterOperator;
  value: string;
}

function slugify(s: string): string {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "table";
  return `${base}_${Date.now().toString(36)}`;
}

/* ── Effective display type: prefers field_options.display_type over field_type ── */
function effectiveType(field: FieldRead): string {
  return (field.field_options?.display_type as string) ?? field.field_type;
}

/* ── Is field shown in the create/edit form? ── */
function isFormVisible(field: FieldRead): boolean {
  return field.field_options?.form_visible !== false;
}

/* ── Field-type column width ── */
function colWidth(field: FieldRead): number {
  const ft = effectiveType(field);
  if (ft === "long_text" || ft === "rich_text") return 300;
  if (ft === "number" || ft === "decimal")       return 120;
  if (ft === "boolean")                          return 80;
  if (ft === "select" || ft === "multi_select")  return 160;
  if (ft === "date" || ft === "datetime")        return 140;
  return 200;
}

export function DatabasePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [activeEntityIdx, setActiveEntityIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showImport, setShowImport] = useState(false);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [copyTableModal, setCopyTableModal] = useState<string | null>(null);
  const [moveModal, setMoveModal] = useState<string | null>(null);
  const [showTableDotsMenu, setShowTableDotsMenu] = useState(false);
  const [showRelationsModal, setShowRelationsModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [quickEdit, setQuickEdit] = useState(true);
  const [showSystemFields, setShowSystemFields] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Data ── */
  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const app = useActiveApp(apps);
  const appId = app?.id;

  const entitiesQuery = useEntities(appId);
  const entities = entitiesQuery.data ?? [];
  const entity = entities[activeEntityIdx];

  // Pre-select entity from ?entity=UUID param (coming from /schema "view data" button)
  useEffect(() => {
    const entityId = params.get("entity");
    if (!entityId || !entities.length) return;
    const idx = entities.findIndex((e) => e.id === entityId);
    if (idx !== -1) setActiveEntityIdx(idx);
  }, [entities, params]);

  const recordsQuery = useRecords(appId, entity?.id, { limit: 100 });
  const records = recordsQuery.data?.items ?? [];

  const displayFields: FieldRead[] = entity?.fields.filter((f) => showSystemFields || !f.is_system) ?? [];

  const filteredRecords = filterRules.length === 0 ? records : records.filter((rec) =>
    filterRules.every((rule) => {
      const raw = rec.payload[rule.fieldName];
      const cell = raw === null || raw === undefined ? "" : String(raw).toLowerCase();
      const val = rule.value.toLowerCase();
      switch (rule.operator) {
        case "contains":    return cell.includes(val);
        case "equals":      return cell === val;
        case "starts_with": return cell.startsWith(val);
        case "is_empty":    return cell === "";
        case "not_empty":   return cell !== "";
        case "gt":          return Number(raw) > Number(rule.value);
        case "lt":          return Number(raw) < Number(rule.value);
        default:            return true;
      }
    })
  );

  const createRecord = useCreateRecord(appId ?? "", entity?.id ?? "");
  const updateRecord = useUpdateRecord(appId ?? "", entity?.id ?? "");
  const createEntityMutation  = useCreateEntity(appId ?? "");
  const createFieldMutation   = useCreateField(appId ?? "");
  const relationsQuery        = useRelations(appId);
  const createRelationMutation = useCreateRelation(appId ?? "");
  const deleteRelationMutation = useDeleteRelation(appId ?? "");

  /* ── Handlers ── */
  function handleNewTable() {
    setShowNewTableModal(true);
  }

  function handleAddField() {
    if (!entity) return;
    setShowEditColumnModal(true);
  }

  function handleAddRow() {
    setShowCreateRecord(true);
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
        const et = effectiveType(f);
        if (et === "number" || et === "decimal") {
          payload[f.name] = v === "" ? null : Number(v);
        } else if (et === "boolean") {
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

  function scheduleCommit(recordId: string) {
    blurTimer.current = setTimeout(() => commitEdit(recordId), 150);
  }

  function cancelCommit() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
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
      <header className="h-[50px] shrink-0 flex items-center px-4 gap-3 bg-white border-b border-cardbg">
        <button
          onClick={() => navigate(-1)}
          title="Назад"
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 hover:bg-mainbg hover:text-primary transition-colors shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
            <path d="M13 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
          onClick={handleNewTable}
          className="h-full px-5 text-[14px] text-cta flex items-center gap-1 whitespace-nowrap hover:bg-mainbg transition-colors"
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
        {/* View mode dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowViewDropdown((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] text-primary hover:bg-mainbg transition-colors cursor-pointer"
          >
            {viewMode === "grid" ? (
              <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="2" width="12" height="3" rx="1"/><rect x="2" y="7" width="12" height="3" rx="1"/>
                <rect x="2" y="12" width="12" height="2" rx="1"/>
              </svg>
            )}
            {viewMode === "grid" ? "Сетка" : "Таблица"}
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40" fill="currentColor">
              <path d="M2 4l4 4 4-4H2z" />
            </svg>
          </button>
          {showViewDropdown && (
            <div
              className="absolute left-0 top-full mt-1 bg-white rounded-[10px] shadow-lg border border-cardbg z-20 min-w-[150px] py-1"
              onMouseLeave={() => setShowViewDropdown(false)}
            >
              {(["grid", "table"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setShowViewDropdown(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-[13px] hover:bg-mainbg transition-colors text-left",
                    viewMode === mode ? "text-cta font-semibold" : "text-primary"
                  )}
                >
                  {mode === "grid" ? (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                      <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="2" y="2" width="12" height="3" rx="1"/><rect x="2" y="7" width="12" height="3" rx="1"/>
                      <rect x="2" y="12" width="12" height="2" rx="1"/>
                    </svg>
                  )}
                  {mode === "grid" ? "Сетка" : "Таблица"}
                  {viewMode === mode && (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-auto text-cta" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-5 w-px bg-cardbg" />
        <DropdownButton
          icon={<FilterIcon />}
          label={filterRules.length > 0 ? `Фильтр (${filterRules.length})` : "Фильтр"}
          onClick={() => setShowFilterPanel((v) => !v)}
        />
        <DropdownButton icon={<SortIcon />}   label="Сортировка" onClick={() => setShowSortModal(true)} />
        <button
          onClick={() => setShowSystemFields((v) => !v)}
          title={showSystemFields ? "Скрыть системные поля" : "Показать системные поля"}
          className={cn(
            "flex items-center gap-1.5 h-[30px] px-3 rounded-[6px] border text-[13px] transition-colors",
            showSystemFields
              ? "border-cta bg-cta/10 text-cta"
              : "border-cardbg text-primary/60 hover:bg-mainbg hover:text-primary"
          )}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          Системные поля
        </button>
        <button
          onClick={() => { setQuickEdit((v) => !v); setActiveRow(null); setEditValues({}); }}
          title={quickEdit ? "Выключить быстрое редактирование" : "Включить быстрое редактирование"}
          className={cn(
            "flex items-center gap-1.5 h-[30px] px-3 rounded-[6px] border text-[13px] transition-colors",
            quickEdit
              ? "border-cta bg-cta/10 text-cta"
              : "border-cardbg text-primary/60 hover:bg-mainbg hover:text-primary"
          )}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M11 2H5L3 9h4l-1 5 7-8H9l2-4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Быстрое редактирование
        </button>
        <div className="ml-auto flex items-center gap-2">
          {entity && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 h-[30px] px-3 rounded-[6px] border border-cardbg text-[13px] text-primary/70 hover:bg-mainbg hover:text-primary transition-colors"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 2v9M4 7l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 13h12" strokeLinecap="round" />
              </svg>
              Импорт
            </button>
          )}
          {entity && (
            <div className="relative">
              <button
                onClick={() => setShowTableDotsMenu((v) => !v)}
                className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] border border-cardbg text-primary/60 hover:bg-mainbg hover:text-primary transition-colors"
                title="Действия с таблицей"
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
              {showTableDotsMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg border border-cardbg z-20 min-w-[180px]">
                  <button
                    onClick={() => { setShowRelationsModal(true); setShowTableDotsMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-primary hover:bg-mainbg rounded-t-[10px]"
                  >
                    Связи таблицы
                  </button>
                  <button
                    onClick={() => { setCopyTableModal(entity.display_name); setShowTableDotsMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-primary hover:bg-mainbg"
                  >
                    Копировать
                  </button>
                  <button
                    onClick={() => { setMoveModal(entity.display_name); setShowTableDotsMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-primary hover:bg-mainbg rounded-b-[10px]"
                  >
                    Переместить
                  </button>
                </div>
              )}
            </div>
          )}
          <span className="text-[13px] text-primary/50">
            {recordsQuery.isLoading ? "загрузка..." : `${records.length} записей`}
          </span>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilterPanel && displayFields.length > 0 && (
        <FilterPanel
          fields={displayFields}
          rules={filterRules}
          onChange={setFilterRules}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {/* ── Data area ── */}
      <div className="flex-1 overflow-auto">
        {!entity ? (
          <div className="flex items-center justify-center h-full text-primary/40 text-[16px]">
            Выберите таблицу
          </div>
        ) : recordsQuery.isLoading ? (
          <div className="flex items-center justify-center h-full text-primary/40 text-[16px]">
            Загрузка записей...
          </div>
        ) : viewMode === "grid" ? (
          /* ── Grid / card view ── */
          <div className="p-6">
            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-primary/40 gap-3">
                <svg viewBox="0 0 48 48" className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="18" height="18" rx="3"/><rect x="26" y="4" width="18" height="18" rx="3"/>
                  <rect x="4" y="26" width="18" height="18" rx="3"/><rect x="26" y="26" width="18" height="18" rx="3"/>
                </svg>
                <span className="text-[14px]">{filterRules.length > 0 ? "Нет записей, соответствующих фильтру." : "Нет записей. Нажмите «+» чтобы добавить."}</span>
                {filterRules.length === 0 && (
                  <button onClick={handleAddRow} className="mt-1 px-5 py-2 bg-cta rounded-btn text-white text-[13px] hover:bg-active transition-colors">
                    + Добавить запись
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {filteredRecords.map((rec) => {
                  const labelField = displayFields[0];
                  const label = labelField ? String(rec.payload[labelField.name] ?? "—") : rec.id.slice(0, 8);
                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-[12px] border border-cardbg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-2 cursor-pointer"
                      onClick={handleAddRow}
                    >
                      <div className="text-[15px] font-semibold text-primary truncate">{label}</div>
                      {displayFields.slice(1, 5).map((f) => {
                        const val = rec.payload[f.name];
                        if (val === null || val === undefined || val === "") return null;
                        return (
                          <div key={f.id} className="flex items-center gap-2 text-[12px]">
                            <span className="text-primary/40 w-[90px] shrink-0 truncate">{f.display_name}</span>
                            <span className="text-primary truncate flex-1">
                              <CellValue value={val} field={f} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <button
                  onClick={handleAddRow}
                  className="rounded-[12px] border-2 border-dashed border-cardbg text-primary/30 hover:border-cta hover:text-cta transition-colors flex items-center justify-center gap-2 p-4 min-h-[80px] text-[13px]"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                  Добавить запись
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Table view ── */
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-white border-b border-cardbg sticky top-0 z-10">
                <th className="w-10 min-w-[40px] border-r border-cardbg" />
                {displayFields.map((f) => (
                  <th
                    key={f.id}
                    style={{ width: colWidth(f), minWidth: colWidth(f) }}
                    className="border-r border-cardbg px-3 py-2 text-left font-medium text-primary whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <ColTypeIcon type={f.field_type} />
                      <span className={f.is_system ? "text-primary/50" : ""}>{f.display_name}</span>
                      {f.is_system ? (
                        <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/30 shrink-0" fill="currentColor">
                          <path d="M9 5H8V4a2 2 0 0 0-4 0v1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1ZM5 4a1 1 0 0 1 2 0v1H5V4Z" />
                        </svg>
                      ) : (
                        <SortArrows />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2 text-left">
                  <button onClick={handleAddField} className="flex items-center gap-1 text-cta text-[13px] font-medium whitespace-nowrap hover:opacity-70 transition-opacity">
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                    </svg>
                    Добавить поле
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={displayFields.length + 2} className="py-16 text-center text-primary/40 text-[14px]">
                    {filterRules.length > 0 ? "Нет записей, соответствующих фильтру." : "Нет записей. Нажмите «+» чтобы добавить."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, i) => {
                  const isActive = activeRow === i;
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => quickEdit && !isActive && startEdit(i, rec)}
                      className={cn(
                        "border-b border-cardbg",
                        quickEdit ? "cursor-pointer" : "cursor-default",
                        isActive ? "bg-[#EBF4FF]" : quickEdit ? "hover:bg-mainbg/60" : ""
                      )}
                    >
                      <td className="w-10 border-r border-cardbg px-2 text-center text-primary/50 select-none">
                        {i + 1}
                      </td>
                      {displayFields.map((f) => {
                        const raw = rec.payload[f.name];
                        const et = effectiveType(f);
                        const isFile = et === "file" || et === "image";
                        return (
                          <td
                            key={f.id}
                            className={cn(
                              "border-r border-cardbg px-3 py-[6px]",
                              et === "number" || et === "decimal" ? "text-right" : ""
                            )}
                          >
                            {isFile && appId ? (
                              <FileCell
                                appId={appId}
                                entityId={entity.id}
                                recordId={rec.id}
                                field={f}
                                value={raw ? String(raw) : ""}
                              />
                            ) : isActive && quickEdit && canInlineEdit(et) ? (
                              <InlineEdit
                                field={f}
                                value={editValues[f.name] ?? ""}
                                autoFocus={displayFields[0].id === f.id}
                                onChange={(v) => setEditValues((p) => ({ ...p, [f.name]: v }))}
                                onBlur={() => scheduleCommit(rec.id)}
                                onFocus={cancelCommit}
                                onEnter={() => commitEdit(rec.id)}
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
        <span className="text-[13px] font-medium text-primary">
          {filterRules.length > 0 ? `${filteredRecords.length} / ${records.length}` : records.length}
        </span>
        <span className="text-[13px] text-primary/60">
          {entity ? `• ${entity.display_name}` : ""}
        </span>
      </footer>

      {showCreateRecord && appId && entity && (
        <CreateRecordModal
          entity={entity}
          onClose={() => setShowCreateRecord(false)}
          onConfirm={(payload) => {
            createRecord.mutate({ payload }, {
              onSuccess: () => setShowCreateRecord(false),
            });
          }}
        />
      )}

      {showImport && appId && entity && (
        <ImportModal
          appId={appId}
          entityId={entity.id}
          fields={entity.fields}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            void recordsQuery.refetch();
            setShowImport(false);
          }}
        />
      )}

      {showNewTableModal && (
        <EditTableModal
          tableName="Новая таблица"
          columns={[]}
          onClose={() => setShowNewTableModal(false)}
          onGoToData={() => {
            // Create entity first, then close — data tab is always open
            setShowNewTableModal(false);
          }}
          onDone={(name) => {
            const displayName = name.trim() || "Новая таблица";
            createEntityMutation.mutate({ slug: slugify(displayName), display_name: displayName });
            setShowNewTableModal(false);
          }}
        />
      )}

      {showEditColumnModal && entity && (
        <EditColumnModal
          source={entity.display_name}
          columnName="Новое поле"
          columnType="Текст"
          entities={entities.filter((e) => e.id !== entity.id)}
          availableColumns={displayFields.map((f) => f.display_name)}
          onClose={() => setShowEditColumnModal(false)}
          onGoToData={() => setShowEditColumnModal(false)}
          onDone={(name, type, opts: ColumnOptions) => {
            const displayName = name.trim() || "Новое поле";
            const fieldType = (COLUMN_TYPE_TO_FIELD_TYPE[type] ?? "text") as FieldType;
            const fieldName = slugify(displayName);
            createFieldMutation.mutate({
              entityId: entity.id,
              body: {
                name: fieldName,
                display_name: displayName,
                field_type: fieldType,
                is_required: opts.isRequired,
                is_unique: opts.isUnique,
                field_options: {
                  ...(opts.choices.length > 0 ? { choices: opts.choices } : {}),
                  ...(opts.formVisible === false ? { form_visible: false } : {}),
                  ...(opts.formula ? { formula: opts.formula } : {}),
                  ...(opts.defaultValue ? { default_value: opts.defaultValue } : {}),
                  ...(opts.minValue ? { min_value: Number(opts.minValue) } : {}),
                  ...(opts.maxValue ? { max_value: Number(opts.maxValue) } : {}),
                  ...(opts.maxLength ? { max_length: Number(opts.maxLength) } : {}),
                  ...(fieldType === "relation" && opts.targetEntityId ? { target_entity_id: opts.targetEntityId } : {}),
                } as Record<string, unknown>,
              },
            });
            if (fieldType === "relation" && opts.targetEntityId) {
              createRelationMutation.mutate({
                from_entity_id: entity.id,
                to_entity_id: opts.targetEntityId,
                relation_type: opts.relationType as "one_to_one" | "one_to_many" | "many_to_many",
                from_field_name: fieldName,
                display_name: displayName,
              });
            }
            setShowEditColumnModal(false);
          }}
        />
      )}

      {showSortModal && (
        <SortingModal
          columns={displayFields.map((f) => f.display_name)}
          rules={[]}
          onClose={() => setShowSortModal(false)}
          onApply={() => setShowSortModal(false)}
        />
      )}

      {copyTableModal !== null && (
        <CopyTableModal
          tableName={copyTableModal}
          onClose={() => setCopyTableModal(null)}
          onConfirm={() => setCopyTableModal(null)}
        />
      )}

      {moveModal !== null && (
        <MoveModal
          itemName={moveModal}
          targets={entities
            .map((e) => e.display_name)
            .filter((n) => n !== moveModal)}
          onClose={() => setMoveModal(null)}
          onConfirm={() => setMoveModal(null)}
        />
      )}

      {showRelationsModal && entity && (
        <RelationsModal
          entityName={entity.display_name}
          relations={(relationsQuery.data ?? [])
            .filter((r) => r.from_entity_id === entity.id || r.to_entity_id === entity.id)
            .map((r): RelationItem => ({
              id: r.id,
              fromEntityName: entities.find((e) => e.id === r.from_entity_id)?.display_name ?? r.from_entity_id,
              toEntityName: entities.find((e) => e.id === r.to_entity_id)?.display_name ?? r.to_entity_id,
              relationType: r.relation_type,
              fromFieldName: r.from_field_name,
              displayName: r.display_name,
            }))}
          onClose={() => setShowRelationsModal(false)}
          onDelete={(id) => deleteRelationMutation.mutate(id)}
        />
      )}
    </div>
  );
}

/* ── Cell value renderer — uses display_type from field_options ── */
function CellValue({ value, field }: { value: unknown; field: FieldRead }) {
  const et = effectiveType(field);

  if (value === null || value === undefined || value === "") {
    return <span className="text-primary/25">—</span>;
  }

  if (et === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-cta/10 text-cta">
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ) : <span className="text-primary/25">—</span>;
  }

  if (et === "select" || et === "multi_select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    const vals = et === "multi_select" ? String(value).split(",") : [String(value)];
    return (
      <span className="flex flex-wrap gap-1">
        {vals.map((v) => {
          const label = choices.find((c) => c.value === v.trim())?.label ?? v.trim();
          return (
            <span key={v} className="inline-block px-2 py-0.5 rounded-[4px] text-[12px] font-medium bg-[#EBF4FF] text-cta">
              {label}
            </span>
          );
        })}
      </span>
    );
  }

  if (et === "date") {
    const d = new Date(String(value));
    return <span className="text-primary font-mono">{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ru")}</span>;
  }

  if (et === "datetime") {
    const d = new Date(String(value));
    return <span className="text-primary font-mono">{isNaN(d.getTime()) ? String(value) : d.toLocaleString("ru", { dateStyle: "short", timeStyle: "short" })}</span>;
  }

  if (et === "long_text" || et === "rich_text") {
    return (
      <span className="block truncate max-w-[280px] text-primary" title={String(value)}>
        {String(value)}
      </span>
    );
  }

  if (et === "number" || et === "decimal") {
    return <span className="text-primary font-mono">{String(value)}</span>;
  }

  if (et === "email") {
    return <span className="text-cta underline truncate">{String(value)}</span>;
  }

  if (et === "url") {
    return (
      <a href={String(value)} target="_blank" rel="noopener noreferrer"
        className="text-cta underline truncate block max-w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        {String(value)}
      </a>
    );
  }

  if (et === "phone") {
    return <span className="text-primary font-mono">{String(value)}</span>;
  }

  if (et === "relation") {
    return <RelationCellDisplay field={field} value={String(value)} />;
  }

  if (et === "file" || et === "image") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#EBF4FF] text-cta text-[12px] font-medium">
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4L7 1z" />
          <path d="M7 1v3h3" />
        </svg>
        {String(value).slice(0, 8)}…
      </span>
    );
  }

  return <span className="text-primary truncate">{String(value)}</span>;
}

/* ── Inline edit widget — renders input based on display_type ── */
function InlineEdit({
  field, value, autoFocus, onChange, onBlur, onFocus, onEnter,
}: {
  field: FieldRead;
  value: string;
  autoFocus: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  onEnter: () => void;
}) {
  const et = effectiveType(field);
  const base = "w-full bg-white border border-cta rounded-[3px] px-1 outline-none text-primary";

  if (et === "boolean") {
    return (
      <input
        type="checkbox"
        checked={value === "true"}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        onBlur={onBlur}
        onFocus={onFocus}
        className="w-4 h-4 accent-cta cursor-pointer"
      />
    );
  }

  if (et === "date") {
    return (
      <input type="date" value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onFocus={onFocus}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className={base}
      />
    );
  }

  if (et === "datetime") {
    return (
      <input type="datetime-local" value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onFocus={onFocus}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className={base}
      />
    );
  }

  if (et === "number" || et === "decimal") {
    return (
      <input type="number" value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onFocus={onFocus}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className={base + " text-right"}
      />
    );
  }

  if (et === "select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    return (
      <select value={value} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onFocus={onFocus}
        className={base}
      >
        <option value="">—</option>
        {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    );
  }

  if (et === "phone") {
    return (
      <input
        type="tel"
        value={value}
        autoFocus={autoFocus}
        inputMode="tel"
        placeholder="+7 (___) ___-__-__"
        onChange={(e) => onChange(e.target.value.replace(/[^\d+\-\s()()]/g, ""))}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className={base}
      />
    );
  }

  if (et === "relation") {
    return (
      <RelationPickerInput
        field={field}
        value={value}
        onChange={onChange}
        required={false}
      />
    );
  }

  return (
    <input type="text" value={value} autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onFocus={onFocus}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      className={base}
    />
  );
}

/* ── Create record modal — respects form_visible and display_type ── */
function CreateRecordModal({
  entity, onClose, onConfirm,
}: {
  entity: { display_name: string; fields: FieldRead[] };
  onClose: () => void;
  onConfirm: (payload: Record<string, unknown>) => void;
}) {
  const formFields = [...entity.fields]
    .filter((f) => !f.is_system && isFormVisible(f))
    .sort((a, b) => a.display_order - b.display_order);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(formFields.map((f) => [f.name, ""]))
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    formFields.forEach((f) => {
      const v = values[f.name] ?? "";
      const et = effectiveType(f);
      if (et === "number" || et === "decimal") payload[f.name] = v === "" ? null : Number(v);
      else if (et === "boolean") payload[f.name] = v === "true";
      else payload[f.name] = v === "" ? null : v;
    });
    onConfirm(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[16px] shadow-xl w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cardbg shrink-0">
          <h2 className="text-[20px] font-bold text-primary">Новая запись · {entity.display_name}</h2>
          <button onClick={onClose} className="text-primary/40 hover:text-primary text-[22px] leading-none">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {formFields.length === 0 && (
            <p className="text-[15px] text-primary/50">Нет доступных полей для ввода.<br/>Включите видимость полей в разделе «Источники → Форма».</p>
          )}

          {formFields.map((f) => {
            const et = effectiveType(f);
            const required = f.is_required;
            return (
              <div key={f.id} className="flex flex-col gap-1">
                <label className="text-[14px] font-medium text-primary">
                  {f.display_name}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <FieldInput
                  field={f}
                  et={et}
                  value={values[f.name] ?? ""}
                  onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
                  required={required}
                />
              </div>
            );
          })}

          <div className="flex gap-3 justify-end pt-2 shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-btn border border-cardbg text-[15px] text-primary hover:bg-mainbg transition-colors">
              Отмена
            </button>
            <button type="submit"
              className="px-5 py-2 rounded-btn bg-cta text-white text-[15px] font-medium hover:bg-active transition-colors">
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function recordLabel(payload: Record<string, unknown>): string {
  for (const key of ["name", "title", "display_name", "label", "subject"]) {
    if (payload[key]) return String(payload[key]).slice(0, 80);
  }
  const first = Object.values(payload).find(
    (v) => v !== null && v !== undefined && (typeof v === "string" || typeof v === "number")
  );
  return first !== undefined ? String(first).slice(0, 80) : "(без названия)";
}

/* ── Relation cell display — resolves UUID → label from the target entity ── */
function RelationCellDisplay({ field, value }: { field: FieldRead; value: string }) {
  const targetEntityId = field.field_options?.target_entity_id as string | undefined;
  const appsQ = useApps();
  const appId = appsQ.data?.items[0]?.id;
  const recordsQ = useRecords(appId, targetEntityId, { limit: 200 });
  const records = recordsQ.data?.items ?? [];

  if (!value) return <span className="text-primary/25">—</span>;
  if (!targetEntityId) return <span className="text-primary/40 font-mono text-[11px]">{value.slice(0, 8)}…</span>;
  if (recordsQ.isLoading) return <span className="text-primary/30 text-[12px]">…</span>;

  const linked = records.find((r) => r.id === value);
  if (!linked) return <span className="text-primary/40 font-mono text-[11px]">{value.slice(0, 8)}…</span>;

  const label = recordLabel(linked.payload as Record<string, unknown>);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#EBF4FF] text-cta text-[12px] font-medium max-w-[200px] truncate">
      {label}
    </span>
  );
}

/* ── Relation record picker — loads records from the target entity ── */
function RelationPickerInput({ field, value, onChange, required }: {
  field: FieldRead; value: string; onChange: (v: string) => void; required: boolean;
}) {
  const targetEntityId = field.field_options?.target_entity_id as string | undefined;
  const appsQ = useApps();
  const appId = appsQ.data?.items[0]?.id;
  const recordsQ = useRecords(appId, targetEntityId, { limit: 200 });
  const records = recordsQ.data?.items ?? [];

  const base = "w-full h-[40px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[15px] text-primary focus:outline-none focus:border-cta transition-colors appearance-none";

  if (!targetEntityId) {
    return (
      <input
        type="text"
        value={value}
        required={required}
        placeholder="ID записи"
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  }

  return (
    <select value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base}>
      <option value="">— Выберите запись —</option>
      {records.map((r) => (
        <option key={r.id} value={r.id}>
          {recordLabel(r.payload as Record<string, unknown>)}
        </option>
      ))}
      {recordsQ.isLoading && <option disabled>Загрузка…</option>}
    </select>
  );
}

/* ── File/image cell — upload + download for existing records ── */
function FileCell({
  appId, entityId, recordId, field, value,
}: {
  appId: string; entityId: string; recordId: string; field: FieldRead; value: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateRecord = useUpdateRecord(appId, entityId);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadRecordFile(appId, entityId, recordId, field.name, file);
      updateRecord.mutate({ recordId, payload: { [field.name]: result.id } });
    } finally {
      setUploading(false);
    }
  }, [appId, entityId, recordId, field.name, updateRecord]);

  async function handleDownload() {
    if (!value) return;
    try {
      const { url } = await getRecordFileDownloadUrl(appId, entityId, recordId, value);
      window.open(url, "_blank");
    } catch { /* presigned URL error — ignore */ }
  }

  if (uploading) return <span className="text-primary/40 text-[12px]">Загрузка…</span>;

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {value ? (
        <>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#EBF4FF] text-cta text-[12px] font-medium hover:bg-cta/20 transition-colors"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2v6M3 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10h8" strokeLinecap="round" />
            </svg>
            Скачать
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-[11px] text-primary/40 hover:text-primary transition-colors"
          >
            Заменить
          </button>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 text-[12px] text-primary/40 hover:text-cta transition-colors"
        >
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 9v2h8V9M6 2v6M4 4l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Прикрепить
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

/* ── Field input for create form ── */
function FieldInput({ field, et, value, onChange, required }: {
  field: FieldRead; et: string; value: string;
  onChange: (v: string) => void; required: boolean;
}) {
  const base = "w-full h-[40px] bg-mainbg border border-cardbg rounded-[8px] px-3 text-[15px] text-primary focus:outline-none focus:border-cta transition-colors";

  if (et === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={() => onChange(value === "true" ? "false" : "true")}
          className={`relative w-[44px] h-[24px] rounded-full transition-colors ${value === "true" ? "bg-cta" : "bg-cardbg"}`}
        >
          <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${value === "true" ? "left-[23px]" : "left-[3px]"}`} />
        </button>
        <span className="text-[14px] text-primary">{value === "true" ? "Да" : "Нет"}</span>
      </div>
    );
  }

  if (et === "select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    return (
      <select value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className={base + " appearance-none"}>
        <option value="">— Выберите —</option>
        {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    );
  }

  if (et === "date") return (
    <input type="date" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base} />
  );

  if (et === "datetime") return (
    <input type="datetime-local" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base} />
  );

  if (et === "number" || et === "decimal") return (
    <input type="number" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base + " text-right"} />
  );

  if (et === "long_text") return (
    <textarea value={value} required={required} onChange={(e) => onChange(e.target.value)} rows={3}
      className="w-full bg-mainbg border border-cardbg rounded-[8px] px-3 py-2 text-[15px] text-primary focus:outline-none focus:border-cta resize-none transition-colors" />
  );

  if (et === "email") return (
    <input type="email" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base} />
  );

  if (et === "url") return (
    <input type="url" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base} />
  );

  if (et === "phone") return (
    <input
      type="tel"
      value={value}
      required={required}
      inputMode="tel"
      pattern="[+\d\s\-\(\)]*"
      placeholder="+7 (___) ___-__-__"
      onChange={(e) => onChange(e.target.value.replace(/[^\d+\-\s()()]/g, ""))}
      className={base}
    />
  );

  if (et === "relation") return (
    <RelationPickerInput field={field} value={value} onChange={onChange} required={required} />
  );

  if (et === "file" || et === "image") return (
    <p className="text-[13px] text-primary/50 py-2">Файл можно прикрепить после сохранения записи.</p>
  );

  return (
    <input type="text" value={value} required={required} onChange={(e) => onChange(e.target.value)} className={base} />
  );
}

function canInlineEdit(et: string): boolean {
  return ["text", "long_text", "number", "decimal", "email", "phone", "url", "date", "datetime", "boolean", "select", "relation"].includes(et);
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

function DropdownButton({ icon, label, small, onClick }: { icon?: React.ReactNode; label: string; small?: boolean; onClick?: () => void }) {
  const isActive = !!onClick;
  return (
    <button
      disabled={!isActive}
      onClick={onClick}
      title={isActive ? undefined : "В разработке"}
      className={cn(
        "flex items-center gap-1.5 rounded-[6px] text-[13px]",
        small ? "px-2 py-1" : "px-3 py-1.5",
        isActive
          ? "text-primary hover:bg-mainbg transition-colors cursor-pointer"
          : "text-primary/40 cursor-not-allowed"
      )}>
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      {label}
      <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40" fill="currentColor">
        <path d="M2 4l4 4 4-4H2z" />
      </svg>
    </button>
  );
}

/* ── Filter panel ── */

const OPERATORS_TEXT: { value: FilterOperator; label: string }[] = [
  { value: "contains",    label: "содержит" },
  { value: "equals",      label: "равно" },
  { value: "starts_with", label: "начинается с" },
  { value: "not_empty",   label: "не пустое" },
  { value: "is_empty",    label: "пустое" },
];
const OPERATORS_NUM: { value: FilterOperator; label: string }[] = [
  { value: "equals",  label: "=" },
  { value: "gt",      label: ">" },
  { value: "lt",      label: "<" },
  { value: "not_empty", label: "не пустое" },
  { value: "is_empty",  label: "пустое" },
];

function operatorsFor(fieldType: string) {
  if (fieldType === "number" || fieldType === "decimal") return OPERATORS_NUM;
  if (fieldType === "boolean") return [{ value: "equals" as FilterOperator, label: "=" }, { value: "is_empty" as FilterOperator, label: "пустое" }];
  return OPERATORS_TEXT;
}

function FilterPanel({
  fields,
  rules,
  onChange,
  onClose,
}: {
  fields: FieldRead[];
  rules: FilterRule[];
  onChange: (rules: FilterRule[]) => void;
  onClose: () => void;
}) {
  function addRule() {
    const first = fields[0];
    if (!first) return;
    onChange([...rules, { id: `f${Date.now()}`, fieldName: first.name, operator: "contains", value: "" }]);
  }
  function removeRule(id: string) { onChange(rules.filter((r) => r.id !== id)); }
  function patchRule(id: string, patch: Partial<FilterRule>) {
    onChange(rules.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  return (
    <div className="border-b border-cardbg bg-[#F8FBFF] px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {rules.map((rule) => {
          const field = fields.find((f) => f.name === rule.fieldName);
          const ops = operatorsFor(field?.field_type ?? "text");
          const needsValue = rule.operator !== "is_empty" && rule.operator !== "not_empty";
          return (
            <div key={rule.id} className="flex items-center gap-1.5 bg-white border border-cardbg rounded-[8px] px-2 py-1.5 shadow-sm">
              {/* Field selector */}
              <select
                value={rule.fieldName}
                onChange={(e) => patchRule(rule.id, { fieldName: e.target.value, operator: "contains", value: "" })}
                className="text-[13px] text-primary bg-transparent outline-none cursor-pointer max-w-[120px]"
              >
                {fields.map((f) => <option key={f.id} value={f.name}>{f.display_name}</option>)}
              </select>
              {/* Operator selector */}
              <select
                value={rule.operator}
                onChange={(e) => patchRule(rule.id, { operator: e.target.value as FilterOperator })}
                className="text-[13px] text-primary/70 bg-transparent outline-none cursor-pointer"
              >
                {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {/* Value input */}
              {needsValue && (
                <input
                  value={rule.value}
                  onChange={(e) => patchRule(rule.id, { value: e.target.value })}
                  placeholder="значение"
                  className="text-[13px] text-primary border-b border-cardbg outline-none bg-transparent w-[100px] focus:border-cta placeholder-primary/30"
                />
              )}
              {/* Remove */}
              <button
                onClick={() => removeRule(rule.id)}
                className="text-primary/30 hover:text-red-400 transition-colors ml-1"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
        <button
          onClick={addRule}
          className="flex items-center gap-1.5 text-[13px] text-cta hover:opacity-70 transition-opacity"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Добавить фильтр
        </button>
        {rules.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[13px] text-primary/40 hover:text-primary/70 transition-colors ml-2"
          >
            Очистить
          </button>
        )}
        <button onClick={onClose} className="ml-auto text-primary/30 hover:text-primary/60 transition-colors">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
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
