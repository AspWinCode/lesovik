import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { ViewNavPanel, type NavSection } from "@/components/layout/ViewNavPanel";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { usePages, useUpdatePage, useCreatePage, useDeletePage } from "@/shared/hooks/useViews";
import { useEntities } from "@/shared/hooks/useEntities";
import { useRecords } from "@/shared/hooks/useRecords";
import type { FieldRead, EntityRead } from "@/shared/api/entities";

/* ── View types ── */
type ViewType =
  | "calendar" | "deck" | "table" | "gallery" | "details" | "map"
  | "chart" | "dashboard" | "form" | "onboarding" | "card";

const VIEW_TYPES: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "calendar",   label: "Календарь", icon: <CalendarIcon /> },
  { id: "deck",       label: "Колода",    icon: <DeckIcon /> },
  { id: "table",      label: "Таблица",   icon: <TableIcon /> },
  { id: "gallery",    label: "Галерея",   icon: <GridIcon /> },
  { id: "details",    label: "Детали",    icon: <DetailsIcon /> },
  { id: "map",        label: "Карта",     icon: <MapIcon /> },
  { id: "chart",      label: "Диаграмма", icon: <ChartIcon /> },
  { id: "dashboard",  label: "Дашборд",   icon: <DashboardIcon /> },
  { id: "form",       label: "Форма",     icon: <FormIcon /> },
  { id: "onboarding", label: "Онбординг", icon: <GridIcon /> },
  { id: "card",       label: "Карточка",  icon: <CardIcon /> },
];

const POSITIONS = ["первый", "следующий", "средний", "последующий", "последний", "меню", "ссылка"];

const EDITOR_TABS = ["Представления", "Правила формирования", "Дизайн"];

interface PageBlock {
  id: string;
  type: "form" | "table" | "button" | "view" | "rich_text" | "metric" | "divider" | "iframe";
  title: string | null;
  config: Record<string, unknown>;
}

interface RuleCond {
  id: string;
  field: string;
  op: "eq" | "ne" | "gt" | "lt" | "contains" | "empty" | "not_empty";
  value: string;
}

interface DesignConfig {
  accent?: string;
  theme?: "light" | "dark";
  density?: "compact" | "normal" | "spacious";
  show_header?: boolean;
}

const OP_LABELS: Record<RuleCond["op"], string> = {
  eq: "равно",
  ne: "не равно",
  gt: "больше",
  lt: "меньше",
  contains: "содержит",
  empty: "пусто",
  not_empty: "не пусто",
};

const ACCENT_COLORS = ["#35A7FF", "#00205F", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];

const BLOCK_TYPE_META: Record<string, { label: string }> = {
  form:      { label: "Форма" },
  table:     { label: "Таблица" },
  button:    { label: "Кнопка" },
  view:      { label: "Представление" },
  rich_text: { label: "Текст" },
  metric:    { label: "Метрика" },
  divider:   { label: "Разделитель" },
  iframe:    { label: "Фрейм" },
};

const ADDABLE_BLOCKS: { type: PageBlock["type"]; label: string }[] = [
  { type: "form",   label: "Форма" },
  { type: "table",  label: "Таблица" },
  { type: "button", label: "Кнопка" },
];

/**
 * Generate a unique id. `crypto.randomUUID` only exists in secure contexts
 * (HTTPS / localhost); the app is served over plain HTTP, where it is
 * undefined and throws. Fall back to a timestamp+random string.
 */
