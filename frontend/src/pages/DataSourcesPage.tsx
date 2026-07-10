import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities, useUpdateField } from "@/shared/hooks/useEntities";
import type { EntityRead, FieldRead } from "@/shared/api/entities";

/* ── Validation rule helpers ── */
type VRules = Record<string, unknown>;

function getGroup(fieldType: string): "text" | "number" | "date" | "select" | "multiselect" | "none" {
  if (["text", "long_text", "rich_text", "email", "phone", "url"].includes(fieldType)) return "text";
  if (["number", "decimal"].includes(fieldType)) return "number";
  if (["date", "datetime"].includes(fieldType)) return "date";
  if (fieldType === "select") return "select";
  if (fieldType === "multi_select") return "multiselect";
  return "none";
}

function vr(rules: VRules, key: string): string {
  const v = rules[key];
  return v == null ? "" : String(v);
}
function vrBool(rules: VRules, key: string): boolean {
  return !!rules[key];
}
function vrList(rules: VRules, key: string): string[] {
  const v = rules[key];
  if (!Array.isArray(v)) return [];
  return v.map(String);
}

function rulesEqual(a: VRules, b: VRules): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

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

type Tab = "fields" | "form" | "validation";

export function DataSourcesPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [navCollapsed, setNavCollapsed] = useState(false);

  const { data: appsData } = useApps();
  const appId = appsData?.items[0]?.id;
  const { data: entities, isLoading } = useEntities(appId);
  const items: EntityRead[] = entities ?? [];

  const activeEntity: EntityRead | null =
    items.find((e) => e.id === activeEntityId) ?? items[0] ?? null;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />

      {/* ── Source list sidebar ── */}
      {!navCollapsed && <aside
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
      </aside>}

      {/* ── Center: field editor ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1235 : 945, height: 1000, transition: "left 0.2s, width 0.2s" }}
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
              {([["fields", "Поля"], ["form", "Форма"], ["validation", "Валидация"]] as [Tab, string][]).map(([id, label]) => (
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
          {activeEntity && tab === "validation" && (
            <ValidationTab entity={activeEntity} appId={appId!} />
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

/* ── Validation tab ── */
const COMPARE_OPS_SHORT = [
  { value: "eq", label: "=" }, { value: "ne", label: "≠" },
  { value: "gt", label: ">" }, { value: "gte", label: "≥" },
  { value: "lt", label: "<" }, { value: "lte", label: "≤" },
  { value: "contains", label: "содержит" }, { value: "is_null", label: "пустое" }, { value: "is_not_null", label: "не пустое" },
];

function ValidationTab({ entity, appId }: { entity: EntityRead; appId: string }) {
  const updateField = useUpdateField(appId);
  const fields = [...entity.fields]
    .filter((f) => !f.is_system && getGroup(f.field_type) !== "none")
    .sort((a, b) => a.display_order - b.display_order);

  const [drafts, setDrafts] = useState<Record<string, VRules>>({});

  function getDraft(f: FieldRead): VRules {
    return drafts[f.id] ?? (f.validation_rules as VRules) ?? {};
  }
  function setDraft(fieldId: string, patch: VRules) {
    setDrafts((prev) => {
      const base = prev[fieldId] ?? {};
      return { ...prev, [fieldId]: { ...base, ...patch } };
    });
  }
  function clearKey(fieldId: string, key: string) {
    setDrafts((prev) => {
      const next = { ...(prev[fieldId] ?? {}) };
      delete next[key];
      return { ...prev, [fieldId]: next };
    });
  }
  function save(f: FieldRead) {
    updateField.mutate(
      { entityId: entity.id, fieldId: f.id, body: { validation_rules: getDraft(f) } },
      { onSuccess: () => setDrafts((p) => { const n = { ...p }; delete n[f.id]; return n; }) }
    );
  }
  function isDirty(f: FieldRead) {
    return !!drafts[f.id] && !rulesEqual(drafts[f.id], (f.validation_rules as VRules) ?? {});
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[18px] font-semibold text-primary mb-2">Нет полей для валидации</p>
        <p className="text-[14px] text-primary/50">Добавьте текстовые, числовые или датовые поля во вкладке «Поля».</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[860px]">
      <p className="text-[15px] text-primary/60">
        Правила валидации проверяются при сохранении записи. Настройте ограничения для каждого поля.
      </p>

      {fields.map((field) => {
        const draft = getDraft(field);
        const group = getGroup(field.field_type);
        const dirty = isDirty(field);

        return (
          <div key={field.id} className="bg-white rounded-[14px] border border-cardbg overflow-hidden">
            {/* Field header */}
            <div className="flex items-center justify-between h-[50px] px-5 bg-mainbg border-b border-cardbg">
              <div className="flex items-center gap-2">
                <span className="w-[16px] h-[16px] text-primary/50 shrink-0">
                  <FieldTypeIcon type={field.field_type} />
                </span>
                <span className="text-[15px] font-semibold text-primary">{field.display_name}</span>
                <span className="text-[12px] font-mono text-primary/40 bg-white px-1.5 py-0.5 rounded border border-cardbg">{FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}</span>
              </div>
              <div className="flex items-center gap-2">
                {dirty && (
                  <span className="w-2 h-2 rounded-full bg-cta/70 shrink-0" title="Есть несохранённые изменения" />
                )}
                <button
                  onClick={() => save(field)}
                  disabled={!dirty}
                  className={cn(
                    "h-[30px] px-4 rounded-[8px] text-[13px] font-medium transition-colors",
                    dirty
                      ? "bg-cta text-white hover:bg-cta/90"
                      : "bg-cardbg text-primary/30 cursor-not-allowed"
                  )}
                >
                  Сохранить
                </button>
              </div>
            </div>

            {/* Rules grid */}
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* ── Text group ── */}
              {group === "text" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <VField label="Минимальная длина">
                      <NumberInput
                        value={vr(draft, "min_length")}
                        placeholder="не задано"
                        onChange={(v) => v ? setDraft(field.id, { min_length: Number(v) }) : clearKey(field.id, "min_length")}
                      />
                    </VField>
                    <VField label="Максимальная длина">
                      <NumberInput
                        value={vr(draft, "max_length")}
                        placeholder="не задано"
                        onChange={(v) => v ? setDraft(field.id, { max_length: Number(v) }) : clearKey(field.id, "max_length")}
                      />
                    </VField>
                  </div>
                  <VField label="Регулярное выражение (pattern)">
                    <TextInput
                      value={vr(draft, "pattern")}
                      placeholder="например: ^[a-zA-Z]+$"
                      mono
                      onChange={(v) => v ? setDraft(field.id, { pattern: v }) : clearKey(field.id, "pattern")}
                    />
                  </VField>
                  <VField label="Сообщение при несовпадении с паттерном">
                    <TextInput
                      value={vr(draft, "pattern_message")}
                      placeholder="Текст ошибки при несовпадении"
                      onChange={(v) => v ? setDraft(field.id, { pattern_message: v }) : clearKey(field.id, "pattern_message")}
                    />
                  </VField>
                </>
              )}

              {/* ── Number group ── */}
              {group === "number" && (
                <div className="grid grid-cols-2 gap-4">
                  <VField label="Минимальное значение">
                    <NumberInput
                      value={vr(draft, "min")}
                      placeholder="не задано"
                      decimal={field.field_type === "decimal"}
                      onChange={(v) => v !== "" ? setDraft(field.id, { min: Number(v) }) : clearKey(field.id, "min")}
                    />
                  </VField>
                  <VField label="Максимальное значение">
                    <NumberInput
                      value={vr(draft, "max")}
                      placeholder="не задано"
                      decimal={field.field_type === "decimal"}
                      onChange={(v) => v !== "" ? setDraft(field.id, { max: Number(v) }) : clearKey(field.id, "max")}
                    />
                  </VField>
                </div>
              )}

              {/* ── Date group ── */}
              {group === "date" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <VField label="Минимальная дата">
                      <DateInput
                        value={vr(draft, "min_date")}
                        onChange={(v) => v ? setDraft(field.id, { min_date: v }) : clearKey(field.id, "min_date")}
                      />
                    </VField>
                    <VField label="Максимальная дата">
                      <DateInput
                        value={vr(draft, "max_date")}
                        onChange={(v) => v ? setDraft(field.id, { max_date: v }) : clearKey(field.id, "max_date")}
                      />
                    </VField>
                  </div>
                  <div className="flex gap-6">
                    <CheckRow
                      label="Только будущие даты"
                      checked={vrBool(draft, "future_only")}
                      onChange={(v) => v ? setDraft(field.id, { future_only: true, past_only: undefined }) : clearKey(field.id, "future_only")}
                    />
                    <CheckRow
                      label="Только прошлые даты"
                      checked={vrBool(draft, "past_only")}
                      onChange={(v) => v ? setDraft(field.id, { past_only: true, future_only: undefined }) : clearKey(field.id, "past_only")}
                    />
                  </div>
                </>
              )}

              {/* ── Select / multiselect ── */}
              {(group === "select" || group === "multiselect") && (
                <>
                  <VField label="Разрешённые значения (через запятую)">
                    <TextInput
                      value={vrList(draft, "allowed_values").join(", ")}
                      placeholder="значение1, значение2, …"
                      onChange={(v) => {
                        const arr = v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
                        arr.length ? setDraft(field.id, { allowed_values: arr }) : clearKey(field.id, "allowed_values");
                      }}
                    />
                  </VField>
                  {group === "multiselect" && (
                    <div className="grid grid-cols-2 gap-4">
                      <VField label="Минимум выбранных">
                        <NumberInput
                          value={vr(draft, "min_selected")}
                          placeholder="не задано"
                          onChange={(v) => v ? setDraft(field.id, { min_selected: Number(v) }) : clearKey(field.id, "min_selected")}
                        />
                      </VField>
                      <VField label="Максимум выбранных">
                        <NumberInput
                          value={vr(draft, "max_selected")}
                          placeholder="не задано"
                          onChange={(v) => v ? setDraft(field.id, { max_selected: Number(v) }) : clearKey(field.id, "max_selected")}
                        />
                      </VField>
                    </div>
                  )}
                </>
              )}

              {/* ── Extra conditions (all types) ── */}
              <ExtraConditions
                conditions={vrList(draft, "extra_conditions").map((s) => {
                  try { return JSON.parse(s) as { field: string; op: string; value: string }; } catch { return null; }
                }).filter(Boolean) as { field: string; op: string; value: string }[]}
                entityFields={entity.fields.filter((f) => !f.is_system && f.name !== field.name)}
                onChange={(conds) => {
                  conds.length
                    ? setDraft(field.id, { extra_conditions: conds.map((c) => JSON.stringify(c)) })
                    : clearKey(field.id, "extra_conditions");
                }}
              />

              {/* ── Custom error message (all types) ── */}
              <VField label="Сообщение об ошибке валидации">
                <TextInput
                  value={vr(draft, "custom_message")}
                  placeholder="Текст ошибки для пользователя (необязательно)"
                  onChange={(v) => v ? setDraft(field.id, { custom_message: v }) : clearKey(field.id, "custom_message")}
                />
              </VField>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Small reusable sub-components ── */
function VField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-primary/50 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
function TextInput({ value, placeholder, mono, onChange }: { value: string; placeholder?: string; mono?: boolean; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-[36px] w-full border border-cardbg rounded-[8px] px-3 text-[13px] text-primary focus:outline-none focus:border-cta bg-mainbg",
        mono && "font-mono"
      )}
    />
  );
}
function NumberInput({ value, placeholder, decimal, onChange }: { value: string; placeholder?: string; decimal?: boolean; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      step={decimal ? "0.01" : "1"}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[36px] w-full border border-cardbg rounded-[8px] px-3 text-[13px] text-primary focus:outline-none focus:border-cta bg-mainbg"
    />
  );
}
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[36px] w-full border border-cardbg rounded-[8px] px-3 text-[13px] text-primary focus:outline-none focus:border-cta bg-mainbg"
    />
  );
}
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-colors shrink-0",
          checked ? "bg-cta border-cta" : "bg-white border-cardbg hover:border-cta/50"
        )}
      >
        {checked && <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
      <span className="text-[13px] text-primary">{label}</span>
    </label>
  );
}

