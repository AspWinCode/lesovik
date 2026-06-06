import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities } from "@/shared/hooks/useEntities";
import type { EntityRead, FieldRead } from "@/shared/api/entities";

/* ── Field type → display label ── */
const FIELD_TYPE_LABEL: Record<string, string> = {
  text:         "Текст",
  long_text:    "Длинный текст",
  rich_text:    "Форматированный текст",
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

/* ── Table columns shown in the center ── */
const COLUMNS = [
  "Название", "Тип", "Ключ", "Обязат.", "Уникальный",
  "Системный", "Индекс", "Отображаемое имя",
];

export function DataSourcesPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");

  /* get appId from the first app */
  const { data: appsData } = useApps();
  const appId = appsData?.items[0]?.id;

  const { data: entities, isLoading } = useEntities(appId);
  const items: EntityRead[] = entities ?? [];

  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  /* resolve active entity; fall back to first when loaded */
  const activeEntity: EntityRead | null =
    items.find((e) => e.id === activeEntityId) ??
    items[0] ??
    null;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Source list panel ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1000, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[10px]">
          <h2 className="text-nav font-bold text-primary">Источники</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" className="w-5 h-5"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-[10px] px-0 pt-[10px]">
          {isLoading && (
            <span className="px-4 text-[16px] text-primary/50">Загрузка…</span>
          )}
          {!isLoading && items.length === 0 && (
            <span className="px-4 text-[16px] text-primary/50">Нет источников</span>
          )}
          {items.map((entity) => {
            const active = entity.id === (activeEntity?.id ?? null);
            return (
              <button
                key={entity.id}
                onClick={() => setActiveEntityId(entity.id)}
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

        {/* Bottom: options */}
        <div className="border-t-2 border-white flex flex-col gap-[15px] p-[15px]">
          <button className="flex items-center justify-between">
            <span className="text-meta text-primary uppercase">Опции</span>
            <span className="w-6 h-6"><Chevron /></span>
          </button>
          <div className="flex items-center gap-[10px]">
            <span className="w-7 h-7 shrink-0"><UserSettingsIcon /></span>
            <span className="text-meta text-primary">Пользовательские настройки</span>
          </div>
        </div>
      </aside>

      {/* ── Center: table editor ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: 380, top: 70, width: 945, height: 1000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-[25px] pr-[15px] h-[64px] border-b-2 border-white shrink-0">
          <h1 className="text-nav font-bold text-primary whitespace-nowrap">
            {activeEntity ? `Таблица: ${activeEntity.display_name}` : "Выберите источник"}
          </h1>
          <div className="flex items-center gap-[25px]">
            <button className="flex items-center justify-center px-5 h-[34px] border-2 border-cta rounded-[20px] text-[14px] font-semibold text-cta whitespace-nowrap">
              Перейти к исх.коду
            </button>
            <button aria-label="Настройки таблицы" className="w-[29px] h-[29px]"><TableSettingsIcon /></button>
            <button aria-label="Обновить" className="w-[25px] h-[25px]"><RefreshIcon /></button>
            <button aria-label="Добавить" className="w-[22px] h-[22px]"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[3px] w-[22px] h-[22px] justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-[3px] h-[3px] rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        {/* Meta row */}
        {activeEntity && (
          <div className="flex flex-wrap gap-x-[30px] gap-y-[3px] pl-[25px] pr-[6px] py-[10px] shrink-0">
            <span className="text-[16px] text-primary">
              Slug: <span className="font-semibold">{activeEntity.slug}</span>
            </span>
            <span className="text-[16px] text-primary">
              Полей: <span className="font-semibold">{activeEntity.fields.length}</span>
            </span>
            {activeEntity.description && (
              <span className="text-[16px] text-primary">
                Описание: <span className="font-semibold">{activeEntity.description}</span>
              </span>
            )}
          </div>
        )}

        {/* Table (horizontal scroll) */}
        <div className="flex-1 overflow-auto px-[25px] pt-[15px]">
          {!activeEntity && !isLoading && (
            <p className="text-[18px] text-primary/50 pt-4">Выберите источник данных слева</p>
          )}
          {activeEntity && (
            <EntityFieldsTable entity={activeEntity} />
          )}
        </div>
      </div>

      <PreviewPanel projectName={activeEntity?.display_name ?? "Data"} />
    </div>
  );
}

/* ── Fields table ── */
function EntityFieldsTable({ entity }: { entity: EntityRead }) {
  const fields = [...entity.fields].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="min-w-[1100px] flex flex-col gap-[15px]">
      {/* Header */}
      <div className="flex items-center gap-[18px] h-[43px]">
        {COLUMNS.map((c, i) => (
          <span key={c} className={cn(
            "text-[18px] font-semibold text-primary text-center shrink-0",
            i === 0 ? "w-[220px] text-left" :
            i === 1 ? "w-[160px] text-left" :
            "w-[100px]"
          )}>{c}</span>
        ))}
      </div>

      {/* Rows */}
      {fields.length === 0 && (
        <p className="text-[18px] text-primary/50">Нет полей</p>
      )}
      {fields.map((f) => (
        <FieldRow key={f.id} field={f} />
      ))}
    </div>
  );
}

function FieldRow({ field }: { field: FieldRead }) {
  return (
    <div className="flex items-center gap-[18px] h-[43px]">
      {/* Название */}
      <div className="w-[220px] h-[43px] flex items-center gap-[10px] px-4 bg-cardbg rounded-btn shrink-0">
        <span className="w-[15px] h-[15px] shrink-0"><EditMini /></span>
        <span className="text-[16px] font-semibold text-primary truncate" title={field.name}>{field.name}</span>
      </div>
      {/* Тип */}
      <div className="w-[160px] h-[43px] flex items-center justify-between px-4 bg-cardbg rounded-btn shrink-0">
        <span className="text-[16px] font-semibold text-primary truncate">
          {FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}
        </span>
        <span className="w-3 h-3 shrink-0"><Chevron /></span>
      </div>
      {/* Ключ (is_unique + is_system) */}
      <div className="w-[100px] flex justify-center shrink-0">
        <CheckCircle on={field.is_system && field.is_unique} />
      </div>
      {/* Обязат. */}
      <div className="w-[100px] flex justify-center shrink-0">
        <CheckCircle on={field.is_required} />
      </div>
      {/* Уникальный */}
      <div className="w-[100px] flex justify-center shrink-0">
        <CheckCircle on={field.is_unique} />
      </div>
      {/* Системный */}
      <div className="w-[100px] flex justify-center shrink-0">
        <CheckCircle on={field.is_system} />
      </div>
      {/* Индекс */}
      <div className="w-[100px] flex justify-center shrink-0">
        <CheckCircle on={field.is_indexed} />
      </div>
      {/* Отображаемое имя */}
      <div className="w-[220px] h-[43px] flex items-center px-4 bg-cardbg rounded-btn shrink-0">
        <span className="text-[16px] text-primary truncate" title={field.display_name}>{field.display_name}</span>
      </div>
    </div>
  );
}

/* ── Icons ── */
function Chevron() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
      <path d="M2 4 L6 8 L10 4" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
function CheckCircle({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 30 30" fill="none" className="w-[30px] h-[30px]">
      <circle cx="15" cy="15" r="14" stroke="#00205F" strokeWidth="2" fill={on ? "#00205F" : "none"} />
      {on && <path d="M9 15 L13 19 L21 10" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
function EditMini() {
  return (
    <svg viewBox="0 0 15 15" fill="none" className="w-full h-full">
      <path d="M3 11 L3 12 L4 12 L11 5 L10 4 Z" fill="#00205F" />
      <path d="M10.5 3.5 L11.5 4.5" stroke="#00205F" strokeWidth="1.4" />
    </svg>
  );
}
function TableSettingsIcon() {
  return (
    <svg viewBox="0 0 29 29" fill="none" className="w-full h-full">
      <rect x="3.6" y="4.8" width="19.3" height="16.9" rx="2.4" stroke="#00205F" strokeWidth="2.4" />
      <line x1="4.8" y1="9.7" x2="24.2" y2="9.7" stroke="#00205F" strokeWidth="2.4" />
      <line x1="4.8" y1="15.7" x2="11" y2="15.7" stroke="#00205F" strokeWidth="2.4" />
      <circle cx="19" cy="19" r="2.5" stroke="#00205F" strokeWidth="2.4" fill="#fff" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <path d="M20 8 C18 4.5 14 3 10 4.5 C5 6.5 3.5 12 6 16.5" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 17 C7 20.5 11 22 15 20.5 C20 18.5 21.5 13 19 8.5" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 4 L20 8 L16 8" stroke="#00205F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21 L5 17 L9 17" stroke="#00205F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