function genId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ViewEditorPage() {
  const [railModule, setRailModule] = useState<RailModule>("constructor");
  const [activeView, setActiveView] = useState<string>("");
  const [editorTab, setEditorTab] = useState("Представления");

  const [name, setName] = useState("");
  const [entityDdOpen, setEntityDdOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  // All view settings live in page.layout (JSONB) so everything persists.
  const [layout, setLayout] = useState<Record<string, unknown>>({});
  // Keep a ref so patchLayout always reads the latest layout even if called
  // from a callback that captured a stale closure.
  const layoutRef = useRef<Record<string, unknown>>({});
  useEffect(() => { layoutRef.current = layout; }, [layout]);

  const viewType = (layout.view_type as ViewType) ?? "table";
  const selectedEntityId = (layout.entity_id as string) ?? "";
  const position = (layout.position as string) ?? "первый";

  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const app = useActiveApp(apps);
  const appId = app?.id;

  const pagesQuery = usePages(appId);
  const pages = pagesQuery.data ?? [];
  const updatePageMutation = useUpdatePage(appId ?? "");
  const createPageMutation = useCreatePage(appId ?? "");
  const deletePageMutation = useDeletePage(appId ?? "");

  const { data: entities = [] } = useEntities(appId);

  const activePage = pages.find((p) => p.id === activeView) ?? null;

  // Set initial active view when pages load
  useEffect(() => {
    if (pages.length > 0 && !activeView) {
      setActiveView(pages[0].id);
    }
  }, [pages, activeView]);

  // Sync local state from active page
  useEffect(() => {
    if (!activePage) return;
    setName(activePage.title);
    setBlocks((activePage.blocks ?? []) as unknown as PageBlock[]);
    setLayout(activePage.layout ?? {});
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const navSections: NavSection[] = [
    {
      id: "main",
      title: "Навигация",
      views: pages.map((p) => ({ id: p.id, label: p.title })),
    },
  ];

  // Merge a partial into page.layout and persist to backend.
  function patchLayout(partial: Record<string, unknown>) {
    const next = { ...layoutRef.current, ...partial };
    setLayout(next);
    if (!activeView || !appId) return;
    updatePageMutation.mutate({ pageId: activeView, body: { layout: next } });
  }

  function handleNameBlur() {
    if (!activeView || !appId) return;
    updatePageMutation.mutate({ pageId: activeView, body: { title: name } });
  }

  function handleEntityChange(entityId: string) {
    setEntityDdOpen(false);
    // Reset column/sort config when the table changes — they reference fields.
    patchLayout({ entity_id: entityId, sort: [], group_by: [], hidden_columns: [] });
  }

  function handleViewTypeChange(vt: ViewType) {
    patchLayout({ view_type: vt });
  }

  function handleBlocksChange(newBlocks: PageBlock[]) {
    setBlocks(newBlocks);
    if (!activeView || !appId) return;
    updatePageMutation.mutate({
      pageId: activeView,
      body: { blocks: newBlocks as unknown as Record<string, unknown>[] },
    });
  }

  function handleAddBlock(type: PageBlock["type"]) {
    const newBlock: PageBlock = {
      id: genId(),
      type,
      title: BLOCK_TYPE_META[type]?.label ?? type,
      config: {},
    };
    handleBlocksChange([...blocks, newBlock]);
  }

  function handleAddPage(_sectionId: string) {
    if (!appId) return;
    const title = window.prompt("Название страницы:", "Новая страница");
    if (!title?.trim()) return;
    const base = title.trim().toLowerCase()
      .replace(/[а-яё]/gi, (c) => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c.toLowerCase()] ?? c))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
    createPageMutation.mutate(
      { slug: `${base}-${Date.now().toString(36)}`, title: title.trim() },
      { onSuccess: (page) => setActiveView(page.id) },
    );
  }

  function handleDeletePage(pageId: string) {
    if (!appId) return;
    if (!window.confirm("Удалить страницу?")) return;
    deletePageMutation.mutate(pageId);
    if (activeView === pageId) {
      const next = pages.find((p) => p.id !== pageId);
      setActiveView(next?.id ?? "");
    }
  }

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  const userFields = (selectedEntity?.fields ?? []).filter((f) => !f.is_system);

  // Derived view settings (read from layout with defaults).
  const sortRules = (layout.sort as { field: string; dir: "asc" | "desc" }[]) ?? [];
  const hiddenColumns = (layout.hidden_columns as string[]) ?? [];
  const columnWidth = (layout.column_width as string) ?? "Средняя";
  const quickEdit = (layout.quick_edit as boolean) ?? true;
  const colMode = (layout.column_order_mode as "auto" | "manual") ?? "manual";
  const rules = (layout.rules as RuleCond[]) ?? [];
  const design = (layout.design as DesignConfig) ?? {};

  if (pagesQuery.isLoading || appsQuery.isLoading) {
    return (
      <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex items-center justify-center">
        <span className="text-[20px] text-primary">Загрузка...</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-[1920px] h-[1080px] bg-white overflow-hidden"
      onClick={() => setEntityDdOpen(false)}
    >
      <Navbar
        onSave={activeView && appId ? () => updatePageMutation.mutate({
          pageId: activeView,
          body: { title: name, layout, blocks: blocks as unknown as Record<string, unknown>[] },
        }) : undefined}
      />
      <IconRail active={railModule} onChange={setRailModule} />
      <ViewNavPanel
        sections={navSections}
        activeViewId={activeView}
        onSelect={setActiveView}
        onAddView={handleAddPage}
        onDeleteView={handleDeletePage}
      />

      {/* ── Top tab bar ── */}
      <div
        className="absolute bg-mainbg rounded-[5px]"
        style={{ left: 380, top: 70, width: 945, height: 55 }}
      >
        <div className="absolute left-[40px] top-0 h-[55px] flex items-center gap-[30px] py-[10px]">
          {EDITOR_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setEditorTab(t)}
              className={cn(
                "text-[20px] leading-[150%] font-bold whitespace-nowrap transition-colors",
                editorTab === t ? "text-cta" : "text-primary"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <a
          href={appId ? `/app/?app=${appId}` : `/app/`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute flex items-center justify-center gap-[10px] px-5 py-[5px]
                     border-2 border-primary rounded-[20px] text-meta font-semibold text-primary
                     hover:bg-cardbg/40 transition-colors"
          style={{ left: 744, top: 10.5, height: 34 }}
        >
          Предпросмотр
        </a>
      </div>

      {/* ── Editor scroll panel ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-y-auto"
        style={{ left: 380, top: 130, width: 945, height: 945 }}
      >
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-[20px]">
            <span className="text-[20px] text-primary/60">Нет страниц</span>
            <button
              onClick={() => handleAddPage("main")}
              className="px-6 h-[42px] bg-cta text-white rounded-btn text-[16px] font-medium hover:bg-active transition-colors"
            >
              + Создать первую страницу
            </button>
          </div>
        ) : !activePage ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[20px] text-primary/60">Выберите страницу</span>
          </div>
        ) : editorTab === "Правила формирования" ? (
          <RulesTab
            fields={userFields}
            rules={rules}
            onChange={(r) => patchLayout({ rules: r })}
          />
        ) : editorTab === "Дизайн" ? (
          <DesignTab
            design={design}
            onChange={(d) => patchLayout({ design: d })}
          />
        ) : (
          <div className="flex flex-col gap-[30px] pt-[53px] pb-[40px]">
            {/* Блоки страницы */}
            <CollapsibleSection
              title="Блоки страницы"
              open={blocksOpen}
              onToggle={() => setBlocksOpen((v) => !v)}
            >
              <BlockCanvas
                blocks={blocks}
                onBlocksChange={handleBlocksChange}
                onAddClick={() => setPickerOpen(true)}
              />
            </CollapsibleSection>

            {/* Название */}
            <FieldRow title="Название" desc="Уникальное название для этого представления.">
              <div className="w-[538px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="w-full bg-transparent text-[18px] text-primary outline-none placeholder:text-primary/40"
                  placeholder="Текст"
                />
              </div>
            </FieldRow>

            {/* База данных */}
            <FieldRow title="База данных" desc="Какая таблица будет отображаться.">
              <div className="flex items-center gap-5 w-[538px]" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex-1">
                  <button
                    onClick={() => setEntityDdOpen((v) => !v)}
                    className="flex items-center justify-between gap-5 w-full h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary"
                  >
                    <span className="truncate">
                      {selectedEntity?.display_name ?? (entities.length === 0 ? "Нет таблиц" : "Выберите таблицу")}
                    </span>
                    <span className={cn("w-3 h-3 shrink-0 transition-transform", entityDdOpen && "rotate-180")}>
                      <Chevron open={false} />
                    </span>
                  </button>
                  {entityDdOpen && entities.length > 0 && (
                    <div className="absolute top-[44px] left-0 z-50 w-full bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-[5px] flex flex-col max-h-[280px] overflow-y-auto">
                      {entities.map((ent) => (
                        <button
                          key={ent.id}
                          onClick={() => handleEntityChange(ent.id)}
                          className={cn(
                            "flex items-center px-[20px] py-[10px] rounded-[20px] text-[16px] font-medium text-primary transition-colors text-left",
                            ent.id === selectedEntityId ? "bg-selected text-cta" : "hover:bg-selected/60",
                          )}
                        >
                          {ent.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <IconButton label="Редактировать"><EditIcon /></IconButton>
              </div>
            </FieldRow>

            {/* Тип представления */}
            <FieldRow title="Тип представления" desc="Каким будет представление." labelWidth={236}>
              <div className="flex flex-wrap gap-x-[6px] gap-y-[17px] w-[540px] py-[7px]">
                {VIEW_TYPES.map((t) => (
                  <TypeTile
                    key={t.id}
                    label={t.label}
                    icon={t.icon}
                    selected={viewType === t.id}
                    onClick={() => handleViewTypeChange(t.id)}
                  />
                ))}
              </div>
            </FieldRow>

            {/* Положение */}
            <FieldRow title="Положение" desc="Где находится кнопка для доступа к представлению.">
              <div className="flex py-[7px]">
                {POSITIONS.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => patchLayout({ position: p })}
                    className={cn(
                      "h-[38px] px-[11px] flex items-center justify-center text-[12px] leading-[150%] font-medium transition-colors whitespace-nowrap box-border",
                      "bg-cardbg",
                      position === p ? "border-2 border-cta text-cta z-10" : "border border-mainbg text-primary",
                      i === 0 && "rounded-l-[18px]",
                      i === POSITIONS.length - 1 && "rounded-r-[18px]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </FieldRow>

            {/* ── Параметры представления ── */}
            <CollapsibleSection
              title="Параметры представления"
              open={paramsOpen}
              onToggle={() => setParamsOpen((v) => !v)}
            >
              {/* Сортировка */}
              <FieldRow title="Сортировка" desc="Отсортируйте строки по одному или нескольким столбцам.">
                <SortConfig
                  fields={userFields}
                  sort={sortRules}
                  onChange={(s) => patchLayout({ sort: s })}
                />
              </FieldRow>

              {/* Группировка */}
              <FieldRow title="Группировка" desc="Сгруппируйте строки по значениям в одном или нескольких их столбцах.">
                <GroupConfig
                  fields={userFields}
                  groupBy={(layout.group_by as string[]) ?? []}
                  onChange={(g) => patchLayout({ group_by: g })}
                />
              </FieldRow>

              {viewType === "card" ? (
                <FieldRow title="Стиль страницы" desc="Как отображаются страницы форм." labelWidth={252}>
                  <div className="flex flex-col gap-[33px] w-[538px]">
                    <PageStyleSegmented
                      value={(layout.page_style as string) ?? "Карточки"}
                      onChange={(v) => patchLayout({ page_style: v })}
                    />
                    <CardStyleConfig />
                  </div>
                </FieldRow>
              ) : (
                <>
                  <FieldRow
                    title="Порядок столбцов"
                    desc="Выберите, какие столбцы показывать в представлении."
                    labelWidth={267}
                  >
                    <ColumnOrder
                      mode={colMode}
                      onMode={(m) => patchLayout({ column_order_mode: m })}
                      fields={userFields}
                      hidden={hiddenColumns}
                      onToggleColumn={(fieldName) => {
                        const next = hiddenColumns.includes(fieldName)
                          ? hiddenColumns.filter((c) => c !== fieldName)
                          : [...hiddenColumns, fieldName];
                        patchLayout({ hidden_columns: next });
                      }}
                    />
                  </FieldRow>

                  <FieldRow
                    title="Ширина колонки"
                    desc="Насколько широкими должны быть столбцы?"
                  >
                    <div className="py-[7px]">
                      <WidthSegmented value={columnWidth} onChange={(v) => patchLayout({ column_width: v })} />
                    </div>
                  </FieldRow>

                  <FieldRow title="Быстрое редактирование" desc="Разрешить вносить изменения непосредственно в табличное представление.">
                    <div className="py-[7px]">
                      <Toggle on={quickEdit} onChange={() => patchLayout({ quick_edit: !quickEdit })} />
                    </div>
                  </FieldRow>
                </>
              )}
            </CollapsibleSection>

            <BehaviorSection
              behavior={(layout.behavior as { offline?: boolean; cache?: boolean }) ?? {}}
              onChange={(b) => patchLayout({ behavior: b })}
            />
            <DocumentationSection
              link={(layout.doc_link as string) ?? ""}
              onChange={(l) => patchLayout({ doc_link: l })}
            />
          </div>
        )}
      </div>

      <LivePreview
        appId={appId}
        appName={app?.name ?? "Приложение"}
        page={activePage}
        blocks={blocks}
        entity={selectedEntity ?? null}
        hiddenColumns={hiddenColumns}
        design={design}
      />

      {pickerOpen && (
        <BlockPickerModal
          onAdd={handleAddBlock}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Layout helpers ── */
function FieldRow({
  title,
  desc,
  labelWidth = 232,
  children,
}: {
  title: string;
  desc: string;
  labelWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start pl-[40px] pr-[37px] gap-[40px]">
      <div className="flex flex-col shrink-0" style={{ width: labelWidth }}>
        <span className="text-[20px] leading-[150%] font-medium text-primary">{title}</span>
        <span className="text-[14px] leading-[150%] text-primary">{desc}</span>
      </div>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-y-2 border-white py-[10px] flex flex-col gap-[20px]">
      <button onClick={onToggle} className="flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] leading-[150%] font-bold text-primary">{title}</span>
        <span className="w-3 h-3 shrink-0"><Chevron open={open} /></span>
      </button>
      {open && <div className="flex flex-col gap-[30px]">{children}</div>}
    </div>
  );
}


function BehaviorSection({
  behavior,
  onChange,
}: {
  behavior: { offline?: boolean; cache?: boolean };
  onChange: (b: { offline?: boolean; cache?: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const offlineEnabled = behavior.offline ?? true;
  const cacheContent = behavior.cache ?? true;
  const setOfflineEnabled = () => onChange({ ...behavior, offline: !offlineEnabled });
  const setCacheContent = () => onChange({ ...behavior, cache: !cacheContent });

  return (
    <div className="border-y-2 border-white py-[10px] flex flex-col gap-[20px]">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] leading-[150%] font-bold text-primary">Поведение</span>
        <span className="w-3 h-3 shrink-0"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className="flex flex-col gap-[20px] px-[40px] pb-[10px]">
          {/* Info banner */}
          <div className="flex items-center gap-[10px] px-5 py-[10px] bg-[#CBE3FF] rounded-[5px]">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0">
              <circle cx="10" cy="10" r="8" stroke="#35A7FF" strokeWidth="2" />
              <line x1="10" y1="9" x2="10" y2="14" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="6.5" r="1" fill="#35A7FF" />
            </svg>
            <span className="text-[16px] text-primary">Настройте приложение для работы в автономном режиме.</span>
          </div>

          <div className="flex flex-col gap-[0px] bg-white rounded-[5px] overflow-hidden">
            <div className="px-5 py-[15px] bg-[#CBE3FF]">
              <span className="text-[18px] font-semibold text-primary">Автономное использование</span>
            </div>
            {/* Row 1 */}
            <div className="flex items-center justify-between px-5 py-[20px] border-b border-mainbg">
              <div className="flex flex-col gap-[5px] max-w-[440px]">
                <span className="text-[18px] font-semibold text-primary">Приложение может запускаться в автономном режиме</span>
                <span className="text-[14px] text-primary/70 leading-[1.4]">Разрешите приложению запускаться даже при отсутствии подключения к Интернету. Изменения не будут синхронизированы, пока пользователь снова не подключится к Интернету.</span>
              </div>
              <OfflineToggle on={offlineEnabled} onChange={setOfflineEnabled} />
            </div>
            {/* Row 2 */}
            <div className="flex items-center justify-between px-5 py-[20px]">
              <div className="flex flex-col gap-[5px] max-w-[440px]">
                <span className="text-[18px] font-semibold text-primary">Сохранить контент для использования в автономном режиме</span>
                <span className="text-[14px] text-primary/70 leading-[1.4]">Сделать все изображения и файлы доступными в автономном режиме.</span>
              </div>
              <OfflineToggle on={cacheContent} onChange={setCacheContent} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfflineToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className="relative w-[55px] h-[28px] rounded-[30px] flex items-center px-[3px] transition-colors shrink-0"
      style={{ background: on ? "#35A7FF" : "#C2DBF8" }}
    >
      <span
        className="w-[22px] h-[22px] rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(27px)" : "translateX(0)" }}
      />
    </button>
  );
}

function DocumentationSection({
  link,
  onChange,
}: {
  link: string;
  onChange: (l: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(link);
  useEffect(() => { setDraft(link); }, [link]);

  return (
    <div className="border-y-2 border-white py-[10px] flex flex-col gap-[20px]">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] leading-[150%] font-bold text-primary">Документация</span>
        <span className="w-3 h-3 shrink-0"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className="flex items-start px-[40px] gap-[40px] pb-[10px]">
          <div className="flex flex-col shrink-0" style={{ width: 232 }}>
            <span className="text-[20px] leading-[150%] font-medium text-primary">Ссылка на приложение</span>
            <span className="text-[14px] leading-[150%] text-primary">Комментарии помогут вам и вашим сотрудникам лучше зафиксировать и понять структуру приложения.</span>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="w-[538px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft !== link && onChange(draft)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                placeholder="https://..."
                className="w-full bg-transparent text-[18px] text-primary outline-none placeholder:text-primary/30"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Controls ── */
function DropdownPill({ value, className }: { value: string; className?: string }) {
  return (
    <button
      disabled
      title="В разработке"
      className={cn(
        "flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary/50 cursor-not-allowed",
        className
      )}
    >
      <span className="truncate">{value}</span>
      <span className="w-3 h-3 shrink-0"><Chevron open={false} /></span>
    </button>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  const inert = !onClick;
  return (
    <button
      aria-label={label}
      title={inert ? `${label} (в разработке)` : label}
      onClick={onClick}
      disabled={inert}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0",
        inert ? "opacity-40 cursor-not-allowed" : "hover:bg-cardbg/40",
      )}
    >
      {children}
    </button>
  );
}

function TypeTile({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-[85px] h-[75px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] box-border transition-all",
        "bg-cardbg/85",
        selected ? "border-2 border-cta" : "border-2 border-transparent"
      )}
    >
      <span className={cn("w-[35px] h-[35px]", selected && "text-cta")}>{icon}</span>
      <span className={cn("text-[12px] leading-[150%] font-medium", selected ? "text-cta" : "text-primary")}>
        {label}
      </span>
    </button>
  );
}

/* ── Sort config (real fields, persisted) ── */
function SortConfig({
  fields,
  sort,
  onChange,
}: {
  fields: FieldRead[];
  sort: { field: string; dir: "asc" | "desc" }[];
  onChange: (s: { field: string; dir: "asc" | "desc" }[]) => void;
}) {
  const usedFields = new Set(sort.map((s) => s.field));
  const available = fields.filter((f) => !usedFields.has(f.name));

  function addSort() {
    const first = available[0];
    if (!first) return;
    onChange([...sort, { field: first.name, dir: "asc" }]);
  }
  function updateSort(idx: number, patch: Partial<{ field: string; dir: "asc" | "desc" }>) {
    onChange(sort.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeSort(idx: number) {
    onChange(sort.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-[8px] w-[538px]">
      {sort.length === 0 && (
        <span className="text-[14px] text-primary/40">Сортировка не задана</span>
      )}
      {sort.map((s, idx) => {
        const fieldLabel = fields.find((f) => f.name === s.field)?.display_name ?? s.field;
        return (
          <div key={idx} className="flex items-center gap-[12px]">
            <div className="flex-1 flex items-center gap-[10px] h-[41px] px-3 bg-white rounded-btn">
              <span className="w-5 h-5 opacity-40"><DragVert /></span>
              <select
                value={s.field}
                onChange={(e) => updateSort(idx, { field: e.target.value })}
                className="flex-1 bg-cardbg rounded-btn h-[33px] px-3 text-[16px] text-primary outline-none"
              >
                <option value={s.field}>{fieldLabel}</option>
                {available.map((f) => (
                  <option key={f.id} value={f.name}>{f.display_name}</option>
                ))}
              </select>
              <button
                onClick={() => updateSort(idx, { dir: s.dir === "asc" ? "desc" : "asc" })}
                className="bg-cardbg rounded-btn h-[33px] px-3 text-[15px] text-primary whitespace-nowrap"
              >
                {s.dir === "asc" ? "По возрастанию" : "По убыванию"}
              </button>
            </div>
            <IconButton label="Удалить"><span onClick={() => removeSort(idx)}><TrashIcon /></span></IconButton>
          </div>
        );
      })}
      {available.length > 0 && (
        <button
          onClick={addSort}
          className="flex items-center gap-[6px] w-fit h-[36px] px-4 bg-white rounded-btn text-[14px] font-medium text-cta hover:bg-cardbg/40 transition-colors"
        >
          <PlusGlyph /> Добавить сортировку
        </button>
      )}
    </div>
  );
}

/* ── Group config (real fields, persisted) ── */
function GroupConfig({
  fields,
  groupBy,
  onChange,
}: {
  fields: FieldRead[];
  groupBy: string[];
  onChange: (g: string[]) => void;
}) {
  const groupable = fields.filter((f) =>
    ["select", "boolean", "text", "multi_select"].includes(f.field_type),
  );
  const used = new Set(groupBy);
  const available = groupable.filter((f) => !used.has(f.name));

  return (
    <div className="flex flex-col gap-[8px] w-[538px] py-[7px]">
      {groupBy.map((g) => {
        const label = fields.find((f) => f.name === g)?.display_name ?? g;
        return (
          <div key={g} className="flex items-center justify-between h-[41px] px-5 bg-white rounded-btn">
            <span className="text-[16px] text-primary">{label}</span>
            <button onClick={() => onChange(groupBy.filter((x) => x !== g))} className="w-6 h-6"><TrashIcon /></button>
          </div>
        );
      })}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...groupBy, e.target.value])}
          className="w-fit h-[36px] px-4 bg-white rounded-btn text-[14px] font-medium text-cta outline-none"
        >
          <option value="">+ Добавить группировку</option>
          {available.map((f) => (
            <option key={f.id} value={f.name}>{f.display_name}</option>
          ))}
        </select>
      )}
      {groupBy.length === 0 && available.length === 0 && (
        <span className="text-[14px] text-primary/40">Нет полей для группировки</span>
      )}
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <line x1="8" y1="3" x2="8" y2="13" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="8" x2="13" y2="8" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Column order (real fields, show/hide persisted) ── */
function ColumnOrder({
  mode,
  onMode,
  fields,
  hidden,
  onToggleColumn,
}: {
  mode: "auto" | "manual";
  onMode: (m: "auto" | "manual") => void;
  fields: FieldRead[];
  hidden: string[];
  onToggleColumn: (fieldName: string) => void;
}) {
  return (
    <div className="w-[538px]">
      {/* Tabs */}
      <div className="flex">
        <button
          onClick={() => onMode("auto")}
          className={cn(
            "h-[40px] px-5 flex items-center text-[20px] font-semibold text-primary rounded-t-[20px] transition-colors",
            mode === "auto" ? "bg-white" : "bg-transparent"
          )}
        >
          Автоматически
        </button>
        <button
          onClick={() => onMode("manual")}
          className={cn(
            "h-[34px] mt-[3px] px-5 flex items-center text-[20px] font-semibold text-primary rounded-[36px] transition-colors",
            mode === "manual" ? "bg-cardbg" : "bg-transparent"
          )}
        >
          Вручную
        </button>
      </div>

      {/* Panel */}
      <div className="bg-white rounded-[0_10px_10px_10px] py-[15px] flex flex-col gap-3 px-[25px]">
        {fields.length === 0 && (
          <span className="text-[14px] text-primary/40">Выберите таблицу, чтобы настроить столбцы</span>
        )}
        {mode === "auto" && fields.length > 0 && (
          <span className="text-[14px] text-primary/50">Все столбцы показываются автоматически</span>
        )}
        {mode === "manual" && fields.map((f) => {
          const visible = !hidden.includes(f.name);
          return (
            <div key={f.id} className="flex items-center justify-between h-[41px] px-5 bg-mainbg rounded-btn">
              <button onClick={() => onToggleColumn(f.name)} className="flex items-center gap-[15px]">
                <span className={cn(
                  "w-[23px] h-[23px] rounded-[5px] border-2 border-primary flex items-center justify-center",
                  visible && "bg-primary",
                )}>
                  {visible && (
                    <svg viewBox="0 0 16 16" className="w-3 h-3"><path d="M3 8 L7 12 L13 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </span>
                <span className="text-[18px] text-primary">{f.display_name}</span>
              </button>
              <span className="text-[13px] text-primary/40">{f.field_type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WidthSegmented({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const OPTS = ["Узкая", "Средняя", "Широкая"];
  return (
    <div className="flex">
      {OPTS.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "h-[41px] px-5 flex items-center text-[18px] font-medium text-primary bg-cardbg border-r border-white",
            i === 0 && "rounded-l-btn",
            i === OPTS.length - 1 && "rounded-r-btn border-r-0",
            value === o && "border-2 border-cta text-cta z-10"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PageStyleSegmented({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const OPTS = ["Полная", "Карточки", "Список", "Сетка"];
  return (
    <div className="flex">
      {OPTS.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "h-[38px] px-[27px] flex items-center justify-center text-[16px] font-medium text-primary bg-cardbg border-r border-white box-border whitespace-nowrap",
            i === 0 && "rounded-l-btn",
            i === OPTS.length - 1 && "rounded-r-btn border-r-0",
            value === o && "border-2 border-cta z-10"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function CardStyleConfig() {
  const ROWS = [
    { id: "icon",     label: "Иконка",       value: "Отправить CMS" },
    { id: "title",    label: "Заголовок",    value: "Заголовок" },
    { id: "subtitle", label: "Подзаголовок", value: "Отправить CMS" },
    { id: "image",    label: "Изображение",  value: "Отправить" },
  ];
  return (
    <div className="flex items-start gap-[40px]">
      {/* Card preview */}
      <div className="w-[290px] flex flex-col justify-end bg-white shrink-0">
        <div className="flex items-center p-[10px] h-[76px]">
          <span className="w-[56px] h-[56px] rounded-full bg-cardbg shrink-0" />
          <div className="flex flex-col px-[15px]">
            <span className="text-[20px] leading-[150%] font-medium text-primary">Заголовок</span>
            <span className="text-[14px] leading-[150%] text-primary">Подзаголовок</span>
          </div>
        </div>
        <div className="w-full h-[149px] bg-cardbg" />
      </div>

      {/* Config rows */}
      <div className="flex flex-col gap-[20px] w-[431px]">
        {ROWS.map((r) => (
          <div key={r.id} className="flex items-center gap-[10px]">
            <div className="flex items-center justify-between gap-[31px] flex-1 h-[41px] pl-5 bg-white rounded-btn">
              <span className="text-[18px] text-primary whitespace-nowrap">{r.label}</span>
              <DropdownPill value={r.value} className="w-[219px] pl-[30px]" />
            </div>
            <IconButton label="Редактировать"><EditIcon /></IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={cn(
        "w-[55px] h-[31px] rounded-[30px] flex items-center transition-colors px-[3px]",
        on ? "bg-cardbg" : "bg-white border-2 border-cardbg"
      )}
    >
      <span
        className={cn(
          "w-[23px] h-[23px] rounded-full bg-cta transition-transform",
          on ? "translate-x-[24px]" : "translate-x-0 bg-primary/30"
        )}
      />
    </button>
  );
}

/* ── Tab: Правила формирования (conditions stored in layout.rules) ── */
function RulesTab({
  fields,
  rules,
  onChange,
}: {
  fields: FieldRead[];
  rules: RuleCond[];
  onChange: (r: RuleCond[]) => void;
}) {
  function addRule() {
    const first = fields[0];
    onChange([
      ...rules,
      { id: genId(), field: first?.name ?? "", op: "eq", value: "" },
    ]);
  }
  function update(id: string, patch: Partial<RuleCond>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }

  const needsValue = (op: RuleCond["op"]) => op !== "empty" && op !== "not_empty";

  return (
    <div className="flex flex-col gap-[25px] pt-[40px] px-[40px] pb-[40px]">
      <div className="flex flex-col gap-[6px]">
        <h2 className="text-[22px] font-bold text-primary">Правила формирования</h2>
        <p className="text-[15px] text-primary/70 max-w-[640px]">
          Условия фильтрации записей. Показываются только строки, удовлетворяющие
          всем правилам. Поля берутся из выбранной таблицы.
        </p>
      </div>

      {fields.length === 0 && (
        <div className="px-5 py-[14px] bg-[#CBE3FF] rounded-[8px] text-[15px] text-primary">
          Сначала выберите таблицу на вкладке «Представления».
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        {rules.length === 0 && fields.length > 0 && (
          <span className="text-[15px] text-primary/40">Правил пока нет — все записи отображаются.</span>
        )}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-[10px] bg-white rounded-[10px] px-4 py-3">
            <span className="text-[14px] text-primary/50 w-[40px]">где</span>
            <select
              value={r.field}
              onChange={(e) => update(r.id, { field: e.target.value })}
              className="bg-cardbg rounded-btn h-[38px] px-3 text-[15px] text-primary outline-none min-w-[160px]"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.name}>{f.display_name}</option>
              ))}
            </select>
            <select
              value={r.op}
              onChange={(e) => update(r.id, { op: e.target.value as RuleCond["op"] })}
              className="bg-cardbg rounded-btn h-[38px] px-3 text-[15px] text-primary outline-none"
            >
              {(Object.keys(OP_LABELS) as RuleCond["op"][]).map((op) => (
                <option key={op} value={op}>{OP_LABELS[op]}</option>
              ))}
            </select>
            {needsValue(r.op) && (
              <input
                value={r.value}
                onChange={(e) => update(r.id, { value: e.target.value })}
                placeholder="значение"
                className="flex-1 bg-cardbg rounded-btn h-[38px] px-3 text-[15px] text-primary outline-none placeholder:text-primary/30"
              />
            )}
            <button onClick={() => remove(r.id)} className="w-7 h-7 shrink-0"><TrashIcon /></button>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <button
          onClick={addRule}
          className="flex items-center gap-[8px] w-fit h-[40px] px-5 bg-cta text-white text-[15px] font-medium rounded-btn hover:bg-active transition-colors"
        >
          <PlusGlyphWhite /> Добавить правило
        </button>
      )}
    </div>
  );
}

function PlusGlyphWhite() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <line x1="8" y1="3" x2="8" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="8" x2="13" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Tab: Дизайн (stored in layout.design) ── */
function DesignTab({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (d: DesignConfig) => void;
}) {
  const accent = design.accent ?? "#35A7FF";
  const theme = design.theme ?? "light";
  const density = design.density ?? "normal";
  const showHeader = design.show_header ?? true;

  return (
    <div className="flex flex-col gap-[30px] pt-[40px] px-[40px] pb-[40px]">
      <div className="flex flex-col gap-[6px]">
        <h2 className="text-[22px] font-bold text-primary">Дизайн</h2>
        <p className="text-[15px] text-primary/70">Оформление страницы в работающем приложении.</p>
      </div>

      {/* Accent color */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[18px] font-medium text-primary">Акцентный цвет</span>
        <div className="flex items-center gap-[12px]">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...design, accent: c })}
              className={cn(
                "w-[44px] h-[44px] rounded-full transition-transform",
                accent === c ? "ring-4 ring-offset-2 ring-primary/30 scale-110" : "hover:scale-105",
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[18px] font-medium text-primary">Тема</span>
        <div className="flex">
          {(["light", "dark"] as const).map((t, i) => (
            <button
              key={t}
              onClick={() => onChange({ ...design, theme: t })}
              className={cn(
                "h-[41px] px-7 flex items-center text-[16px] font-medium bg-cardbg border-r border-white",
                i === 0 ? "rounded-l-btn" : "rounded-r-btn border-r-0",
                theme === t ? "border-2 border-cta text-cta z-10" : "text-primary",
              )}
            >
              {t === "light" ? "Светлая" : "Тёмная"}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[18px] font-medium text-primary">Плотность</span>
        <div className="flex">
          {(["compact", "normal", "spacious"] as const).map((d, i, arr) => (
            <button
              key={d}
              onClick={() => onChange({ ...design, density: d })}
              className={cn(
                "h-[41px] px-7 flex items-center text-[16px] font-medium bg-cardbg border-r border-white",
                i === 0 && "rounded-l-btn",
                i === arr.length - 1 && "rounded-r-btn border-r-0",
                density === d ? "border-2 border-cta text-cta z-10" : "text-primary",
              )}
            >
              {d === "compact" ? "Компактная" : d === "normal" ? "Обычная" : "Просторная"}
            </button>
          ))}
        </div>
      </div>

      {/* Show header */}
      <div className="flex items-center justify-between max-w-[538px]">
        <div className="flex flex-col">
          <span className="text-[18px] font-medium text-primary">Показывать заголовок страницы</span>
          <span className="text-[14px] text-primary/60">Название страницы вверху в приложении.</span>
        </div>
        <Toggle on={showHeader} onChange={() => onChange({ ...design, show_header: !showHeader })} />
      </div>

      {/* Live mini-preview of accent */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[14px] text-primary/50">Предпросмотр кнопки</span>
        <button
          className="w-fit px-6 h-[42px] rounded-btn text-white text-[15px] font-medium"
          style={{ background: accent }}
        >
          Кнопка действия
        </button>
      </div>
    </div>
  );
}

/* ── Live preview of the page being built (right panel) ── */
function LivePreview({
  appId,
  appName,
  page,
  blocks,
  entity,
  hiddenColumns,
  design,
}: {
  appId: string | undefined;
  appName: string;
  page: { title: string } | null;
  blocks: PageBlock[];
  entity: EntityRead | null;
  hiddenColumns: string[];
  design: DesignConfig;
}) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const accent = design.accent ?? "#35A7FF";

  const recordsQuery = useRecords(appId, entity?.id, { limit: 20 });
  const records = recordsQuery.data?.items ?? [];
  const cols = (entity?.fields ?? []).filter(
    (f) => !f.is_system && !hiddenColumns.includes(f.name),
  );

  const tabs = [
    { id: "mobile", label: "Смартфон", icon: (
      <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
        <rect x="4" y="1" width="15" height="21" rx="3" stroke="#00205F" strokeWidth="2"/>
        <circle cx="11.5" cy="18.5" r="1" fill="#00205F"/>
      </svg>
    )},
    { id: "desktop", label: "Десктоп", icon: (
      <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
        <rect x="1" y="2" width="21" height="14" rx="2" stroke="#00205F" strokeWidth="2"/>
        <path d="M7 20 L16 20" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
        <path d="M11.5 16 L11.5 20" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )},
  ];

  const frameW = device === "mobile" ? 380 : 540;

  return (
    <div
      className="absolute top-[70px] right-0 bg-mainbg flex flex-col items-center gap-[20px] pt-[7px]"
      style={{ width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      <TabSwitcher
        tabs={tabs}
        activeId={device}
        onChange={(id) => setDevice(id as "mobile" | "desktop")}
        className="w-[348px]"
      />

      {/* Phone/desktop frame */}
      <div
        className="bg-white overflow-hidden shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col"
        style={{ width: frameW, height: 760, borderRadius: device === "mobile" ? 40 : 14 }}
      >
        {/* App header */}
        {(design.show_header ?? true) && (
          <div className="px-5 py-[14px] shrink-0 text-white font-semibold text-[17px]" style={{ background: accent }}>
            {page?.title ?? appName}
          </div>
        )}

        {/* Blocks */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {blocks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-primary/30 text-[14px] text-center px-6">
              Добавьте блоки на вкладке «Представления», чтобы увидеть страницу
            </div>
          )}
          {blocks.map((b) => (
            <PreviewBlock
              key={b.id}
              block={b}
              entity={entity}
              cols={cols}
              records={records}
              accent={accent}
            />
          ))}
        </div>
      </div>

      <a
        href={appId ? `/app/?app=${appId}` : "/app/"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 text-white text-[17px] font-medium rounded-btn px-10 py-[10px] hover:opacity-90 transition-opacity"
        style={{ width: 331, background: accent }}
      >
        Открыть {appName}
      </a>
    </div>
  );
}

function PreviewBlock({
  block,
  entity,
  cols,
  records,
  accent,
}: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: { id: string; payload: Record<string, unknown> }[];
  accent: string;
}) {
  if (block.type === "button") {
    return (
      <button
        className="w-full h-[42px] rounded-btn text-white text-[15px] font-medium shrink-0"
        style={{ background: accent }}
      >
        {block.title ?? "Кнопка"}
      </button>
    );
  }

  if (block.type === "form") {
    return (
      <div className="border border-cardbg rounded-[10px] p-4 flex flex-col gap-3">
        <span className="text-[15px] font-semibold text-primary">{block.title ?? "Форма"}</span>
        {cols.length === 0 && <span className="text-[13px] text-primary/40">Выберите таблицу</span>}
        {cols.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-1">
            <span className="text-[12px] text-primary/60">{f.display_name}{f.is_required && " *"}</span>
            <div className="h-[34px] bg-mainbg rounded-btn px-3 flex items-center text-[13px] text-primary/30">
              {f.field_type === "boolean" ? "☐" : `Введите ${f.display_name.toLowerCase()}`}
            </div>
          </div>
        ))}
        <button className="mt-1 h-[36px] rounded-btn text-white text-[14px] font-medium" style={{ background: accent }}>
          Сохранить
        </button>
      </div>
    );
  }

  // table (default)
  return (
    <div className="border border-cardbg rounded-[10px] overflow-hidden">
      <div className="px-3 py-2 bg-mainbg text-[14px] font-semibold text-primary flex items-center justify-between">
        <span>{block.title ?? entity?.display_name ?? "Таблица"}</span>
        <span className="text-[12px] text-primary/40 font-normal">{records.length} записей</span>
      </div>
      {cols.length === 0 ? (
        <div className="px-3 py-4 text-[13px] text-primary/40">Выберите таблицу на вкладке «Представления»</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-cardbg">
                {cols.slice(0, 4).map((f) => (
                  <th key={f.id} className="px-2 py-1.5 text-[11px] font-semibold text-primary/60 whitespace-nowrap">
                    {f.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 8).map((rec) => (
                <tr key={rec.id} className="border-b border-mainbg last:border-0">
                  {cols.slice(0, 4).map((f) => (
                    <td key={f.id} className="px-2 py-1.5 text-[12px] text-primary whitespace-nowrap max-w-[120px] truncate">
                      {formatPreviewCell(rec.payload[f.name], f)}
                    </td>
                  ))}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={4} className="px-2 py-3 text-[12px] text-primary/30">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatPreviewCell(value: unknown, field: FieldRead): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "boolean") return value ? "✓" : "✗";
  if (field.field_type === "select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    return choices.find((c) => c.value === value)?.label ?? String(value);
  }
  return String(value);
}

/* ── Block canvas ── */
function BlockCanvas({
  blocks,
  onBlocksChange,
  onAddClick,
}: {
  blocks: PageBlock[];
  onBlocksChange: (b: PageBlock[]) => void;
  onAddClick: () => void;
}) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    const from = dragIndexRef.current;
    if (from === null || from === dropIndex) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(dropIndex, 0, item);
    dragIndexRef.current = null;
    onBlocksChange(next);
  }

  function handleDragEnd() {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }

  function handleDelete(id: string) {
    onBlocksChange(blocks.filter((b) => b.id !== id));
  }

  const BLOCK_ICONS: Record<string, React.ReactNode> = {
    form: <FormIcon />,
    table: <TableIcon />,
    button: <ButtonBlockIcon />,
    view: <TableIcon />,
    rich_text: <DetailsIcon />,
    metric: <ChartIcon />,
    divider: <DashboardIcon />,
    iframe: <MapIcon />,
  };

  return (
    <div className="flex flex-col gap-[10px] px-[40px]">
      {blocks.length === 0 && (
        <p className="text-[14px] text-primary/40 py-[5px]">
          Добавьте блоки на страницу
        </p>
      )}
      {blocks.map((block, index) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-[12px] h-[50px] px-5 rounded-btn cursor-grab active:cursor-grabbing transition-all",
            dragOverIndex === index && dragIndexRef.current !== index
              ? "border-2 border-cta bg-cardbg"
              : "bg-white"
          )}
        >
          <span className="w-5 h-5 shrink-0 opacity-50"><DragVert /></span>
          <span className="w-[22px] h-[22px] shrink-0 text-primary/60">
            {BLOCK_ICONS[block.type] ?? <TableIcon />}
          </span>
          <span className="flex-1 text-[16px] text-primary font-medium truncate">
            {block.title ?? BLOCK_TYPE_META[block.type]?.label ?? block.type}
          </span>
          <span className="text-[12px] text-primary/40 shrink-0 font-mono">
            {BLOCK_TYPE_META[block.type]?.label}
          </span>
          <button
            onClick={() => handleDelete(block.id)}
            className="shrink-0 hover:bg-red-50 rounded-full p-1 transition-colors"
            title="Удалить блок"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
      <button
        onClick={onAddClick}
        className="flex items-center gap-[8px] w-fit h-[38px] px-5 bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active transition-colors mt-[5px]"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Добавить блок
      </button>
    </div>
  );
}

function BlockPickerModal({
  onAdd,
  onClose,
}: {
  onAdd: (type: PageBlock["type"]) => void;
  onClose: () => void;
}) {
  const ICONS: Record<string, React.ReactNode> = {
    form:   <FormIcon />,
    table:  <TableIcon />,
    button: <ButtonBlockIcon />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[10px] shadow-xl p-6 flex flex-col gap-4 min-w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[20px] font-bold text-primary">Добавить блок</span>
        <div className="flex gap-4">
          {ADDABLE_BLOCKS.map((b) => (
            <button
              key={b.type}
              onClick={() => { onAdd(b.type); onClose(); }}
              className="flex flex-col items-center gap-[8px] w-[96px] h-[90px] bg-mainbg rounded-[8px] justify-center hover:bg-cardbg transition-colors border-2 border-transparent hover:border-cta"
            >
              <span className="w-[32px] h-[32px] text-primary">{ICONS[b.type]}</span>
              <span className="text-[13px] text-primary font-medium">{b.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-[14px] text-primary/50 hover:text-primary self-end transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ── Small icons ── */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={cn("w-full h-full transition-transform", open && "rotate-180")}>
      <path d="M2 4 L6 8 L10 4" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DragVert() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      {[6, 10, 14].map((y) => (
        <g key={y}>
          <circle cx="7" cy={y} r="1.5" fill="#00205F" />
          <circle cx="13" cy={y} r="1.5" fill="#00205F" />
        </g>
      ))}
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]">
      <rect x="5" y="6" width="13" height="13" rx="1" stroke="#00205F" strokeWidth="2" />
      <path d="M12.5 5.5 L18.5 11.5" stroke="#00205F" strokeWidth="2" />
      <path d="M16 3 L21 8 L18.5 10.5 L13.5 5.5 Z" fill="#00205F" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
      <path d="M5 7 L19 7" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7 L9 5 L15 5 L15 7" stroke="#00205F" strokeWidth="2" />
      <path d="M7 7 L7.5 20 L16.5 20 L17 7" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ── View-type tile icons (35×35 viewBox) ── */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="6" width="27" height="25" rx="2" stroke="currentColor" strokeWidth="3" />
      <path d="M4 13 L31 13" stroke="currentColor" strokeWidth="3" />
      <line x1="11" y1="3" x2="11" y2="9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="3" x2="24" y2="9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function DeckIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="10" y="4" width="18" height="27" rx="2" stroke="currentColor" strokeWidth="3" />
      <rect x="4" y="8" width="18" height="23" rx="2" stroke="currentColor" strokeWidth="3" fill="#CBE3FF" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="6" width="27" height="23" rx="1.5" stroke="currentColor" strokeWidth="3" />
      <path d="M4 13 L31 13 M13 6 L13 29 M22 13 L22 29" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="3" />
      <rect x="20" y="4" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="3" />
      <rect x="4" y="20" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="3" />
      <rect x="20" y="20" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function DetailsIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="7" y="4" width="21" height="27" rx="2" stroke="currentColor" strokeWidth="3" />
      <line x1="13" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="23" x2="18" y2="23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <path d="M17.5 3 C12 3 8 7 8 12.5 C8 19 17.5 31 17.5 31 C17.5 31 27 19 27 12.5 C27 7 23 3 17.5 3 Z" stroke="currentColor" strokeWidth="3" />
      <circle cx="17.5" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="27" height="27" rx="2.5" stroke="currentColor" strokeWidth="3.5" />
      <path d="M9 22 L15 16 L20 20 L26 12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="5" y="5" width="11" height="11" rx="1.8" stroke="currentColor" strokeWidth="3.5" />
      <rect x="19" y="5" width="11" height="7" rx="1.8" stroke="currentColor" strokeWidth="3.5" />
      <rect x="5" y="20" width="11" height="7" rx="1.8" stroke="currentColor" strokeWidth="3.5" />
      <rect x="19" y="16" width="11" height="11" rx="1.8" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  );
}
function FormIcon() {
  return (
    <svg viewBox="0 0 30 27" fill="none" className="w-full h-full">
      <rect x="1" y="2" width="28" height="8" rx="1" stroke="currentColor" strokeWidth="3" />
      <rect x="1" y="17" width="28" height="8" rx="1" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function ButtonBlockIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="10" width="27" height="15" rx="4" stroke="currentColor" strokeWidth="3" />
      <line x1="12" y1="17.5" x2="23" y2="17.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg viewBox="0 0 39 39" fill="none" className="w-full h-full">
      <rect x="3" y="3" width="33" height="33" rx="4" stroke="currentColor" strokeWidth="3.25" />
      <circle cx="13" cy="13" r="3" fill="currentColor" />
      <path d="M5 30 L15 21 L23 28 L28 24 L34 30" stroke="currentColor" strokeWidth="3.25" strokeLinejoin="round" />
    </svg>
  );
}
