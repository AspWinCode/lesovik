import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { ViewNavPanel, type NavSection } from "@/components/layout/ViewNavPanel";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { usePages, useUpdatePage, useCreatePage, useDeletePage } from "@/shared/hooks/useViews";
import { useEntities } from "@/shared/hooks/useEntities";

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

export function ViewEditorPage() {
  const [railModule, setRailModule] = useState<RailModule>("constructor");
  const [activeView, setActiveView] = useState<string>("");
  const [editorTab, setEditorTab] = useState("Представления");

  const [name, setName] = useState("");
  const [viewType, setViewType] = useState<ViewType>("table");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [entityDdOpen, setEntityDdOpen] = useState(false);
  const [position, setPosition] = useState("первый");
  const [colMode, setColMode] = useState<"auto" | "manual">("manual");
  const [quickEdit, setQuickEdit] = useState(true);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const app = apps.find((a) => a.name === "Чат-бот помощник") ?? apps[0];
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
    const eid = activePage.layout?.entity_id as string | undefined;
    const vt = activePage.layout?.view_type as ViewType | undefined;
    if (eid) setSelectedEntityId(eid);
    if (vt) setViewType(vt);
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const navSections: NavSection[] = [
    {
      id: "main",
      title: "Навигация",
      views: pages.map((p) => ({ id: p.id, label: p.title })),
    },
  ];

  function handleNameBlur() {
    if (!activeView || !appId) return;
    updatePageMutation.mutate({ pageId: activeView, body: { title: name } });
  }

  function handleEntityChange(entityId: string) {
    setSelectedEntityId(entityId);
    setEntityDdOpen(false);
    if (!activeView || !appId) return;
    updatePageMutation.mutate({
      pageId: activeView,
      body: { layout: { ...(activePage?.layout ?? {}), entity_id: entityId } },
    });
  }

  function handleViewTypeChange(vt: ViewType) {
    setViewType(vt);
    if (!activeView || !appId) return;
    updatePageMutation.mutate({
      pageId: activeView,
      body: { layout: { ...(activePage?.layout ?? {}), view_type: vt } },
    });
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
      id: crypto.randomUUID(),
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
      <Navbar />
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
          href={`/app/`}
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
                    onClick={() => setPosition(p)}
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
                <div className="flex flex-col gap-[5px] w-[538px]">
                  <SortRow column="_RowNumber" />
                  <SortRow column="Row ID" />
                  <AddButton />
                </div>
              </FieldRow>

              {/* Группировка */}
              <FieldRow title="Группировка" desc="Сгруппируйте строки по значениям в одном или нескольких их столбцах.">
                <div className="w-[538px] py-[7px]">
                  <AddButton />
                </div>
              </FieldRow>

              {/* Групповой агрегат */}
              <FieldRow title="Групповой агрегат" desc="Отобразить числовую сводку по строкам в каждой группе.">
                <div className="w-[538px] py-[7px]">
                  <DropdownPill value="Главное меню" />
                </div>
              </FieldRow>

              {viewType === "card" ? (
                <FieldRow title="Стиль страницы" desc="Как отображаются страницы форм." labelWidth={252}>
                  <div className="flex flex-col gap-[33px] w-[538px]">
                    <PageStyleSegmented />
                    <CardStyleConfig />
                  </div>
                </FieldRow>
              ) : (
                <>
                  <FieldRow
                    title="Порядок столбцов"
                    desc="Автоматически или вручную упорядочьте столбцы, отображаемые в представлении."
                    labelWidth={267}
                  >
                    <ColumnOrder mode={colMode} onMode={setColMode} />
                  </FieldRow>

                  <FieldRow
                    title="Ширина колонки"
                    desc="Насколько широкими должны быть столбцы?"
                  >
                    <div className="py-[7px]"><WidthSegmented /></div>
                  </FieldRow>

                  <FieldRow title="Быстрое редактирование" desc="Разрешить вносить изменения непосредственно в табличное представление.">
                    <div className="py-[7px]">
                      <Toggle on={quickEdit} onChange={() => setQuickEdit((v) => !v)} />
                    </div>
                  </FieldRow>
                </>
              )}
            </CollapsibleSection>

            <SectionDivider title="Отображение" />
            <BehaviorSection />
            <DocumentationSection />
          </div>
        )}
      </div>

      <PreviewPanel projectName={app?.name ?? "Приложение"} />

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

function SectionDivider({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-y-2 border-white py-[10px]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] leading-[150%] font-bold text-primary">{title}</span>
        <span className="w-3 h-3 shrink-0"><Chevron open={open} /></span>
      </button>
    </div>
  );
}

