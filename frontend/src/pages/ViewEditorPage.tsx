import { useEffect, useRef, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { ViewNavPanel, type NavSection, type SystemNavGroup } from "@/components/layout/ViewNavPanel";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { usePages, useUpdatePage, useCreatePage, useDeletePage, usePublishPage, useUnpublishPage } from "@/shared/hooks/useViews";
import { useEntities } from "@/shared/hooks/useEntities";
import type { FieldRead } from "@/shared/api/entities";
import { SortingModal, GroupingModal, DensityModal, TableViewsModal, NewActionModal } from "@/components/modals/ViewModals";

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

type PageBlockType =
  | "form" | "table" | "button" | "view" | "rich_text" | "metric" | "kpi"
  | "chart" | "calendar" | "kanban" | "divider" | "iframe";

interface PageBlock {
  id: string;
  type: PageBlockType;
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
  font_family?: string;
  heading_size?: string;
  body_size?: string;
  input_style?: "outline" | "filled" | "minimal";
  label_position?: "top" | "inline";
}

const FONT_FAMILIES = ["Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Playfair Display", "JetBrains Mono"];
const FONT_SIZES    = ["11", "12", "13", "14", "15", "16", "18", "20", "24", "28", "32", "40", "48"];

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

const BLOCK_TYPE_META: Record<PageBlockType, { label: string; desc?: string; group?: string }> = {
  form:      { label: "Форма" },
  table:     { label: "Таблица" },
  button:    { label: "Кнопка" },
  view:      { label: "Представление" },
  rich_text: { label: "Текст" },
  metric:    { label: "Метрика", desc: "Один числовой показатель", group: "Аналитика" },
  kpi:       { label: "KPI", desc: "Показатель с динамикой", group: "Аналитика" },
  chart:     { label: "График", desc: "Столбцы или линия по данным", group: "Аналитика" },
  calendar:  { label: "Календарь", desc: "План и события по датам", group: "Данные" },
  kanban:    { label: "Kanban", desc: "Доска по статусам", group: "Данные" },
  divider:   { label: "Разделитель" },
  iframe:    { label: "Фрейм" },
};

const ADDABLE_BLOCKS: { type: PageBlockType; label: string; desc?: string }[] = [
  { type: "form",      label: "Форма" },
  { type: "table",     label: "Таблица" },
  { type: "kanban",    label: "Kanban" },
  { type: "calendar",  label: "Календарь" },
  { type: "chart",     label: "График" },
  { type: "kpi",       label: "KPI" },
  { type: "button",    label: "Кнопка" },
  { type: "rich_text", label: "Текст" },
  { type: "metric",    label: "Метрика" },
  { type: "divider",   label: "Разделитель" },
  { type: "iframe",    label: "Фрейм" },
];

function defaultBlockConfig(type: PageBlockType): Record<string, unknown> {
  if (type === "rich_text") return { text: "Текстовый блок" };
  if (type === "metric")    return { value: "0", width: "third" };
  if (type === "kpi")       return { value: "0", trend: "+0%", tone: "positive", width: "half" };
  if (type === "chart")     return { chart_type: "bar", source: "records" };
  if (type === "calendar")  return { date_field: "", title_field: "" };
  if (type === "kanban")    return { group_by: "", card_title: "" };
  if (type === "iframe")    return { src: "" };
  if (type === "button")    return { width: "half" };
  return {};
}

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

  const [showSortModal, setShowSortModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const [navCollapsed, setNavCollapsed] = useState(false);
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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const app = useActiveApp(apps);
  const appId = app?.id;

  const pagesQuery = usePages(appId);
  const pages = pagesQuery.data ?? [];
  const updatePageMutation = useUpdatePage(appId ?? "");
  const createPageMutation = useCreatePage(appId ?? "");
  const deletePageMutation = useDeletePage(appId ?? "");
  const publishPageMutation = usePublishPage(appId ?? "");
  const unpublishPageMutation = useUnpublishPage(appId ?? "");

  const { data: entities = [] } = useEntities(appId);

  const activePage = pages.find((p) => p.id === activeView) ?? null;

  // Set initial active view when pages load (prefer user pages)
  useEffect(() => {
    if (pages.length > 0 && !activeView) {
      const first = pages.find((p) => !p.layout?.is_system) ?? pages[0];
      setActiveView(first.id);
    }
  }, [pages, activeView]);

  // Sync active page into iframe without reloading it
  useEffect(() => {
    if (activeView && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "RT_NAVIGATE", pageId: activeView },
        window.location.origin,
      );
    }
  }, [activeView]);

  // Sync local state from active page
  useEffect(() => {
    if (!activePage) return;
    setName(activePage.title);
    setBlocks((activePage.blocks ?? []) as unknown as PageBlock[]);
    setLayout(activePage.layout ?? {});
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const userPages   = pages.filter((p) => !p.layout?.is_system);
  const systemPages = pages.filter((p) =>  p.layout?.is_system);

  const navSections: NavSection[] = [
    {
      id: "main",
      title: "Навигация",
      views: userPages.map((p) => ({ id: p.id, label: p.title })),
    },
  ];

  // Group system pages by entity
  const systemGroups: SystemNavGroup[] = entities
    .map((entity) => {
      const views = systemPages
        .filter((p) => p.layout?.entity_id === entity.id)
        .map((p) => ({
          id: p.id,
          label: p.title,
          systemType: (p.layout?.system_type as "detail" | "form") ?? undefined,
        }));
      return { entityId: entity.id, entityName: entity.display_name, views };
    })
    .filter((g) => g.views.length > 0);

  // Warning: any page has no blocks, OR a data-view page has no entity_id set
  const hasWarning = pages.some((p) => {
    const blks = (p.blocks ?? []) as unknown[];
    const lay = (p.layout ?? {}) as Record<string, unknown>;
    const isDataView = ["table", "calendar", "deck", "gallery", "gantt", "map"].includes(lay.view_type as string);
    return blks.length === 0 || (isDataView && !lay.entity_id);
  });

  function _postRefetch(updatedLayout?: Record<string, unknown>) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const origin = window.location.origin;
    if (activeView && updatedLayout) {
      win.postMessage({ type: "RT_PAGE_LAYOUT", pageId: activeView, layout: updatedLayout }, origin);
    }
    win.postMessage({ type: "RT_REFETCH" }, origin);
  }

  async function ensureSystemPages(entityId: string) {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity || !appId) return;
    const hasDetail = pages.some(
      (p) => p.layout?.is_system && p.layout?.entity_id === entityId && p.layout?.system_type === "detail",
    );
    const hasForm = pages.some(
      (p) => p.layout?.is_system && p.layout?.entity_id === entityId && p.layout?.system_type === "form",
    );
    const hasInline = pages.some(
      (p) => p.layout?.is_system && p.layout?.entity_id === entityId && p.layout?.system_type === "inline",
    );
    const base = entity.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entity";
    if (!hasDetail) {
      await createPageMutation.mutateAsync({
        slug: `${base}-detail-sys-${Date.now().toString(36)}`,
        title: `${entity.display_name}_Detail`,
        layout: { is_system: true, system_type: "detail", entity_id: entityId, view_type: "detail" },
      });
    }
    if (!hasForm) {
      await createPageMutation.mutateAsync({
        slug: `${base}-form-sys-${Date.now().toString(36)}`,
        title: `${entity.display_name}_Form`,
        layout: { is_system: true, system_type: "form", entity_id: entityId, view_type: "form" },
      });
    }
    if (!hasInline) {
      await createPageMutation.mutateAsync({
        slug: `${base}-inline-sys-${Date.now().toString(36)}`,
        title: `${entity.display_name}_Inline`,
        layout: { is_system: true, system_type: "inline", entity_id: entityId, view_type: "table" },
      });
    }
    if (!hasDetail || !hasForm || !hasInline) _postRefetch();
  }

  // Merge a partial into page.layout and persist to backend.
  function patchLayout(partial: Record<string, unknown>) {
    const next = { ...layoutRef.current, ...partial };
    setLayout(next);
    if (!activeView || !appId) return;
    const prevEntityId = layoutRef.current?.entity_id as string | undefined;
    updatePageMutation.mutate(
      { pageId: activeView, body: { layout: next } },
      { onSuccess: () => {
        _postRefetch(next);
        if (partial.entity_id && partial.entity_id !== prevEntityId) {
          void ensureSystemPages(partial.entity_id as string);
        }
      }},
    );
  }

  function handleNameBlur() {
    if (!activeView || !appId) return;
    updatePageMutation.mutate(
      { pageId: activeView, body: { title: name } },
      { onSuccess: () => _postRefetch() },
    );
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
    updatePageMutation.mutate(
      { pageId: activeView, body: { blocks: newBlocks as unknown as Record<string, unknown>[] } },
      { onSuccess: () => _postRefetch() },
    );
  }

  function handleUpdateBlock(blockId: string, patch: Partial<PageBlock>) {
    handleBlocksChange(blocks.map((block) => (
      block.id === blockId ? { ...block, ...patch } : block
    )));
  }

  function handleUpdateBlockConfig(blockId: string, patch: Record<string, unknown>) {
    handleBlocksChange(blocks.map((block) => (
      block.id === blockId ? { ...block, config: { ...block.config, ...patch } } : block
    )));
  }

  function handleAddBlock(type: PageBlockType) {
    const newBlock: PageBlock = {
      id: genId(),
      type,
      title: BLOCK_TYPE_META[type]?.label ?? type,
      config: defaultBlockConfig(type),
    };
    handleBlocksChange([...blocks, newBlock]);
  }

  function handleAddPage(_sectionId: string, viewType?: string) {
    if (!appId) return;
    const title = window.prompt("Название страницы:", "Новая страница");
    if (!title?.trim()) return;
    const base = title.trim().toLowerCase()
      .replace(/[а-яё]/gi, (c) => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c.toLowerCase()] ?? c))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
    const layout = viewType ? { view_type: viewType === "grid" ? "table" : viewType } : undefined;
    createPageMutation.mutate(
      { slug: `${base}-${Date.now().toString(36)}`, title: title.trim(), ...(layout ? { layout } : {}) },
      { onSuccess: (page) => { setActiveView(page.id); _postRefetch(); } },
    );
  }

  function handleDeletePage(pageId: string) {
    if (!appId) return;
    if (!window.confirm("Удалить страницу?")) return;
    deletePageMutation.mutate(pageId, { onSuccess: () => _postRefetch() });
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
        onSave={activeView && appId ? () => updatePageMutation.mutate(
          { pageId: activeView, body: { title: name, layout, blocks: blocks as unknown as Record<string, unknown>[] } },
          { onSuccess: () => _postRefetch() },
        ) : undefined}
      />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />
      {!navCollapsed && (
        <ViewNavPanel
          sections={navSections}
          activeViewId={activeView}
          onSelect={setActiveView}
          onAddView={handleAddPage}
          onDeleteView={(id) => {
            const page = pages.find((p) => p.id === id);
            if (!page?.layout?.is_system) handleDeletePage(id);
          }}
          hasWarning={hasWarning}
          systemGroups={systemGroups}
        />
      )}

      {/* ── Top tab bar ── */}
      <div
        className="absolute bg-mainbg rounded-[5px]"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1235 : 945, height: 55, transition: "left 0.2s, width 0.2s" }}
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
        <div className="absolute flex items-center gap-[10px]" style={{ left: 620, top: 10.5, height: 34 }}>
          <a
            href={appId ? `/app/?app=${appId}` : `/app/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-[10px] px-5 py-[5px]
                       border-2 border-primary rounded-[20px] text-meta font-semibold text-primary
                       hover:bg-cardbg/40 transition-colors h-full"
          >
            Предпросмотр
          </a>
          {activePage && (
            <button
              onClick={() => {
                if (!activeView) return;
                const isPublished = (activePage as { is_published?: boolean }).is_published;
                if (isPublished) {
                  unpublishPageMutation.mutate(activeView);
                } else {
                  publishPageMutation.mutate(activeView);
                }
              }}
              disabled={publishPageMutation.isPending || unpublishPageMutation.isPending}
              className={cn(
                "flex items-center justify-center gap-[8px] px-4 py-[5px] rounded-[20px] text-meta font-semibold transition-colors h-full border-2 disabled:opacity-60",
                (activePage as { is_published?: boolean }).is_published
                  ? "border-green-500 text-green-600 hover:bg-green-50"
                  : "border-cta text-cta hover:bg-[#EBF4FF]",
              )}
            >
              {(activePage as { is_published?: boolean }).is_published ? "Опубликовано" : "Опубликовать"}
            </button>
          )}
        </div>
      </div>

      {/* ── Editor scroll panel ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-y-auto"
        style={{ left: navCollapsed ? 90 : 380, top: 130, width: navCollapsed ? 1235 : 945, height: 945, transition: "left 0.2s, width 0.2s" }}
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
            onOpenDensityModal={() => setShowDensityModal(true)}
          />
        ) : (
          <div className="flex flex-col gap-[30px] pt-[53px] pb-[40px]">
            {/* Toolbar: добавить представление / действие */}
            <div className="flex items-center gap-[10px] px-[40px]">
              <button
                onClick={() => setShowViewsModal(true)}
                className="flex items-center gap-[6px] h-[34px] px-4 border-2 border-cta text-cta text-[13px] font-medium rounded-btn hover:bg-cta/10 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Добавить представление
              </button>
              <button
                onClick={() => setShowActionModal(true)}
                className="flex items-center gap-[6px] h-[34px] px-4 border-2 border-cta text-cta text-[13px] font-medium rounded-btn hover:bg-cta/10 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Новое действие
              </button>
            </div>

            {/* Блоки страницы */}
            <CollapsibleSection
              title="Блоки страницы"
              open={blocksOpen}
              onToggle={() => setBlocksOpen((v) => !v)}
            >
              <BlockCanvas
                blocks={blocks}
                fields={userFields}
                pages={pages}
                onBlocksChange={handleBlocksChange}
                onBlockChange={handleUpdateBlock}
                onBlockConfigChange={handleUpdateBlockConfig}
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
                <div className="flex flex-col gap-[8px] w-[538px]">
                  <SortConfig
                    fields={userFields}
                    sort={sortRules}
                    onChange={(s) => patchLayout({ sort: s })}
                  />
                  <button
                    onClick={() => setShowSortModal(true)}
                    className="flex items-center gap-[6px] w-fit h-[34px] px-4 bg-cta/10 text-cta text-[13px] font-medium rounded-btn hover:bg-cta/20 transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><line x1="2" y1="4" x2="10" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    Расширенная сортировка
                  </button>
                </div>
              </FieldRow>

              {/* Группировка */}
              <FieldRow title="Группировка" desc="Сгруппируйте строки по значениям в одном или нескольких их столбцах.">
                <div className="flex flex-col gap-[8px] w-[538px]">
                  <GroupConfig
                    fields={userFields}
                    groupBy={(layout.group_by as string[]) ?? []}
                    onChange={(g) => patchLayout({ group_by: g })}
                  />
                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="flex items-center gap-[6px] w-fit h-[34px] px-4 bg-cta/10 text-cta text-[13px] font-medium rounded-btn hover:bg-cta/20 transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" /><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" /><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" /><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" /></svg>
                    Настройки группировки
                  </button>
                </div>
              </FieldRow>

              {viewType === "card" ? (
                <FieldRow title="Стиль страницы" desc="Как отображаются страницы форм." labelWidth={252}>
                  <div className="flex flex-col gap-[33px] w-[538px]">
                    <PageStyleSegmented
                      value={(layout.page_style as string) ?? "Карточки"}
                      onChange={(v) => patchLayout({ page_style: v })}
                    />
                    <CardStyleConfig pageStyle={(layout.page_style as string) ?? "Карточки"} />
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

      <IframePreview
        appId={appId}
        appName={app?.name ?? "Приложение"}
        activePageId={activeView}
        iframeRef={iframeRef}
        accent={design.accent ?? "#35A7FF"}
      />

      {pickerOpen && (
        <BlockPickerModal
          onAdd={handleAddBlock}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {showSortModal && (
        <SortingModal
          columns={userFields.map((f) => f.display_name)}
          rules={sortRules.map((r) => ({
            column: userFields.find((f) => f.name === r.field)?.display_name ?? r.field,
            direction: r.dir,
          }))}
          onClose={() => setShowSortModal(false)}
          onApply={(rules) => {
            const mapped = rules.map((r) => ({
              field: userFields.find((f) => f.display_name === r.column)?.name ?? r.column,
              dir: r.direction,
            }));
            patchLayout({ sort: mapped });
            setShowSortModal(false);
          }}
        />
      )}

      {showGroupModal && (
        <GroupingModal
          columns={userFields.map((f) => f.display_name)}
          onClose={() => setShowGroupModal(false)}
          onApply={(settings) => {
            const fieldName = userFields.find((f) => f.display_name === settings.groupBy)?.name ?? settings.groupBy;
            patchLayout({ group_by: fieldName ? [fieldName] : [] });
            setShowGroupModal(false);
          }}
          onReset={() => {
            patchLayout({ group_by: [] });
            setShowGroupModal(false);
          }}
        />
      )}

      {showDensityModal && (
        <DensityModal
          current={
            design.density === "compact" ? "compact"
            : design.density === "spacious" ? "spacious"
            : "standard"
          }
          onClose={() => setShowDensityModal(false)}
          onApply={(d) => {
            patchLayout({ design: { ...design, density: d === "standard" ? "normal" : d } });
            setShowDensityModal(false);
          }}
        />
      )}

      {showViewsModal && (
        <TableViewsModal
          onClose={() => setShowViewsModal(false)}
          onAdd={(type) => {
            handleAddPage("main", type);
            setShowViewsModal(false);
          }}
        />
      )}

      {showActionModal && (
        <NewActionModal
          onClose={() => setShowActionModal(false)}
          onConfirm={() => setShowActionModal(false)}
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

function CardStyleConfig({ pageStyle }: { pageStyle: string }) {
  const ROWS_BY_STYLE: Record<string, { id: string; label: string; value: string }[]> = {
    "Карточки": [
      { id: "icon",     label: "Иконка",       value: "Отправить CMS" },
      { id: "title",    label: "Заголовок",    value: "Заголовок" },
      { id: "subtitle", label: "Подзаголовок", value: "Отправить CMS" },
      { id: "image",    label: "Изображение",  value: "Отправить" },
    ],
    "Полная": [
      { id: "title",    label: "Заголовок",    value: "Заголовок" },
      { id: "subtitle", label: "Подзаголовок", value: "Отправить CMS" },
    ],
    "Список": [
      { id: "icon",     label: "Иконка",       value: "Отправить CMS" },
      { id: "title",    label: "Заголовок",    value: "Заголовок" },
      { id: "subtitle", label: "Подзаголовок", value: "Отправить CMS" },
    ],
    "Сетка": [
      { id: "icon",     label: "Иконка",       value: "Отправить CMS" },
      { id: "title",    label: "Заголовок",    value: "Заголовок" },
      { id: "image",    label: "Изображение",  value: "Отправить" },
    ],
  };
  const rows = ROWS_BY_STYLE[pageStyle] ?? ROWS_BY_STYLE["Карточки"];

  const preview =
    pageStyle === "Список" ? (
      /* Список: горизонтальная строка */
      <div className="w-[290px] flex items-center gap-[12px] bg-white px-[14px] py-[12px] shrink-0">
        <span className="w-[44px] h-[44px] rounded-full bg-cardbg shrink-0" />
        <div className="flex flex-col">
          <span className="text-[16px] font-medium text-primary leading-snug">Заголовок</span>
          <span className="text-[12px] text-primary/60 leading-snug">Подзаголовок</span>
        </div>
      </div>
    ) : pageStyle === "Сетка" ? (
      /* Сетка: квадратная карточка */
      <div className="w-[140px] flex flex-col bg-white shrink-0">
        <div className="w-full h-[100px] bg-cardbg" />
        <div className="flex items-center gap-[8px] p-[8px]">
          <span className="w-[28px] h-[28px] rounded-full bg-cardbg/60 shrink-0" />
          <span className="text-[13px] font-medium text-primary leading-snug">Заголовок</span>
        </div>
      </div>
    ) : pageStyle === "Полная" ? (
      /* Полная: широкая карточка без аватара */
      <div className="w-[290px] flex flex-col bg-white shrink-0 p-[16px] gap-[8px]">
        <span className="text-[20px] font-semibold text-primary">Заголовок</span>
        <span className="text-[14px] text-primary/60">Подзаголовок</span>
        <div className="w-full h-[80px] bg-cardbg rounded mt-[4px]" />
      </div>
    ) : (
      /* Карточки (default) */
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
    );

  return (
    <div className="flex items-start gap-[40px]">
      {preview}

      {/* Config rows */}
      <div className="flex flex-col gap-[20px] w-[431px]">
        {rows.map((r) => (
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
    onChange([...rules, { id: genId(), field: first?.name ?? "", op: "eq", value: "" }]);
  }
  function update(id: string, patch: Partial<RuleCond>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }
  const needsValue = (op: RuleCond["op"]) => op !== "empty" && op !== "not_empty";

  return (
    <div className="flex flex-col gap-[24px] pt-[36px] px-[40px] pb-[40px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-primary">Правила формирования</h2>
          <p className="text-[14px] text-primary/55 mt-1 max-w-[480px]">
            Показываются только строки, удовлетворяющие всем условиям.
          </p>
        </div>
        {fields.length > 0 && (
          <button
            onClick={addRule}
            className="flex items-center gap-[6px] h-[36px] px-4 bg-cta text-white text-[13px] font-medium rounded-[8px] hover:bg-active transition-colors shrink-0"
          >
            <PlusGlyphWhite /> Добавить условие
          </button>
        )}
      </div>

      {/* No table selected */}
      {fields.length === 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-[#EBF4FF] rounded-[10px]">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0 text-cta">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
            <line x1="10" y1="9" x2="10" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="10" cy="6.5" r="1" fill="currentColor" />
          </svg>
          <span className="text-[14px] text-primary">Сначала выберите таблицу на вкладке «Представления».</span>
        </div>
      )}

      {/* Empty state */}
      {rules.length === 0 && fields.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-primary/20">
            <rect x="6" y="12" width="36" height="6" rx="3" fill="currentColor" />
            <rect x="6" y="24" width="28" height="6" rx="3" fill="currentColor" />
            <rect x="6" y="36" width="20" height="6" rx="3" fill="currentColor" />
          </svg>
          <p className="text-[14px] text-primary/40">Правил нет — отображаются все записи</p>
          <button
            onClick={addRule}
            className="mt-1 flex items-center gap-2 h-[36px] px-5 border-2 border-cta text-cta text-[13px] font-medium rounded-[8px] hover:bg-cta/10 transition-colors"
          >
            <PlusGlyphWhite /> Добавить первое условие
          </button>
        </div>
      )}

      {/* Rules list */}
      {rules.length > 0 && (
        <div className="flex flex-col">
          {rules.map((r, idx) => (
            <div key={r.id}>
              {/* AND connector */}
              {idx > 0 && (
                <div className="flex items-center gap-3 my-2 pl-1">
                  <div className="flex-1 h-px bg-cardbg" />
                  <span className="text-[11px] font-bold text-primary/35 uppercase tracking-widest px-2">И</span>
                  <div className="flex-1 h-px bg-cardbg" />
                </div>
              )}
              {/* Rule card */}
              <div className="flex items-center gap-3 bg-white rounded-[10px] px-4 py-3 border border-cardbg">
                <span className="text-[12px] font-semibold text-primary/35 w-[28px] shrink-0">
                  {idx === 0 ? "где" : "и"}
                </span>

                {/* Field */}
                <div className="relative flex-1 min-w-[130px]">
                  <select
                    value={r.field}
                    onChange={(e) => update(r.id, { field: e.target.value })}
                    className="w-full h-[36px] appearance-none bg-cardbg rounded-[8px] pl-3 pr-8 text-[14px] text-primary outline-none focus:ring-1 focus:ring-cta/30 cursor-pointer"
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.name}>{f.display_name}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 16 16" fill="none" className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Operator */}
                <div className="relative shrink-0">
                  <select
                    value={r.op}
                    onChange={(e) => update(r.id, { op: e.target.value as RuleCond["op"] })}
                    className="h-[36px] appearance-none bg-cardbg rounded-[8px] pl-3 pr-8 text-[14px] text-primary outline-none focus:ring-1 focus:ring-cta/30 cursor-pointer"
                  >
                    {(Object.keys(OP_LABELS) as RuleCond["op"][]).map((op) => (
                      <option key={op} value={op}>{OP_LABELS[op]}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 16 16" fill="none" className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Value */}
                {needsValue(r.op) ? (
                  <input
                    value={r.value}
                    onChange={(e) => update(r.id, { value: e.target.value })}
                    placeholder="значение"
                    className="flex-1 h-[36px] bg-cardbg rounded-[8px] px-3 text-[14px] text-primary outline-none focus:ring-1 focus:ring-cta/30 placeholder:text-primary/25 min-w-[80px]"
                  />
                ) : (
                  <div className="flex-1" />
                )}

                {/* Delete */}
                <button
                  onClick={() => remove(r.id)}
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 text-primary/30 hover:text-red-500 transition-colors"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}

          {/* Add another rule */}
          <button
            onClick={addRule}
            className="mt-3 self-start flex items-center gap-2 h-[34px] px-4 bg-cta/8 text-cta text-[13px] font-medium rounded-[8px] hover:bg-cta/15 transition-colors"
          >
            <PlusGlyph /> Ещё условие
          </button>
        </div>
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
  onOpenDensityModal,
}: {
  design: DesignConfig;
  onChange: (d: DesignConfig) => void;
  onOpenDensityModal: () => void;
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
        <div className="flex items-center gap-[10px]">
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
          <button
            onClick={onOpenDensityModal}
            className="h-[41px] px-4 border-2 border-cta text-cta text-[14px] font-medium rounded-btn hover:bg-cta/10 transition-colors"
          >
            Выбрать визуально
          </button>
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

      {/* ── Typography ── */}
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-semibold text-primary">Типографика</span>
          <div className="flex-1 h-px bg-cardbg" />
        </div>

        <div className="flex flex-col gap-[12px] max-w-[538px]">
          {/* Font family */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-medium text-primary">Шрифт</span>
              <p className="text-[13px] text-primary/50">Применяется ко всем текстам страницы</p>
            </div>
            <div className="relative w-[200px]">
              <select
                value={design.font_family ?? "Inter"}
                onChange={(e) => onChange({ ...design, font_family: e.target.value })}
                className="w-full h-[38px] appearance-none bg-cardbg rounded-[8px] pl-3 pr-8 text-[14px] text-primary outline-none cursor-pointer"
                style={{ fontFamily: design.font_family ?? "Inter" }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
              <svg viewBox="0 0 16 16" fill="none" className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Heading size */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-medium text-primary">Размер заголовков</span>
            </div>
            <div className="flex h-[36px] bg-cardbg rounded-[8px] p-[3px] gap-[2px] w-[200px]">
              {([["sm","Малый"],["md","Средний"],["lg","Крупный"]] as const).map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...design, heading_size: v })}
                  className={cn(
                    "flex-1 rounded-[6px] text-[12px] font-medium transition-all",
                    (design.heading_size ?? "md") === v ? "bg-cta text-white shadow-sm" : "text-primary/60 hover:text-primary"
                  )}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Body size */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-medium text-primary">Размер текста</span>
            </div>
            <div className="flex h-[36px] bg-cardbg rounded-[8px] p-[3px] gap-[2px] w-[200px]">
              {([["sm","12px"],["md","14px"],["lg","16px"]] as const).map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...design, body_size: v })}
                  className={cn(
                    "flex-1 rounded-[6px] text-[12px] font-medium transition-all",
                    (design.body_size ?? "md") === v ? "bg-cta text-white shadow-sm" : "text-primary/60 hover:text-primary"
                  )}
                >{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Font preview */}
        <div
          className="px-4 py-3 bg-cardbg rounded-[10px] max-w-[538px]"
          style={{ fontFamily: design.font_family ?? "Inter" }}
        >
          <p className={cn("font-bold text-primary mb-1", design.heading_size === "sm" ? "text-[16px]" : design.heading_size === "lg" ? "text-[24px]" : "text-[20px]")}>
            Заголовок страницы
          </p>
          <p className={cn("text-primary/70", design.body_size === "sm" ? "text-[12px]" : design.body_size === "lg" ? "text-[16px]" : "text-[14px]")}>
            Обычный текст страницы с примером содержимого.
          </p>
        </div>
      </div>

      {/* ── Form settings ── */}
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-semibold text-primary">Поля форм</span>
          <div className="flex-1 h-px bg-cardbg" />
        </div>

        <div className="flex flex-col gap-[12px] max-w-[538px]">
          {/* Input style */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-medium text-primary">Стиль полей</span>
              <p className="text-[13px] text-primary/50">Внешний вид полей ввода в формах</p>
            </div>
            <div className="flex h-[36px] bg-cardbg rounded-[8px] p-[3px] gap-[2px] w-[220px]">
              {([["outline","Рамка"],["filled","Заливка"],["minimal","Линия"]] as const).map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...design, input_style: v })}
                  className={cn(
                    "flex-1 rounded-[6px] text-[12px] font-medium transition-all",
                    (design.input_style ?? "filled") === v ? "bg-cta text-white shadow-sm" : "text-primary/60 hover:text-primary"
                  )}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Label position */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-medium text-primary">Позиция лейбла</span>
            </div>
            <div className="flex h-[36px] bg-cardbg rounded-[8px] p-[3px] gap-[2px] w-[180px]">
              {([["top","Сверху"],["inline","Внутри"]] as const).map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...design, label_position: v })}
                  className={cn(
                    "flex-1 rounded-[6px] text-[12px] font-medium transition-all",
                    (design.label_position ?? "top") === v ? "bg-cta text-white shadow-sm" : "text-primary/60 hover:text-primary"
                  )}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Field preview */}
          <div className="flex flex-col gap-2 p-4 bg-cardbg rounded-[10px]">
            {(design.label_position ?? "top") === "top" ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-primary/60 font-medium">Имя клиента</span>
                  <div className={cn(
                    "h-[36px] rounded-[8px] flex items-center px-3 text-[14px] text-primary/30",
                    (design.input_style ?? "filled") === "outline" ? "border-2 border-cardbg bg-white" :
                    (design.input_style ?? "filled") === "minimal" ? "border-b-2 border-cardbg rounded-none bg-transparent" :
                    "bg-white"
                  )}>Иван Петров</div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-primary/60 font-medium">Статус</span>
                  <div className={cn(
                    "h-[36px] rounded-[8px] flex items-center px-3 text-[14px] text-primary/30",
                    (design.input_style ?? "filled") === "outline" ? "border-2 border-cardbg bg-white" :
                    (design.input_style ?? "filled") === "minimal" ? "border-b-2 border-cardbg rounded-none bg-transparent" :
                    "bg-white"
                  )}>Активен</div>
                </label>
              </>
            ) : (
              <>
                {["Имя клиента","Статус"].map((label) => (
                  <div key={label} className={cn(
                    "h-[42px] rounded-[8px] flex items-center px-3 gap-3",
                    (design.input_style ?? "filled") === "outline" ? "border-2 border-cardbg bg-white" :
                    (design.input_style ?? "filled") === "minimal" ? "border-b-2 border-cardbg rounded-none bg-transparent" :
                    "bg-white"
                  )}>
                    <span className="text-[12px] text-primary/50 w-[90px] shrink-0">{label}</span>
                    <span className="text-[14px] text-primary/30">Введите значение</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live mini-preview of accent */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[14px] text-primary/50">Предпросмотр кнопки</span>
        <button
          className="w-fit px-6 h-[42px] rounded-btn text-white text-[15px] font-medium"
          style={{ background: accent, fontFamily: design.font_family ?? "Inter" }}
        >
          Кнопка действия
        </button>
      </div>
    </div>
  );
}

/* ── Iframe preview panel (right side, mirrors RuntimeApp at real scale) ── */
function IframePreview({
  appId,
  appName,
  activePageId,
  iframeRef,
  accent,
}: {
  appId: string | undefined;
  appName: string;
  activePageId: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  accent: string;
}) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

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

  // Mobile: 380×800 phone frame. Desktop: 540×500 widescreen frame, 1280px content scaled down.
  const cfg = device === "mobile"
    ? { frameW: 380, frameH: 800, iframeW: 390,  borderR: 40 }
    : { frameW: 540, frameH: 500, iframeW: 1280, borderR: 14 };
  const scale = cfg.frameW / cfg.iframeW;
  const iframeH = Math.ceil(cfg.frameH / scale);

  const src = appId
    ? `/app/?app=${appId}&preview=true&page=${activePageId}`
    : "";

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

      {/* Device frame */}
      <div
        className="shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden relative"
        style={{
          width: cfg.frameW,
          height: cfg.frameH,
          borderRadius: cfg.borderR,
          transition: "width 0.25s, height 0.25s, border-radius 0.25s",
        }}
      >
        {src ? (
          <iframe
            ref={iframeRef}
            src={src}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cfg.iframeW,
              height: iframeH,
              border: 0,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
            }}
            title="Предпросмотр приложения"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-primary/30 text-[14px]">
            Выберите приложение
          </div>
        )}
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


/* ── Sortable block row ── */
const BLOCK_ICONS: Record<string, React.ReactNode> = {
  form:      <FormIcon />,
  table:     <TableIcon />,
  button:    <ButtonBlockIcon />,
  view:      <TableIcon />,
  rich_text: <DetailsIcon />,
  metric:    <ChartIcon />,
  kpi:       <DashboardIcon />,
  chart:     <ChartIcon />,
  calendar:  <CalendarIcon />,
  kanban:    <DeckIcon />,
  divider:   <DashboardIcon />,
  iframe:    <MapIcon />,
};

function SortableBlockRow({
  block,
  fields,
  pages,
  onChange,
  onConfigChange,
  onDelete,
}: {
  block: PageBlock;
  fields: FieldRead[];
  pages: import("@/shared/api/views").PageRead[];
  onChange: (patch: Partial<PageBlock>) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="rounded-btn bg-white"
    >
      <div className="flex items-center gap-[12px] min-h-[50px] px-5">
        <button
          {...attributes} {...listeners}
          className="w-5 h-5 shrink-0 cursor-grab active:cursor-grabbing text-primary/30 hover:text-primary/60 touch-none"
          title="Перетащить"
        >
          <DragVert />
        </button>
        <span className="w-[22px] h-[22px] shrink-0 text-primary/60">
          {BLOCK_ICONS[block.type] ?? <TableIcon />}
        </span>
        <input
          value={block.title ?? ""}
          onChange={(event) => onChange({ title: event.target.value })}
          className="flex-1 text-[16px] text-primary font-medium bg-transparent outline-none"
          placeholder={BLOCK_TYPE_META[block.type]?.label ?? block.type}
        />
        <span className="text-[12px] text-primary/40 shrink-0">
          {BLOCK_TYPE_META[block.type]?.label}
        </span>
        <button
          onClick={onDelete}
          className="shrink-0 hover:bg-red-50 rounded-full p-1 transition-colors"
          title="Удалить блок"
        >
          <TrashIcon />
        </button>
      </div>
      <BlockInlineSettings block={block} fields={fields} pages={pages} onConfigChange={onConfigChange} />
    </div>
  );
}

function BlockInlineSettings({
  block,
  fields,
  pages,
  onConfigChange,
}: {
  block: PageBlock;
  fields: FieldRead[];
  pages: import("@/shared/api/views").PageRead[];
  onConfigChange: (patch: Record<string, unknown>) => void;
}) {
  if (block.type === "divider" || block.type === "table" || block.type === "form") return null;

  return (
    <div className="grid grid-cols-2 gap-x-[12px] gap-y-[10px] px-5 pb-4 pt-1 border-t border-mainbg mt-0">
      {block.type === "rich_text" && (
        <>
          <ConfigInput
            label="Текст"
            value={(block.config.text as string) ?? ""}
            onChange={(value) => onConfigChange({ text: value })}
          />
          <ConfigSelect
            label="Шрифт"
            value={(block.config.fontFamily as string) ?? "Inter"}
            options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
            onChange={(fontFamily) => onConfigChange({ fontFamily })}
          />
          <ConfigSelect
            label="Размер"
            value={(block.config.fontSize as string) ?? "14"}
            options={FONT_SIZES.map((s) => ({ value: s, label: s + "px" }))}
            onChange={(fontSize) => onConfigChange({ fontSize })}
          />
          <ConfigSegmented
            label="Начертание"
            value={(block.config.fontWeight as string) ?? "normal"}
            options={[
              { value: "normal",  label: "Обычный" },
              { value: "medium",  label: "Средний" },
              { value: "bold",    label: "Жирный" },
            ]}
            onChange={(fontWeight) => onConfigChange({ fontWeight })}
          />
          <ConfigSegmented
            label="Выравнивание"
            value={(block.config.textAlign as string) ?? "left"}
            options={[
              { value: "left",    label: "←" },
              { value: "center",  label: "≡" },
              { value: "right",   label: "→" },
            ]}
            onChange={(textAlign) => onConfigChange({ textAlign })}
          />
        </>
      )}
      {(block.type === "metric" || block.type === "kpi") && (
        <>
          <ConfigInput
            label="Значение"
            value={(block.config.value as string) ?? ""}
            onChange={(value) => onConfigChange({ value })}
          />
          {block.type === "kpi" && (
            <ConfigInput
              label="Динамика"
              value={(block.config.trend as string) ?? ""}
              onChange={(trend) => onConfigChange({ trend })}
            />
          )}
          <ConfigSelect
            label="Размер числа"
            value={(block.config.fontSize as string) ?? "32"}
            options={["20","24","28","32","40","48","56"].map((s) => ({ value: s, label: s + "px" }))}
            onChange={(fontSize) => onConfigChange({ fontSize })}
          />
        </>
      )}
      {block.type === "chart" && (
        <>
          <ConfigSelect
            label="Тип"
            value={(block.config.chart_type as string) ?? "bar"}
            options={[
              { value: "bar", label: "Столбцы" },
              { value: "line", label: "Линия" },
            ]}
            onChange={(chart_type) => onConfigChange({ chart_type })}
          />
          <ConfigSelect
            label="Поле"
            value={(block.config.value_field as string) ?? ""}
            options={fieldOptions(fields, "Любое число")}
            onChange={(value_field) => onConfigChange({ value_field })}
          />
        </>
      )}
      {block.type === "calendar" && (
        <>
          <ConfigSelect
            label="Дата"
            value={(block.config.date_field as string) ?? ""}
            options={fieldOptions(fields, "Авто")}
            onChange={(date_field) => onConfigChange({ date_field })}
          />
          <ConfigSelect
            label="Заголовок"
            value={(block.config.title_field as string) ?? ""}
            options={fieldOptions(fields, "Первое поле")}
            onChange={(title_field) => onConfigChange({ title_field })}
          />
        </>
      )}
      {block.type === "kanban" && (
        <>
          <ConfigSelect
            label="Группировать"
            value={(block.config.group_by as string) ?? ""}
            options={fieldOptions(fields, "Авто")}
            onChange={(group_by) => onConfigChange({ group_by })}
          />
          <ConfigSelect
            label="Заголовок"
            value={(block.config.card_title as string) ?? ""}
            options={fieldOptions(fields, "Первое поле")}
            onChange={(card_title) => onConfigChange({ card_title })}
          />
        </>
      )}
      {block.type === "iframe" && (
        <ConfigInput
          label="URL"
          value={(block.config.src as string) ?? ""}
          onChange={(src) => onConfigChange({ src })}
        />
      )}
      {block.type === "button" && (
        <>
          <ConfigSegmented
            label="Действие"
            value={(block.config.actionType as string) ?? "url"}
            options={[
              { value: "url",   label: "Ссылка" },
              { value: "page",  label: "Страница" },
              { value: "block", label: "Блок" },
            ]}
            onChange={(actionType) => onConfigChange({ actionType })}
          />
          {(block.config.actionType === "url" || !block.config.actionType) && (
            <ConfigInput
              label="URL"
              value={(block.config.href as string) ?? ""}
              onChange={(href) => onConfigChange({ href })}
              placeholder="https://..."
            />
          )}
          {block.config.actionType === "page" && (
            <ConfigSelect
              label="Страница"
              value={(block.config.targetPageId as string) ?? ""}
              options={[
                { value: "", label: "— выберите —" },
                ...pages.map((p) => ({ value: p.id, label: p.title })),
              ]}
              onChange={(targetPageId) => onConfigChange({ targetPageId })}
            />
          )}
          {block.config.actionType === "block" && (
            <ConfigInput
              label="ID блока"
              value={(block.config.targetBlockId as string) ?? ""}
              onChange={(targetBlockId) => onConfigChange({ targetBlockId })}
              placeholder="block-id или #anchor"
            />
          )}
          <ConfigSelect
            label="Размер текста"
            value={(block.config.fontSize as string) ?? "15"}
            options={["12","13","14","15","16","18","20"].map((s) => ({ value: s, label: s + "px" }))}
            onChange={(fontSize) => onConfigChange({ fontSize })}
          />
          <ConfigSegmented
            label="Скругление"
            value={(block.config.radius as string) ?? "rounded"}
            options={[
              { value: "sharp",   label: "Острые" },
              { value: "rounded", label: "Обычное" },
              { value: "pill",    label: "Капсула" },
            ]}
            onChange={(radius) => onConfigChange({ radius })}
          />
          <ConfigSegmented
            label="Ширина"
            value={(block.config.width as string) ?? "full"}
            options={[
              { value: "full",  label: "Полная" },
              { value: "half",  label: "½" },
              { value: "third", label: "⅓" },
              { value: "auto",  label: "Авто" },
            ]}
            onChange={(width) => onConfigChange({ width })}
          />
        </>
      )}
      {(block.type === "metric" || block.type === "kpi") && (
        <ConfigSegmented
          label="Ширина"
          value={(block.config.width as string) ?? "full"}
          options={[
            { value: "full",  label: "Полная" },
            { value: "half",  label: "½" },
            { value: "third", label: "⅓" },
          ]}
          onChange={(width) => onConfigChange({ width })}
        />
      )}
    </div>
  );
}

function fieldOptions(fields: FieldRead[], emptyLabel: string): { value: string; label: string }[] {
  return [
    { value: "", label: emptyLabel },
    ...fields.map((field) => ({ value: field.name, label: field.display_name })),
  ];
}

function ConfigInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="text-[11px] font-medium text-primary/50 uppercase tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "—"}
        className="h-[36px] bg-cardbg rounded-[8px] px-3 text-[14px] text-primary outline-none
                   border border-transparent focus:border-cta/40 transition-colors
                   placeholder:text-primary/25"
      />
    </label>
  );
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="text-[11px] font-medium text-primary/50 uppercase tracking-wide">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full h-[36px] appearance-none bg-cardbg rounded-[8px] pl-3 pr-8 text-[14px] text-primary outline-none
                     border border-transparent focus:border-cta/40 transition-colors cursor-pointer"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <svg viewBox="0 0 16 16" fill="none" className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}

function ConfigSegmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[5px] col-span-2">
      <span className="text-[11px] font-medium text-primary/50 uppercase tracking-wide">{label}</span>
      <div className="flex h-[36px] bg-cardbg rounded-[8px] p-[3px] gap-[2px]">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-[6px] text-[13px] font-medium transition-all",
              value === opt.value
                ? "bg-cta text-white shadow-sm"
                : "text-primary/60 hover:text-primary hover:bg-white/60"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Block canvas ── */
function BlockCanvas({
  blocks,
  fields,
  pages,
  onBlocksChange,
  onBlockChange,
  onBlockConfigChange,
  onAddClick,
}: {
  blocks: PageBlock[];
  fields: FieldRead[];
  pages: import("@/shared/api/views").PageRead[];
  onBlocksChange: (b: PageBlock[]) => void;
  onBlockChange: (id: string, patch: Partial<PageBlock>) => void;
  onBlockConfigChange: (id: string, patch: Record<string, unknown>) => void;
  onAddClick: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    onBlocksChange(arrayMove(blocks, oldIdx, newIdx));
  }

  return (
    <div className="flex flex-col gap-[10px] px-[40px]">
      {blocks.length === 0 && (
        <p className="text-[14px] text-primary/40 py-[5px]">Добавьте блоки на страницу</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlockRow
              key={block.id}
              block={block}
              fields={fields}
              pages={pages}
              onChange={(patch) => onBlockChange(block.id, patch)}
              onConfigChange={(patch) => onBlockConfigChange(block.id, patch)}
              onDelete={() => onBlocksChange(blocks.filter((b) => b.id !== block.id))}
            />
          ))}
        </SortableContext>
      </DndContext>
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
    form:      <FormIcon />,
    table:     <TableIcon />,
    button:    <ButtonBlockIcon />,
    rich_text: <DetailsIcon />,
    metric:    <ChartIcon />,
    kpi:       <DashboardIcon />,
    chart:     <ChartIcon />,
    calendar:  <CalendarIcon />,
    kanban:    <DeckIcon />,
    divider:   <DashboardIcon />,
    iframe:    <MapIcon />,
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
        <div className="flex flex-wrap gap-3 max-w-[480px]">
          {ADDABLE_BLOCKS.map((b) => (
            <button
              key={b.type}
              onClick={() => { onAdd(b.type); onClose(); }}
              className="flex flex-col items-start gap-[6px] w-[145px] min-h-[112px] bg-mainbg rounded-[8px] justify-center hover:bg-cardbg transition-colors border-2 border-transparent hover:border-cta p-3 text-left"
            >
              <span className="w-[30px] h-[30px] text-primary">{ICONS[b.type]}</span>
              <span className="text-[13px] text-primary font-semibold">{b.label}</span>
              <span className="text-[11px] text-primary/50 leading-[1.25]">{b.desc}</span>
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
