import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities, useUpdateField } from "@/shared/hooks/useEntities";
import type { EntityRead, FieldRead } from "@/shared/api/entities";

/* ── Display type options (UI-only, stored in field_options.display_type) ── */
const DISPLAY_TYPES: { value: string; label: string }[] = [
  { value: "text",         label: "Текст" },
  { value: "long_text",    label: "Длинный текст" },
  { value: "number",       label: "Число" },
  { value: "decimal",      label: "Дробное" },
  { value: "boolean",      label: "Флаг" },
  { value: "date",         label: "Дата" },
  { value: "datetime",     label: "Дата и время" },
  { value: "select",       label: "Список" },
  { value: "multi_select", label: "Мульти-список" },
  { value: "email",        label: "Email" },
  { value: "phone",        label: "Телефон" },
  { value: "url",          label: "URL" },
  { value: "image",        label: "Изображение" },
  { value: "file",         label: "Файл" },
];

const FIELD_TYPE_LABEL: Record<string, string> = {
  text:         "Текст",
  long_text:    "Длинный текст",
  rich_text:    "Rich-текст",
  number:       "Число",
  decimal:      "Дробное",
  boolean:      "Флаг",
  date:         "Дата",
  datetime:     "Дата и время",
  time:         "Время",
  select:       "Список",
  multi_select: "Мульти-список",
  file:         "Файл",
  image:        "Изображение",
  relation:     "Связь",
  formula:      "Формула",
  url:          "URL",
  email:        "Email",
  phone:        "Телефон",
  json:         "JSON",
  lookup:       "Поиск",
};

type Tab = "fields" | "form";