function BehaviorSection() {
  const [open, setOpen] = useState(false);
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [cacheContent, setCacheContent] = useState(true);

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
              <OfflineToggle on={offlineEnabled} onChange={() => setOfflineEnabled((v) => !v)} />
            </div>
            {/* Row 2 */}
            <div className="flex items-center justify-between px-5 py-[20px]">
              <div className="flex flex-col gap-[5px] max-w-[440px]">
                <span className="text-[18px] font-semibold text-primary">Сохранить контент для использования в автономном режиме</span>
                <span className="text-[14px] text-primary/70 leading-[1.4]">Сделать все изображения и файлы доступными в автономном режиме.</span>
              </div>
              <OfflineToggle on={cacheContent} onChange={() => setCacheContent((v) => !v)} />
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

function DocumentationSection() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");

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
                value={link}
                onChange={(e) => setLink(e.target.value)}
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
      className={cn(
        "flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary",
        className
      )}
    >
      <span className="truncate">{value}</span>
      <span className="w-3 h-3 shrink-0"><Chevron open={false} /></span>
    </button>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full transition-colors shrink-0"
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

function SortRow({ column }: { column: string }) {
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  return (
    <div className="flex items-center gap-[12px] py-[7px]">
      <div className="flex-1 flex items-center justify-center gap-[10px] h-[41px] px-5 bg-white rounded-btn">
        <DragDots />
        <div className="flex items-center gap-[5px]">
          <BluePill label={column} />
          <BluePill
            label={dir === "asc" ? "По возрастанию" : "По убыванию"}
            onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          />
        </div>
      </div>
      <IconButton label="Редактировать"><EditIcon /></IconButton>
      <IconButton label="Удалить"><TrashIcon /></IconButton>
    </div>
  );
}

function BluePill({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-2 min-w-[200px] h-[41px] px-[15px] bg-cardbg rounded-btn text-[18px] text-primary"
    >
      <span className="truncate">{label}</span>
      <span className="w-3 h-3 shrink-0"><Chevron open={false} /></span>
    </button>
  );
}

function AddButton() {
  return (
    <button
      aria-label="Добавить"
      className="w-[96px] h-[39px] flex items-center justify-center bg-white rounded-btn hover:bg-cardbg/40 transition-colors"
    >
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
        <line x1="10" y1="3" x2="10" y2="17" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="10" x2="17" y2="10" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function ColumnOrder({ mode, onMode }: { mode: "auto" | "manual"; onMode: (m: "auto" | "manual") => void }) {
  const COLUMNS = ["Текст", "Редактировать", "Добавить"];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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
      <div className="bg-white rounded-[0_10px_10px_10px] py-[15px] flex flex-col gap-5">
        <div className="flex items-center justify-between px-[25px] pr-[15px] gap-[15px]">
          <button className="text-[14px] font-bold text-cta">Выделить все</button>
          <div className="flex items-center gap-[10px] px-5 py-[5px] bg-mainbg rounded-btn flex-1 max-w-[373px]">
            <span className="w-[15px] h-[15px]"><SearchSmall /></span>
            <span className="text-[14px] text-primary/60">Текст</span>
          </div>
        </div>

        <div className="flex justify-between pl-[40px] pr-[15px] gap-[10px]">
          <div className="flex flex-col gap-[15px] flex-1 max-w-[456px]">
            {COLUMNS.map((c) => (
              <div key={c} className="flex items-center justify-between h-[41px] px-5 bg-mainbg rounded-btn">
                <button
                  onClick={() => setChecked((p) => ({ ...p, [c]: !p[c] }))}
                  className="flex items-center gap-[15px]"
                >
                  <span
                    className={cn(
                      "w-[23px] h-[23px] rounded-[5px] border-2 border-primary flex items-center justify-center",
                      checked[c] && "bg-primary"
                    )}
                  >
                    {checked[c] && (
                      <svg viewBox="0 0 16 16" className="w-3 h-3"><path d="M3 8 L7 12 L13 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <span className="text-[18px] text-primary">{c}</span>
                </button>
                <div className="flex items-center gap-[15px]">
                  <span className="w-5 h-5"><DragVert /></span>
                  <IconButton label="Редактировать"><EditIcon /></IconButton>
                  <IconButton label="Удалить"><TrashIcon /></IconButton>
                </div>
              </div>
            ))}
          </div>
          {/* scrollbar track */}
          <div className="w-[7px] bg-mainbg rounded-[5px] flex justify-center">
            <div className="w-[7px] h-[29px] bg-cardbg rounded-[5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function WidthSegmented() {
  const OPTS = ["Узкая", "Средняя", "Широкая"];
  const [active, setActive] = useState("Узкая");
  return (
    <div className="flex">
      {OPTS.map((o, i) => (
        <button
          key={o}
          onClick={() => setActive(o)}
          className={cn(
            "h-[41px] px-5 flex items-center text-[18px] font-medium text-primary bg-cardbg border-r border-white",
            i === 0 && "rounded-l-btn",
            i === OPTS.length - 1 && "rounded-r-btn border-r-0",
            active === o && "border-2 border-cta text-cta z-10"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PageStyleSegmented() {
  const OPTS = ["Полная", "Карточки", "Список", "Сетка"];
  const [active, setActive] = useState("Карточки");
  return (
    <div className="flex">
      {OPTS.map((o, i) => (
        <button
          key={o}
          onClick={() => setActive(o)}
          className={cn(
            "h-[38px] px-[27px] flex items-center justify-center text-[16px] font-medium text-primary bg-cardbg border-r border-white box-border whitespace-nowrap",
            i === 0 && "rounded-l-btn",
            i === OPTS.length - 1 && "rounded-r-btn border-r-0",
            active === o && "border-2 border-cta z-10"
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
          <span className="shrink-0 opacity-50"><DragVert /></span>
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

function DragDots() {
  return (
    <svg viewBox="0 0 13 21" fill="none" className="w-[13px] h-[20px]">
      {[5, 10, 15].map((y) => (
        <g key={y}>
          <circle cx="4" cy={y} r="2" fill="#00205F" />
          <circle cx="9" cy={y} r="2" fill="#00205F" />
        </g>
      ))}
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

function SearchSmall() {
  return (
    <svg viewBox="0 0 15 15" fill="none" className="w-full h-full">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="#00205F" strokeWidth="1.6" />
      <line x1="10" y1="10" x2="14" y2="14" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
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