function ExtraConditions({
  conditions,
  entityFields,
  onChange,
}: {
  conditions: { field: string; op: string; value: string }[];
  entityFields: FieldRead[];
  onChange: (conds: { field: string; op: string; value: string }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const opsNoValue = ["is_null", "is_not_null"];

  function addRow() {
    onChange([...conditions, { field: entityFields[0]?.name ?? "", op: "eq", value: "" }]);
    setOpen(true);
  }
  function patch(idx: number, p: Partial<{ field: string; op: string; value: string }>) {
    onChange(conditions.map((c, i) => i === idx ? { ...c, ...p } : c));
  }
  function remove(idx: number) {
    const next = conditions.filter((_, i) => i !== idx);
    onChange(next);
    if (!next.length) setOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-primary/50 uppercase tracking-wide">
          Дополнительные условия
        </span>
        {conditions.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="text-[12px] text-cta hover:underline">
            {open ? "Свернуть" : "Показать"} ({conditions.length})
          </button>
        )}
      </div>

      {(open || conditions.length === 0) && (
        <div className="flex flex-col gap-2">
          {conditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-mainbg rounded-[8px] px-3 py-2">
              <span className="text-[12px] text-primary/40 shrink-0">Если</span>
              <select
                value={cond.field}
                onChange={(e) => patch(idx, { field: e.target.value })}
                className="flex-1 h-[30px] border border-cardbg rounded-[6px] px-2 text-[12px] bg-white text-primary focus:outline-none"
              >
                {entityFields.map((f) => <option key={f.id} value={f.name}>{f.display_name}</option>)}
              </select>
              <select
                value={cond.op}
                onChange={(e) => patch(idx, { op: e.target.value })}
                className="w-[130px] h-[30px] border border-cardbg rounded-[6px] px-2 text-[12px] bg-white text-primary focus:outline-none"
              >
                {COMPARE_OPS_SHORT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!opsNoValue.includes(cond.op) && (
                <input
                  value={cond.value}
                  onChange={(e) => patch(idx, { value: e.target.value })}
                  placeholder="значение"
                  className="w-[100px] h-[30px] border border-cardbg rounded-[6px] px-2 text-[12px] focus:outline-none focus:border-cta"
                />
              )}
              <button onClick={() => remove(idx)} className="text-primary/30 hover:text-mistake text-[14px] leading-none shrink-0">✕</button>
            </div>
          ))}
          <button
            onClick={addRow}
            disabled={entityFields.length === 0}
            className="self-start text-[12px] text-cta hover:text-cta/70 font-medium disabled:opacity-40"
          >
            + Добавить условие
          </button>
        </div>
      )}

      {!open && conditions.length > 0 && (
        <div className="text-[12px] text-primary/40 italic">
          {conditions.length} условие(й) — нажмите «Показать» для редактирования
        </div>
      )}
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
