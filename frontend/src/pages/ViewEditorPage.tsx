import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { ViewNavPanel, type NavSection } from "@/components/layout/ViewNavPanel";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { usePages, useUpdatePage } from "@/shared/hooks/useViews";

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

export function ViewEditorPage() {
  const [railModule, setRailModule] = useState<RailModule>("constructor");
  const [activeView, setActiveView] = useState<string>("");
  const [editorTab, setEditorTab] = useState("Представления");

  const [name, setName] = useState("");
  const [viewType, setViewType] = useState<ViewType>("table");
  const [position, setPosition] = useState("первый");
  const [colMode, setColMode] = useState<"auto" | "manual">("manual");
  const [quickEdit, setQuickEdit] = useState(true);
  const [paramsOpen, setParamsOpen] = useState(true);

  const appsQuery = useApps();
  const appId = appsQuery.data?.items[0]?.id;
  const pagesQuery = usePages(appId);
  const pages = pagesQuery.data ?? [];
  const updatePageMutation = useUpdatePage(appId ?? "");

  // Set initial active view and name when pages load
  useEffect(() => {
    if (pages.length > 0 && !activeView) {
      setActiveView(pages[0].id);
      setName(pages[0].title);
    }
  }, [pages, activeView]);

  // Update name when active view changes
  useEffect(() => {
    const page = pages.find((p) => p.id === activeView);
    if (page) setName(page.title);
  }, [activeView, pages]);

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

  if (pagesQuery.isLoading) {
    return (
      <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex items-center justify-center">
        <span className="text-[20px] text-primary">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />
      <ViewNavPanel
        sections={navSections}
        activeViewId={activeView}
        onSelect={setActiveView}
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
        <button
          className="absolute flex items-center justify-center gap-[10px] px-5 py-[5px]
                     border-2 border-primary rounded-[20px] text-meta font-semibold text-primary
                     hover:bg-cardbg/40 transition-colors"
          style={{ left: 744, top: 10.5, height: 34 }}
        >
          Предпросмотр
        </button>
      </div>

      {/* ── Editor scroll panel ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-y-auto"
        style={{ left: 380, top: 130, width: 945, height: 945 }}
      >
        <div className="flex flex-col gap-[30px] pt-[53px] pb-[40px]">
          {/* Название */}
          <FieldRow title="Название" desc="Уникальное название для этого представления.">
            <div className="w-[538px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                className="w-full bg-transparent text-[18px] text-primary outline-none placeholder:text-primary/40"
                placeholder="Текст"
              />
            </div>
          </FieldRow>

          {/* База данных */}
          <FieldRow title="База данных" desc="Какая таблица или срез будет отображаться.">
            <div className="flex items-center gap-5 w-[538px]">
              <DropdownPill value={name} className="flex-1" />
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
                  onClick={() => setViewType(t.id)}
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
              /* ── Параметры карточного представления ── */
              <FieldRow title="Стиль страницы" desc="Как отображаются страницы форм." labelWidth={252}>
                <div className="flex flex-col gap-[33px] w-[538px]">
                  <PageStyleSegmented />
                  <CardStyleConfig />
                </div>
              </FieldRow>
            ) : (
              <>
                {/* Порядок столбцов */}
                <FieldRow
                  title="Порядок столбцов"
                  desc="Автоматически или вручную упорядочьте столбцы, отображаемые в представлении."
                  labelWidth={267}
                >
                  <ColumnOrder mode={colMode} onMode={setColMode} />
                </FieldRow>

                {/* Ширина колонки */}
                <FieldRow
                  title="Ширина колонки"
                  desc="Насколько широкими должны быть столбцы? Более узкая ширина позволяет разместить больше данных на экране."
                >
                  <div className="py-[7px]">
                    <WidthSegmented />
                  </div>
                </FieldRow>

                {/* Быстрое редактирование */}
                <FieldRow title="Быстрое редактирование" desc="Разрешить вносить изменения непосредственно в табличное представление.">
                  <div className="py-[7px]">
                    <Toggle on={quickEdit} onChange={() => setQuickEdit((v) => !v)} />
                  </div>
                </FieldRow>
              </>
            )}
          </CollapsibleSection>

          {/* Остальные секции */}
          <SectionDivider title="Отображение" />
          <BehaviorSection />
          <DocumentationSection />
        </div>
      </div>

      <PreviewPanel projectName="Предприятие" />
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
function CardIcon() {
  return (
    <svg viewBox="0 0 39 39" fill="none" className="w-full h-full">
      <rect x="3" y="3" width="33" height="33" rx="4" stroke="currentColor" strokeWidth="3.25" />
      <circle cx="13" cy="13" r="3" fill="currentColor" />
      <path d="M5 30 L15 21 L23 28 L28 24 L34 30" stroke="currentColor" strokeWidth="3.25" strokeLinejoin="round" />
    </svg>
  );
}