export function DataSourcesPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");

  const { data: appsData } = useApps();
  const appId = appsData?.items[0]?.id;
  const { data: entities, isLoading } = useEntities(appId);
  const items: EntityRead[] = entities ?? [];

  const activeEntity: EntityRead | null =
    items.find((e) => e.id === activeEntityId) ?? items[0] ?? null;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Source list sidebar ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1000, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[10px]">
          <h2 className="text-nav font-bold text-primary">Источники</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" className="w-5 h-5"><PlusIcon /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-[10px] px-0 pt-[10px]">
          {isLoading && <span className="px-4 text-[16px] text-primary/50">Загрузка…</span>}
          {!isLoading && items.length === 0 && (
            <span className="px-4 text-[16px] text-primary/50">Нет источников</span>
          )}
          {items.map((entity) => {
            const active = entity.id === (activeEntity?.id ?? null);
            return (
              <button
                key={entity.id}
                onClick={() => { setActiveEntityId(entity.id); setTab("fields"); }}
                className={cn(
                  "flex items-center gap-[7px] w-[290px] h-[46px] px-[15px] rounded-btn transition-colors text-left",
                  active ? "bg-selected" : "hover:bg-cardbg/50"
                )}
              >
                <span className="w-6 h-6 shrink-0"><DbIcon highlight={active} /></span>
                <span className={cn(
                  "flex-1 text-[18px] leading-[150%] font-medium truncate",
                  active ? "text-cta" : "text-primary"
                )}>{entity.display_name}</span>
                <span className="text-[13px] text-primary/40 shrink-0">{entity.fields.length}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t-2 border-white p-[15px]">
          <div className="flex items-center gap-[10px]">
            <span className="w-7 h-7 shrink-0"><UserSettingsIcon /></span>
            <span className="text-meta text-primary">Пользовательские настройки</span>
          </div>
        </div>
      </aside>

      {/* ── Center: field editor ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: 380, top: 70, width: 945, height: 1000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-[25px] pr-[15px] h-[64px] border-b-2 border-white shrink-0">
          <h1 className="text-nav font-bold text-primary whitespace-nowrap">
            {activeEntity ? activeEntity.display_name : "Выберите источник"}
          </h1>
          {activeEntity && (
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-primary/50">
                {activeEntity.fields.length} полей · slug: <span className="font-mono">{activeEntity.slug}</span>
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        {activeEntity && (
          <div className="flex items-center gap-2 px-[25px] pt-[15px] pb-0 shrink-0">
            <div className="flex items-center bg-white rounded-tab p-[3.6px] gap-1 self-start">
              {([["fields", "Поля"], ["form", "Форма"]] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "px-5 py-[3.6px] rounded-tab text-[16px] text-primary transition-colors",
                    tab === id ? "bg-cardbg font-semibold" : "hover:bg-mainbg"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto px-[25px] pt-[20px] pb-[20px]">
          {!activeEntity && !isLoading && (
            <p className="text-[18px] text-primary/50 pt-4">Выберите источник данных слева</p>
          )}
          {activeEntity && tab === "fields" && (
            <FieldsTab entity={activeEntity} appId={appId!} />
          )}
          {activeEntity && tab === "form" && (
            <FormTab entity={activeEntity} appId={appId!} />
          )}
        </div>
      </div>

      <PreviewPanel projectName={activeEntity?.display_name ?? "Data"} />
    </div>
  );
}

/* ── Fields tab ── */
function FieldsTab({ entity, appId }: { entity: EntityRead; appId: string }) {
  const updateField = useUpdateField(appId);
  const fields = [...entity.fields].sort((a, b) => a.display_order - b.display_order);

  function patchField(field: FieldRead, patch: Parameters<typeof updateField.mutate>[0]["body"]) {
    updateField.mutate({ entityId: entity.id, fieldId: field.id, body: patch });
  }

  function setDisplayType(field: FieldRead, displayType: string) {
    patchField(field, {
      field_options: { ...field.field_options, display_type: displayType },
    });
  }

  function toggleRequired(field: FieldRead) {
    if (field.is_system) return;
    patchField(field, { is_required: !field.is_required });
  }

  function toggleIndexed(field: FieldRead) {
    if (field.is_system) return;
    patchField(field, { is_indexed: !field.is_indexed });
  }

  return (
    <div className="min-w-[800px] flex flex-col gap-0">
      {/* Header row */}
      <div className="flex items-center gap-4 h-[40px] px-4 mb-1">
        <span className="w-[220px] text-[16px] font-semibold text-primary">Название</span>
        <span className="w-[120px] text-[16px] font-semibold text-primary">Тип БД</span>
        <span className="w-[160px] text-[16px] font-semibold text-primary">Отображение</span>
        <span className="w-[90px] text-[16px] font-semibold text-primary text-center">Обязат.</span>
        <span className="w-[90px] text-[16px] font-semibold text-primary text-center">Индекс</span>
        <span className="w-[90px] text-[16px] font-semibold text-primary text-center">Системный</span>
      </div>

      {fields.length === 0 && (
        <p className="text-[18px] text-primary/50 px-4">Нет полей</p>
      )}

      {fields.map((field) => {
        const displayType = (field.field_options?.display_type as string) ?? field.field_type;
        return (
          <div
            key={field.id}
            className="flex items-center gap-4 h-[52px] px-4 rounded-[10px] hover:bg-white/60 transition-colors"
          >
            {/* Название */}
            <div className="w-[220px] flex items-center gap-2 shrink-0">
              <span className="w-[18px] h-[18px] shrink-0 text-primary/40">
                <FieldTypeIcon type={field.field_type} />
              </span>
              <span className="text-[16px] font-medium text-primary truncate" title={field.display_name}>
                {field.display_name}
              </span>
              {field.is_system && (
                <span className="text-[11px] text-primary/30 bg-mainbg rounded-full px-1.5 py-0.5 shrink-0">sys</span>
              )}
            </div>

            {/* Тип БД — только отображение */}
            <div className="w-[120px] shrink-0">
              <span className="text-[14px] text-primary/60 bg-white px-2 py-1 rounded-[6px] border border-cardbg">
                {FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}
              </span>
            </div>

            {/* Отображение (display_type) — редактируемый */}
            <div className="w-[160px] shrink-0">
              <div className="relative">
                <select
                  value={displayType}
                  onChange={(e) => setDisplayType(field, e.target.value)}
                  disabled={field.is_system}
                  className={cn(
                    "w-full bg-white border border-cardbg rounded-[8px] px-3 py-1.5 text-[14px] text-primary appearance-none focus:outline-none focus:border-cta pr-7",
                    field.is_system && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {DISPLAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronIcon />
                </span>
              </div>
            </div>

            {/* Обязательное */}
            <div className="w-[90px] flex justify-center shrink-0">
              <button
                onClick={() => toggleRequired(field)}
                disabled={field.is_system}
                className={cn(
                  "w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center transition-colors",
                  field.is_required ? "border-cta bg-cta" : "border-cardbg bg-white",
                  field.is_system ? "opacity-40 cursor-not-allowed" : "hover:border-cta/70 cursor-pointer"
                )}
              >
                {field.is_required && <CheckMark />}
              </button>
            </div>

            {/* Индекс */}
            <div className="w-[90px] flex justify-center shrink-0">
              <button
                onClick={() => toggleIndexed(field)}
                disabled={field.is_system}
                className={cn(
                  "w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center transition-colors",
                  field.is_indexed ? "border-cta bg-cta" : "border-cardbg bg-white",
                  field.is_system ? "opacity-40 cursor-not-allowed" : "hover:border-cta/70 cursor-pointer"
                )}
              >
                {field.is_indexed && <CheckMark />}
              </button>
            </div>

            {/* Системный */}
            <div className="w-[90px] flex justify-center shrink-0">
              <span className={cn(
                "w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center",
                field.is_system ? "border-primary/40 bg-primary/10" : "border-cardbg bg-white"
              )}>
                {field.is_system && (
                  <svg viewBox="0 0 10 10" className="w-3 h-3 text-primary/60" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Form tab ── */
function FormTab({ entity, appId }: { entity: EntityRead; appId: string }) {
  const updateField = useUpdateField(appId);
  const fields = [...entity.fields]
    .filter((f) => !f.is_system)
    .sort((a, b) => a.display_order - b.display_order);

  function toggleFormVisible(field: FieldRead) {
    const current = field.field_options?.form_visible !== false;
    updateField.mutate({
      entityId: entity.id,
      fieldId: field.id,
      body: { field_options: { ...field.field_options, form_visible: !current } },
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-[700px]">
      <p className="text-[16px] text-primary/60">
        Настройте какие поля видны в форме создания и редактирования записи.
        Системные поля скрыты автоматически.
      </p>

      <div className="bg-white rounded-[12px] border border-cardbg overflow-hidden">
        <div className="flex items-center h-[44px] px-5 bg-mainbg border-b border-cardbg">
          <span className="flex-1 text-[15px] font-semibold text-primary">Поле</span>
          <span className="w-[120px] text-[15px] font-semibold text-primary text-center">Показывать в форме</span>
        </div>

        {fields.length === 0 && (
          <p className="px-5 py-4 text-[16px] text-primary/50">Нет пользовательских полей</p>
        )}

        {fields.map((field, idx) => {
          const visible = field.field_options?.form_visible !== false;
          return (
            <div
              key={field.id}
              className={cn(
                "flex items-center h-[52px] px-5",
                idx !== 0 && "border-t border-cardbg",
                !visible && "opacity-50"
              )}
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="w-[16px] h-[16px] text-primary/40 shrink-0">
                  <FieldTypeIcon type={field.field_type} />
                </span>
                <span className="text-[16px] text-primary font-medium">{field.display_name}</span>
                <span className="text-[13px] text-primary/40 font-mono">{field.name}</span>
              </div>

              {/* Toggle */}
              <div className="w-[120px] flex justify-center">
                <button
                  onClick={() => toggleFormVisible(field)}
                  className={cn(
                    "relative w-[44px] h-[24px] rounded-full transition-colors",
                    visible ? "bg-cta" : "bg-cardbg"
                  )}
                >
                  <span className={cn(
                    "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all",
                    visible ? "left-[23px]" : "left-[3px]"
                  )} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[13px] text-primary/40">
        Порядок полей определяется полем «display_order». Для изменения порядка перейдите во вкладку «Поля».
      </p>
    </div>
  );
}

/* ── Icons ── */
function FieldTypeIcon({ type }: { type: string }) {
  if (type === "number" || type === "decimal") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2l-1 12M13 2l-1 12M2 6h12M2 10h12" strokeLinecap="round" />
    </svg>
  );
  if (type === "boolean") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="currentColor">
      <path d="M5.5 8a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z" />
      <path fillRule="evenodd" d="M0 8a5 5 0 1116 0A5 5 0 010 8zm5.5-2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" clipRule="evenodd" />
    </svg>
  );
  if (type === "date" || type === "datetime" || type === "time") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="11" rx="1.5" />
      <path d="M1 7h14M5 1v4M11 1v4" strokeLinecap="round" />
    </svg>
  );
  if (type === "select" || type === "multi_select") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
    </svg>
  );
  if (type === "image" || type === "file") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
      <path d="M1 10l4-4 3 3 2-2 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "relation" || type === "lookup") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 8h4M4 5a2 2 0 100 6 2 2 0 000-6zM12 5a2 2 0 100 6 2 2 0 000-6z" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h10M3 8h7M3 11h5" strokeLinecap="round" />
    </svg>
  );
}

function DbIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke={c} strokeWidth="2" />
      <path d="M4 5 L4 19 C4 20.66 7.58 22 12 22 C16.42 22 20 20.66 20 19 L20 5" stroke={c} strokeWidth="2" />
      <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke={c} strokeWidth="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="9" cy="9" r="6" stroke="#00205F" strokeWidth="2" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <line x1="10" y1="3" x2="10" y2="17" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
      <path d="M2 4 L6 8 L10 4" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 10 10" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserSettingsIcon() {
  return (
    <svg viewBox="0 0 28 29" fill="none" className="w-full h-full">
      <circle cx="11" cy="8" r="4" stroke="#00205F" strokeWidth="2.33" />
      <path d="M3 23 C3 18 6.5 16 11 16 C13 16 14.7 16.4 16 17.2" stroke="#00205F" strokeWidth="2.33" strokeLinecap="round" />
      <circle cx="21" cy="21" r="3.2" stroke="#00205F" strokeWidth="2" />
      <path d="M21 16.5 L21 18 M21 24 L21 25.5 M16.5 21 L18 21 M24 21 L25.5 21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
