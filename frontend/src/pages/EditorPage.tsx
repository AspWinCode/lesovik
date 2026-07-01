import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { usePage, useUpdatePage } from "@/shared/hooks/useViews";

export const EDITOR_DRAFT_KEY = "lesovik_editor_draft";

const GRID = 20;

type Device = "desktop" | "tablet" | "mobile";
type DraggableId = "heading" | "table" | "buttons";
type PropTab = "basic" | "style" | "events";
type PickerKind = "color" | "gradient" | "image" | null;
type ElementId = "heading" | "table" | "btn-primary" | "btn-secondary" | "btn-danger";

/* ── Design tokens ── */
const PALETTE_PRESETS = [
  "#00205F","#35A7FF","#1E90FF","#0066CC","#003D99",
  "#FF4B4B","#FF8C00","#FFD700","#32CD32","#00CED1",
  "#9B59B6","#E91E63","#795548","#607D8B","#000000",
  "#333333","#666666","#999999","#CCCCCC","#FFFFFF",
];
const GRADIENT_PRESETS = [
  { from: "#35A7FF", to: "#00205F", angle: 135 },
  { from: "#FF4B4B", to: "#FFD700", angle: 90 },
  { from: "#32CD32", to: "#00CED1", angle: 90 },
  { from: "#9B59B6", to: "#E91E63", angle: 135 },
  { from: "#FF8C00", to: "#FFD700", angle: 180 },
  { from: "#000000", to: "#666666", angle: 180 },
];
const GRADIENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const IMAGE_GALLERY = [
  { id: "img1", label: "Природа",    bg: "linear-gradient(135deg,#32CD32,#00CED1)" },
  { id: "img2", label: "Офис",       bg: "linear-gradient(135deg,#607D8B,#333)" },
  { id: "img3", label: "Абстракция", bg: "linear-gradient(135deg,#9B59B6,#E91E63)" },
  { id: "img4", label: "Горы",       bg: "linear-gradient(135deg,#35A7FF,#00205F)" },
  { id: "img5", label: "Город",      bg: "linear-gradient(135deg,#FF8C00,#FFD700)" },
  { id: "img6", label: "Текстура",   bg: "linear-gradient(135deg,#795548,#FFCC80)" },
];
const FONT_FAMILIES = ["Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Playfair Display", "JetBrains Mono"];

const COMPONENT_CATEGORIES = [
  {
    id: "display", label: "Отображение",
    items: [
      { id: "text",    label: "Текст",       icon: <TextIcon /> },
      { id: "image",   label: "Изображение", icon: <ImageIcon /> },
      { id: "table",   label: "Таблица",     icon: <TableIcon /> },
      { id: "chart",   label: "График",      icon: <ChartIcon /> },
    ],
  },
  {
    id: "form", label: "Форма",
    items: [
      { id: "button",   label: "Кнопка",           icon: <ButtonIcon /> },
      { id: "input",    label: "Поле ввода",        icon: <InputIcon /> },
      { id: "checkbox", label: "Чекбокс",           icon: <CheckboxIcon /> },
      { id: "select",   label: "Выпадающий список", icon: <SelectIcon /> },
    ],
  },
  {
    id: "nav", label: "Навигация",
    items: [
      { id: "menu",  label: "Меню",    icon: <MenuIcon /> },
      { id: "tabs",  label: "Вкладки", icon: <TabsIcon /> },
      { id: "link",  label: "Ссылка",  icon: <LinkIcon /> },
    ],
  },
  {
    id: "layout", label: "Макет",
    items: [
      { id: "block", label: "Блок",     icon: <BlockIcon /> },
      { id: "row",   label: "Строка",   icon: <RowIcon /> },
      { id: "grid",  label: "Сетка",    icon: <GridIcon /> },
      { id: "card",  label: "Карточка", icon: <CardIcon /> },
    ],
  },
];

/* ── Per-element state types ── */
interface ElementStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: string;
  letterSpacing: string;
  colorText: string;
  colorBg: string;
  colorBorder: string;
  borderRadius: string;
  shadow: string;
}
interface ElementBasic {
  text: string;
  width: string;
  height: string;
  paddingX: string;
  paddingY: string;
  btnVariant: "primary" | "secondary" | "danger";
  btnSize: "sm" | "md" | "lg";
}
interface ElementEvent {
  onClick: "none" | "navigate" | "submit" | "custom";
  navigateTo: string;
  customJs: string;
  onChange: "none" | "validate" | "custom";
}

const defaultStyle: ElementStyle = {
  fontFamily: "Inter",
  fontSize: "14",
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  textAlign: "left",
  lineHeight: "1.5",
  letterSpacing: "0",
  colorText: "#00205F",
  colorBg: "#FFFFFF",
  colorBorder: "#E2E8F0",
  borderRadius: "6",
  shadow: "none",
};
const defaultBasic: Record<ElementId, ElementBasic> = {
  "heading":      { text: "Заголовок страницы", width: "100%", height: "auto", paddingX: "12", paddingY: "8", btnVariant: "primary", btnSize: "md" },
  "table":        { text: "",                   width: "100%", height: "auto", paddingX: "12", paddingY: "8", btnVariant: "primary", btnSize: "md" },
  "btn-primary":  { text: "Сохранить",          width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "primary", btnSize: "md" },
  "btn-secondary":{ text: "Отмена",             width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "secondary", btnSize: "md" },
  "btn-danger":   { text: "Удалить",            width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "danger", btnSize: "md" },
};
const defaultEvent: ElementEvent = { onClick: "none", navigateTo: "", customJs: "", onChange: "none" };

const ELEMENT_LABELS: Record<ElementId, string> = {
  heading: "Заголовок",
  table: "Таблица",
  "btn-primary": "Кнопка",
  "btn-secondary": "Кнопка",
  "btn-danger": "Кнопка",
};

const DEFAULT_POS: Record<DraggableId, { x: number; y: number }> = {
  heading: { x: 24, y: 24 },
  table:   { x: 24, y: 96 },
  buttons: { x: 24, y: 500 },
};

interface DeviceSnapshot {
  posMap: Record<DraggableId, { x: number; y: number }>;
  styleMap: Record<string, ElementStyle>;
  basicMap: Record<string, ElementBasic>;
  eventMap: Record<string, ElementEvent>;
}

export function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [activeCategory, setActiveCategory] = useState<string>("display");
  const [selectedElement, setSelectedElement] = useState<ElementId | null>("heading");
  const [zoom, setZoom] = useState(100);
  const [device, setDevice] = useState<Device>("desktop");
  const [activePropTab, setActivePropTab] = useState<PropTab>("basic");
  const [search, setSearch] = useState("");
  const [showGrid, setShowGrid] = useState(true);

  /* drag-and-snap */
  const [posMap, setPosMap] = useState<Record<DraggableId, { x: number; y: number }>>(DEFAULT_POS);
  const [dragState, setDragState] = useState<{
    id: DraggableId;
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [snapGuide, setSnapGuide] = useState<{ x: number; y: number } | null>(null);

  /* per-element state maps */
  const [styleMap, setStyleMap] = useState<Record<string, ElementStyle>>({});
  const [basicMap, setBasicMap] = useState<Record<string, ElementBasic>>({});
  const [eventMap, setEventMap] = useState<Record<string, ElementEvent>>({});

  /* backend state */
  const appsQuery = useApps();
  const apps = appsQuery.data?.items ?? [];
  const activeApp = useActiveApp(apps);
  const appId = searchParams.get("app") ?? activeApp?.id;
  const pageId = searchParams.get("page") ?? undefined;
  const pageQuery = usePage(appId, pageId);
  const updatePageMutation = useUpdatePage(appId ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breakpointsRef = useRef<Record<string, unknown>>({});

  /* Load page breakpoints on mount */
  useEffect(() => {
    if (!pageQuery.data) return;
    const bp = (pageQuery.data.breakpoints ?? {}) as Record<string, unknown>;
    breakpointsRef.current = bp;
    const snap = bp[device] as DeviceSnapshot | undefined;
    if (snap) {
      setPosMap(snap.posMap ?? DEFAULT_POS);
      setStyleMap(snap.styleMap ?? {});
      setBasicMap(snap.basicMap ?? {});
      setEventMap(snap.eventMap ?? {});
    }
  // Only run when page first loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageQuery.data?.id]);

  /* Switch device: save current state, load new device state */
  function switchDevice(newDevice: Device) {
    if (!pageId || !appId) { setDevice(newDevice); return; }
    const snapshot: DeviceSnapshot = { posMap, styleMap, basicMap, eventMap };
    const updated = { ...breakpointsRef.current, [device]: snapshot };
    breakpointsRef.current = updated;
    updatePageMutation.mutate({ pageId, body: { breakpoints: updated } });
    const next = updated[newDevice] as DeviceSnapshot | undefined;
    if (next) {
      setPosMap(next.posMap ?? DEFAULT_POS);
      setStyleMap(next.styleMap ?? {});
      setBasicMap(next.basicMap ?? {});
      setEventMap(next.eventMap ?? {});
    } else {
      setPosMap(DEFAULT_POS);
      setStyleMap({});
      setBasicMap({});
      setEventMap({});
    }
    setDevice(newDevice);
  }

  /* Debounced save after element edits */
  function scheduleSave() {
    if (!pageId || !appId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const snapshot: DeviceSnapshot = { posMap, styleMap, basicMap, eventMap };
      const updated = { ...breakpointsRef.current, [device]: snapshot };
      breakpointsRef.current = updated;
      updatePageMutation.mutate({ pageId, body: { breakpoints: updated } });
    }, 1000);
  }

  function getStyle(id: ElementId): ElementStyle { return styleMap[id] ?? { ...defaultStyle }; }
  function getBasic(id: ElementId): ElementBasic { return basicMap[id] ?? { ...defaultBasic[id] }; }
  function getEvent(id: ElementId): ElementEvent { return eventMap[id] ?? { ...defaultEvent }; }

  function patchStyle(id: ElementId, patch: Partial<ElementStyle>) {
    setStyleMap((m) => ({ ...m, [id]: { ...getStyle(id), ...patch } }));
    scheduleSave();
  }
  function patchBasic(id: ElementId, patch: Partial<ElementBasic>) {
    setBasicMap((m) => ({ ...m, [id]: { ...getBasic(id), ...patch } }));
    scheduleSave();
  }
  function patchEvent(id: ElementId, patch: Partial<ElementEvent>) {
    setEventMap((m) => ({ ...m, [id]: { ...getEvent(id), ...patch } }));
    scheduleSave();
  }

  const snap = useCallback((v: number) => Math.round(v / GRID) * GRID, []);

  function onDragStart(id: DraggableId, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const pos = posMap[id];
    setDragState({ id, startMouseX: e.clientX, startMouseY: e.clientY, origX: pos.x, origY: pos.y });
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragState) return;
    const scale = zoom / 100;
    const dx = (e.clientX - dragState.startMouseX) / scale;
    const dy = (e.clientY - dragState.startMouseY) / scale;
    const newX = Math.max(0, snap(dragState.origX + dx));
    const newY = Math.max(0, snap(dragState.origY + dy));
    setSnapGuide({ x: newX, y: newY });
    setPosMap((m) => ({ ...m, [dragState.id]: { x: newX, y: newY } }));
  }

  function onCanvasMouseUp() {
    if (dragState) scheduleSave();
    setDragState(null);
    setSnapGuide(null);
  }

  function openPreview() {
    const allIds: ElementId[] = ["heading", "table", "btn-primary", "btn-secondary", "btn-danger"];
    const draft = {
      basicMap: Object.fromEntries(allIds.map((id) => [id, getBasic(id)])),
      styleMap: Object.fromEntries(allIds.map((id) => [id, getStyle(id)])),
      eventMap: Object.fromEntries(allIds.map((id) => [id, getEvent(id)])),
    };
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(draft));
    navigate("/preview");
  }

  /* color picker */
  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerTarget, setPickerTarget] = useState<keyof ElementStyle>("colorText");
  const [gradFrom, setGradFrom] = useState("#35A7FF");
  const [gradTo,   setGradTo]   = useState("#00205F");
  const [gradAngle, setGradAngle] = useState(135);
  const [gradType, setGradType] = useState<"linear" | "radial">("linear");
  const [imgTab, setImgTab] = useState<"gallery" | "url" | "upload">("gallery");
  const [imgUrl, setImgUrl] = useState("");
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const deviceSizes: Record<Device, { w: number; h: number }> = {
    desktop: { w: 800, h: 600 },
    tablet:  { w: 540, h: 720 },
    mobile:  { w: 320, h: 568 },
  };
  const { w: canvasW, h: canvasH } = deviceSizes[device];

  const sel = selectedElement;
  const selStyle = sel ? getStyle(sel) : null;
  const selBasic = sel ? getBasic(sel) : null;
  const selEvent = sel ? getEvent(sel) : null;
  const isButton = sel === "btn-primary" || sel === "btn-secondary" || sel === "btn-danger";

  function selectEl(id: ElementId) {
    setSelectedElement(id);
    setActivePropTab("basic");
    setPicker(null);
  }

  /* canvas button renderer */
  function canvasBtn(id: ElementId) {
    const b = getBasic(id);
    const isSelected = selectedElement === id;
    const sizeClass = b.btnSize === "sm" ? "px-3 py-1 text-[12px]" : b.btnSize === "lg" ? "px-6 py-3 text-[15px]" : "px-4 py-2 text-[13px]";
    const variantClass =
      b.btnVariant === "primary"   ? "bg-cta text-white hover:bg-active" :
      b.btnVariant === "secondary" ? "border border-cardbg text-primary hover:bg-mainbg" :
                                     "bg-[#DC2626] text-white hover:bg-[#B91C1C]";
    const ringClass = isSelected
      ? b.btnVariant === "secondary" ? "ring-2 ring-cta" : "ring-2 ring-cta ring-offset-2"
      : "hover:ring-1 hover:ring-cta/40";

    return (
      <button
        key={id}
        onClick={() => selectEl(id)}
        className={cn("rounded-[6px] font-medium cursor-pointer transition-colors", sizeClass, variantClass, ringClass)}
      >
        {b.text}
      </button>
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sidebar: Component List ── */}
      <aside className="absolute bg-white border-r border-cardbg overflow-y-auto" style={{ left: 85, top: 70, width: 295, height: 1010 }}>
        <div className="px-4 py-3 border-b border-cardbg">
          <p className="text-[16px] font-semibold text-primary mb-2">Компоненты</p>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск компонентов…"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary placeholder:text-primary/40 focus:outline-none focus:border-cta"
            />
          </div>
        </div>
        <div className="py-2">
          {COMPONENT_CATEGORIES.map((cat) => {
            const filtered = search
              ? cat.items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
              : cat.items;
            if (search && filtered.length === 0) return null;
            const expanded = activeCategory === cat.id || !!search;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => setActiveCategory(expanded && !search ? "" : cat.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-semibold text-primary hover:bg-mainbg transition-colors"
                >
                  <span>{cat.label}</span>
                  <ChevronIcon className={cn("w-4 h-4 transition-transform", expanded ? "rotate-180" : "")} />
                </button>
                {expanded && (
                  <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        draggable
                        className="flex flex-col items-center justify-center gap-1 w-[60px] h-[60px] mx-auto rounded-[8px] border border-cardbg bg-mainbg hover:border-cta hover:bg-[#EBF4FF] transition-colors cursor-grab"
                        title={item.label}
                      >
                        <span className="w-6 h-6 text-primary/60">{item.icon}</span>
                        <span className="text-[10px] text-primary/70 text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Canvas ── */}
      <main className="absolute overflow-hidden flex flex-col" style={{ left: 380, top: 70, width: 1255, height: 1010 }}>
        {/* toolbar */}
        <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-cardbg shrink-0">
          <div className="flex items-center gap-2">
            <ToolbarBtn title="Отменить" onClick={() => {}}><UndoIcon className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Повторить" onClick={() => {}}><RedoIcon className="w-4 h-4" /></ToolbarBtn>
            <div className="w-px h-5 bg-cardbg mx-1" />
            <div className="flex items-center gap-1 bg-mainbg rounded-[6px] px-2 py-1">
              <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="text-primary/60 hover:text-primary px-1 text-[13px]">−</button>
              <span className="text-[13px] text-primary w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="text-primary/60 hover:text-primary px-1 text-[13px]">+</button>
            </div>
            <div className="w-px h-5 bg-cardbg" />
            <button
              onClick={() => setShowGrid((v) => !v)}
              title={showGrid ? "Скрыть сетку" : "Показать сетку"}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] transition-colors", showGrid ? "bg-cta/10 text-cta" : "text-primary/50 hover:text-primary hover:bg-mainbg")}
            >
              <GridIcon className="w-4 h-4" />
              Сетка
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-mainbg rounded-[6px] p-1">
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                <button
                  key={d}
                  onClick={() => switchDevice(d)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] transition-colors",
                    device === d ? "bg-white text-cta shadow-sm font-medium" : "text-primary/60 hover:text-primary"
                  )}
                >
                  {d === "desktop" && <DesktopIcon className="w-4 h-4" />}
                  {d === "tablet"  && <TabletIcon  className="w-4 h-4" />}
                  {d === "mobile"  && <MobileIcon  className="w-4 h-4" />}
                  {d === "desktop" ? "Десктоп" : d === "tablet" ? "Планшет" : "Мобильный"}
                </button>
              ))}
            </div>
            <button
              onClick={openPreview}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-cta text-white text-[13px] font-medium hover:bg-active transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <polygon points="3,2 13,8 3,14" fill="currentColor" />
              </svg>
              Предпросмотр
            </button>
          </div>
        </div>

        {/* workspace */}
        <div
          className="flex-1 bg-[#F5F6F8] overflow-auto relative select-none"
          style={showGrid ? { backgroundImage: "radial-gradient(circle, #c8cdd6 1.5px, transparent 1.5px)", backgroundSize: `${GRID}px ${GRID}px` } : undefined}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ minWidth: canvasW + 120, minHeight: canvasH + 120 }}>
            <div
              className="bg-white shadow-xl rounded-[4px] relative overflow-hidden"
              style={{ width: canvasW, height: canvasH, transform: `scale(${zoom / 100})`, transformOrigin: "center center", cursor: dragState ? "grabbing" : "default" }}
            >
              {/* snap guides overlay */}
              {dragState && snapGuide && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  <div className="absolute left-0 right-0" style={{ top: snapGuide.y, borderTop: "1.5px dashed #35A7FF" }} />
                  <div className="absolute top-0 bottom-0" style={{ left: snapGuide.x, borderLeft: "1.5px dashed #35A7FF" }} />
                  <div
                    className="absolute bg-cta text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm leading-none"
                    style={{ left: snapGuide.x + 6, top: snapGuide.y + 6 }}
                  >
                    {snapGuide.x}, {snapGuide.y}
                  </div>
                </div>
              )}

              {/* Heading */}
              <div
                className={cn("absolute h-10 flex items-center group rounded-[4px]", selectedElement === "heading" ? "ring-2 ring-cta" : "hover:ring-1 hover:ring-cta/40")}
                style={{ left: posMap.heading.x, top: posMap.heading.y, right: 24 }}
                onClick={() => selectEl("heading")}
              >
                <div
                  onMouseDown={(e) => onDragStart("heading", e)}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab text-primary/50 z-10"
                  title="Перетащить"
                >
                  <DragDots />
                </div>
                <span className="px-3 text-[20px] font-bold text-primary">{getBasic("heading").text}</span>
              </div>

              {/* Table */}
              <div
                className={cn("absolute group rounded-[4px]", selectedElement === "table" ? "ring-2 ring-cta" : "hover:ring-1 hover:ring-cta/40")}
                style={{ left: posMap.table.x, top: posMap.table.y, right: 24 }}
                onClick={() => selectEl("table")}
              >
                <div
                  onMouseDown={(e) => onDragStart("table", e)}
                  className="absolute -left-5 top-2 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab text-primary/50 z-10"
                  title="Перетащить"
                >
                  <DragDots />
                </div>
                <div className="bg-[#F5F6F8] rounded-t-[4px] grid grid-cols-4 border border-cardbg">
                  {["Название", "Статус", "Дата", "Пользователь"].map((h) => (
                    <div key={h} className="px-3 py-2 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{h}</div>
                  ))}
                </div>
                {[1, 2, 3].map((r) => (
                  <div key={r} className="grid grid-cols-4 border-x border-b border-cardbg last:rounded-b-[4px]">
                    {["Запись " + r, "Активна", "2024-0" + r + "-01", "user@app.ru"].map((c, i) => (
                      <div key={i} className="px-3 py-2 text-[12px] text-primary/70 border-r last:border-r-0 border-cardbg">{c}</div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div
                className="absolute group flex flex-wrap gap-3"
                style={{ left: posMap.buttons.x, top: posMap.buttons.y }}
              >
                <div
                  onMouseDown={(e) => onDragStart("buttons", e)}
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab text-primary/50 z-10"
                  title="Перетащить"
                >
                  <DragDots />
                </div>
                {canvasBtn("btn-primary")}
                {canvasBtn("btn-secondary")}
                {canvasBtn("btn-danger")}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right Panel ── */}
      <aside className="absolute bg-white border-l border-cardbg overflow-y-auto" style={{ right: 0, top: 70, width: 285, height: 1010 }}>
        <div className="px-4 py-3 border-b border-cardbg">
          <p className="text-[16px] font-semibold text-primary">Свойства</p>
          {sel && <p className="text-[12px] text-primary/50 mt-0.5">{ELEMENT_LABELS[sel]}</p>}
        </div>

        {/* tabs */}
        <div className="flex border-b border-cardbg">
          {(["basic", "style", "events"] as PropTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePropTab(tab)}
              className={cn(
                "flex-1 py-2 text-[13px] transition-colors",
                activePropTab === tab ? "text-cta border-b-2 border-cta font-medium" : "text-primary/60 hover:text-primary"
              )}
            >
              {tab === "basic" ? "Основные" : tab === "style" ? "Стиль" : "События"}
            </button>
          ))}
        </div>

        {/* ── BASIC ── */}
        {activePropTab === "basic" && sel && selBasic && (
          <div className="p-4 flex flex-col gap-4">
            {/* Text content */}
            {(sel === "heading" || isButton) && (
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Текст</label>
                <input
                  value={selBasic.text}
                  onChange={(e) => patchBasic(sel, { text: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
            )}

            {/* Button variant + size */}
            {isButton && (
              <>
                <div>
                  <label className="block text-[12px] text-primary/60 mb-1.5">Вариант</label>
                  <div className="flex gap-1.5">
                    {(["primary", "secondary", "danger"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => patchBasic(sel, { btnVariant: v })}
                        className={cn(
                          "flex-1 py-1.5 rounded-[6px] text-[12px] font-medium border transition-colors",
                          selBasic.btnVariant === v ? "border-cta bg-cta/10 text-cta" : "border-cardbg text-primary/60 hover:border-cta/40"
                        )}
                      >
                        {v === "primary" ? "Основная" : v === "secondary" ? "Второст." : "Удалить"}
                      </button>
                    ))}
                  </div>
                  {/* preview */}
                  <div className="mt-2">
                    <button className={cn(
                      "w-full py-1.5 rounded-[6px] text-[12px] font-medium pointer-events-none",
                      selBasic.btnVariant === "primary"   ? "bg-cta text-white" :
                      selBasic.btnVariant === "secondary" ? "border border-cardbg text-primary" :
                                                            "bg-[#DC2626] text-white"
                    )}>
                      {selBasic.text || "Кнопка"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] text-primary/60 mb-1.5">Размер</label>
                  <div className="flex gap-1.5">
                    {(["sm", "md", "lg"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchBasic(sel, { btnSize: s })}
                        className={cn(
                          "flex-1 py-1.5 rounded-[6px] text-[12px] border transition-colors",
                          selBasic.btnSize === s ? "border-cta bg-cta/10 text-cta font-medium" : "border-cardbg text-primary/60 hover:border-cta/40"
                        )}
                      >
                        {s === "sm" ? "Малый" : s === "md" ? "Средний" : "Большой"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Table: data source */}
            {sel === "table" && (
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Источник данных</label>
                <select className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta">
                  <option>— не выбрано —</option>
                  <option>users</option>
                  <option>orders</option>
                  <option>products</option>
                </select>
              </div>
            )}

            {/* Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Ширина</label>
                <input value={selBasic.width} onChange={(e) => patchBasic(sel, { width: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Высота</label>
                <input value={selBasic.height} onChange={(e) => patchBasic(sel, { height: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Отступ X (px)</label>
                <input value={selBasic.paddingX} onChange={(e) => patchBasic(sel, { paddingX: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Отступ Y (px)</label>
                <input value={selBasic.paddingY} onChange={(e) => patchBasic(sel, { paddingY: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
            </div>
          </div>
        )}

        {/* ── STYLE ── */}
        {activePropTab === "style" && sel && selStyle && (
          <div className="p-4 flex flex-col gap-4">
            {/* Font family */}
            <div>
              <label className="block text-[12px] text-primary/60 mb-1">Шрифт</label>
              <select
                value={selStyle.fontFamily}
                onChange={(e) => patchStyle(sel, { fontFamily: e.target.value })}
                className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
              >
                {FONT_FAMILIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* Size + line-height */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Размер (px)</label>
                <input
                  type="number"
                  value={selStyle.fontSize}
                  onChange={(e) => patchStyle(sel, { fontSize: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Межстрочный</label>
                <input
                  type="number" step="0.1"
                  value={selStyle.lineHeight}
                  onChange={(e) => patchStyle(sel, { lineHeight: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
            </div>

            {/* Letter spacing */}
            <div>
              <label className="block text-[12px] text-primary/60 mb-1">Трекинг (px)</label>
              <input
                type="number" step="0.5"
                value={selStyle.letterSpacing}
                onChange={(e) => patchStyle(sel, { letterSpacing: e.target.value })}
                className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
              />
            </div>

            {/* Bold / Italic / Underline */}
            <div>
              <label className="block text-[12px] text-primary/60 mb-1.5">Начертание</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => patchStyle(sel, { fontWeight: selStyle.fontWeight === "bold" ? "normal" : "bold" })}
                  className={cn("w-9 h-9 rounded-[6px] border text-[14px] font-bold transition-colors",
                    selStyle.fontWeight === "bold" ? "border-cta bg-cta/10 text-cta" : "border-cardbg text-primary/60 hover:border-cta/40")}
                  title="Жирный"
                >B</button>
                <button
                  onClick={() => patchStyle(sel, { fontStyle: selStyle.fontStyle === "italic" ? "normal" : "italic" })}
                  className={cn("w-9 h-9 rounded-[6px] border text-[14px] italic transition-colors",
                    selStyle.fontStyle === "italic" ? "border-cta bg-cta/10 text-cta" : "border-cardbg text-primary/60 hover:border-cta/40")}
                  title="Курсив"
                >I</button>
                <button
                  onClick={() => patchStyle(sel, { textDecoration: selStyle.textDecoration === "underline" ? "none" : "underline" })}
                  className={cn("w-9 h-9 rounded-[6px] border text-[14px] underline transition-colors",
                    selStyle.textDecoration === "underline" ? "border-cta bg-cta/10 text-cta" : "border-cardbg text-primary/60 hover:border-cta/40")}
                  title="Подчёркнутый"
                >U</button>
              </div>
            </div>

            {/* Text alignment */}
            <div>
              <label className="block text-[12px] text-primary/60 mb-1.5">Выравнивание</label>
              <div className="flex gap-1.5">
                {(["left", "center", "right", "justify"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => patchStyle(sel, { textAlign: a })}
                    className={cn("w-9 h-9 rounded-[6px] border flex items-center justify-center transition-colors",
                      selStyle.textAlign === a ? "border-cta bg-cta/10 text-cta" : "border-cardbg text-primary/60 hover:border-cta/40")}
                    title={a === "left" ? "Лево" : a === "center" ? "Центр" : a === "right" ? "Право" : "По ширине"}
                  >
                    <AlignIcon align={a} />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-cardbg" />

            {/* Color fields */}
            {([
              { label: "Цвет текста", key: "colorText" as const },
              { label: "Фон",         key: "colorBg"   as const },
              { label: "Граница",     key: "colorBorder" as const },
            ]).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPickerTarget(key); setPicker(picker === "color" && pickerTarget === key ? null : "color"); }}
                    className={cn("w-7 h-7 rounded-[4px] border-2 shrink-0 transition-all",
                      picker === "color" && pickerTarget === key ? "border-cta scale-110" : "border-cardbg")}
                    style={{ background: selStyle[key] }}
                  />
                  <input
                    value={selStyle[key]}
                    onChange={(e) => patchStyle(sel, { [key]: e.target.value })}
                    maxLength={7}
                    className="flex-1 px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta font-mono"
                  />
                </div>
              </div>
            ))}

            {/* Border radius + shadow */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Радиус (px)</label>
                <input
                  type="number"
                  value={selStyle.borderRadius}
                  onChange={(e) => patchStyle(sel, { borderRadius: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Тень</label>
                <select
                  value={selStyle.shadow}
                  onChange={(e) => patchStyle(sel, { shadow: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                >
                  <option value="none">Нет</option>
                  <option value="sm">Малая</option>
                  <option value="md">Средняя</option>
                  <option value="lg">Большая</option>
                  <option value="xl">XL</option>
                </select>
              </div>
            </div>

            {/* Gradient shortcut */}
            <button
              onClick={() => setPicker(picker === "gradient" ? null : "gradient")}
              className={cn("w-full py-2 rounded-[6px] border text-[12px] font-medium transition-colors",
                picker === "gradient" ? "border-cta text-cta bg-cta/5" : "border-cardbg text-primary/60 hover:border-cta/50 hover:text-primary")}
            >
              Градиент фона
            </button>
          </div>
        )}

        {/* ── EVENTS ── */}
        {activePropTab === "events" && sel && selEvent && (
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="block text-[12px] text-primary/60 mb-1.5">
                <span className="font-mono text-[11px] bg-mainbg px-1.5 py-0.5 rounded text-cta">onClick</span>
              </label>
              <select
                value={selEvent.onClick}
                onChange={(e) => patchEvent(sel, { onClick: e.target.value as ElementEvent["onClick"] })}
                className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
              >
                <option value="none">— не задано —</option>
                <option value="navigate">Перейти на страницу</option>
                <option value="submit">Отправить форму</option>
                <option value="custom">Пользовательский JS</option>
              </select>

              {selEvent.onClick === "navigate" && (
                <div className="mt-2">
                  <label className="block text-[12px] text-primary/60 mb-1">URL / путь</label>
                  <input
                    value={selEvent.navigateTo}
                    onChange={(e) => patchEvent(sel, { navigateTo: e.target.value })}
                    placeholder="/страница или https://…"
                    className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                  />
                </div>
              )}
              {selEvent.onClick === "custom" && (
                <div className="mt-2">
                  <label className="block text-[12px] text-primary/60 mb-1">JavaScript</label>
                  <textarea
                    value={selEvent.customJs}
                    onChange={(e) => patchEvent(sel, { customJs: e.target.value })}
                    placeholder={"alert('Привет!')"}
                    rows={4}
                    className="w-full px-3 py-2 text-[12px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta font-mono resize-none"
                  />
                </div>
              )}
            </div>

            {!isButton && (
              <div>
                <label className="block text-[12px] text-primary/60 mb-1.5">
                  <span className="font-mono text-[11px] bg-mainbg px-1.5 py-0.5 rounded text-cta">onChange</span>
                </label>
                <select
                  value={selEvent.onChange}
                  onChange={(e) => patchEvent(sel, { onChange: e.target.value as ElementEvent["onChange"] })}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                >
                  <option value="none">— не задано —</option>
                  <option value="validate">Валидация поля</option>
                  <option value="custom">Пользовательский JS</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-t border-cardbg">
              <span className="font-mono text-[11px] bg-mainbg px-1.5 py-0.5 rounded text-primary/50">onHover</span>
              <span className="text-[12px] text-primary/40">— не задано —</span>
            </div>
          </div>
        )}

        {!sel && (
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-center mt-8">
            <div className="w-12 h-12 rounded-full bg-mainbg flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary/30">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[13px] text-primary/50">Выберите элемент на холсте</p>
          </div>
        )}

        {/* ── Color Picker ── */}
        {picker === "color" && sel && selStyle && (
          <div className="absolute right-[285px] top-[220px] z-50 w-[240px] bg-white rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-cardbg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-primary">
                {pickerTarget === "colorText" ? "Цвет текста" : pickerTarget === "colorBg" ? "Фон" : "Граница"}
              </span>
              <button onClick={() => setPicker(null)} className="text-primary/40 hover:text-primary text-[16px] leading-none">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[4px] border border-cardbg shrink-0" style={{ background: selStyle[pickerTarget] }} />
              <input
                value={selStyle[pickerTarget]}
                onChange={(e) => patchStyle(sel, { [pickerTarget]: e.target.value })}
                maxLength={7}
                className="flex-1 px-2 py-1.5 text-[13px] rounded-[4px] border border-cardbg bg-mainbg text-primary font-mono focus:outline-none focus:border-cta"
              />
            </div>
            <div>
              <label className="text-[11px] text-primary/50 mb-1 block">Прозрачность</label>
              <input type="range" min={0} max={100} defaultValue={100} className="w-full accent-cta h-1.5" />
            </div>
            <div className="grid grid-cols-10 gap-1">
              {PALETTE_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => patchStyle(sel, { [pickerTarget]: c })}
                  className={cn("w-[18px] h-[18px] rounded-[3px] border transition-transform hover:scale-110",
                    selStyle[pickerTarget] === c ? "border-cta scale-110" : "border-cardbg")}
                  style={{ background: c }} title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Gradient Picker ── */}
        {picker === "gradient" && sel && selStyle && (
          <div className="absolute right-[285px] top-[220px] z-50 w-[280px] bg-white rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-cardbg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-primary">Градиент</span>
              <button onClick={() => setPicker(null)} className="text-primary/40 hover:text-primary text-[16px] leading-none">✕</button>
            </div>
            <div className="w-full h-8 rounded-[6px] border border-cardbg" style={{
              background: gradType === "linear"
                ? `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`
                : `radial-gradient(circle, ${gradFrom}, ${gradTo})`
            }} />
            <div className="flex bg-mainbg rounded-[6px] p-0.5 gap-0.5">
              {(["linear", "radial"] as const).map((t) => (
                <button key={t} onClick={() => setGradType(t)}
                  className={cn("flex-1 py-1 text-[12px] rounded-[4px] transition-colors",
                    gradType === t ? "bg-white text-cta shadow-sm font-medium" : "text-primary/60")}>
                  {t === "linear" ? "Линейный" : "Радиальный"}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {([["Начало", gradFrom, setGradFrom], ["Конец", gradTo, setGradTo]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                <div key={lbl} className="flex-1">
                  <label className="text-[11px] text-primary/50 mb-1 block">{lbl}</label>
                  <div className="flex items-center gap-1">
                    <input type="color" value={val} onChange={(e) => set(e.target.value)} className="w-7 h-7 rounded-[3px] border-none cursor-pointer" />
                    <input value={val} onChange={(e) => set(e.target.value)} maxLength={7}
                      className="flex-1 px-2 py-1 text-[11px] rounded-[4px] border border-cardbg bg-mainbg font-mono focus:outline-none focus:border-cta" />
                  </div>
                </div>
              ))}
            </div>
            {gradType === "linear" && (
              <div>
                <label className="text-[11px] text-primary/50 mb-1 block">Угол: {gradAngle}°</label>
                <div className="grid grid-cols-8 gap-1">
                  {GRADIENT_ANGLES.map((a) => (
                    <button key={a} onClick={() => setGradAngle(a)}
                      className={cn("w-6 h-6 rounded-[4px] border text-[10px] flex items-center justify-center transition-colors",
                        gradAngle === a ? "border-cta bg-cta/10 text-cta font-bold" : "border-cardbg text-primary/50 hover:border-cta/50")}>
                      {a}°
                    </button>
                  ))}
                </div>
                <input type="range" min={0} max={360} value={gradAngle} onChange={(e) => setGradAngle(Number(e.target.value))} className="w-full mt-2 accent-cta h-1.5" />
              </div>
            )}
            <div>
              <label className="text-[11px] text-primary/50 mb-1.5 block">Пресеты</label>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADIENT_PRESETS.map((g, i) => (
                  <button key={i} onClick={() => { setGradFrom(g.from); setGradTo(g.to); setGradAngle(g.angle); }}
                    className="w-8 h-8 rounded-[4px] border border-cardbg hover:border-cta transition-colors"
                    style={{ background: `linear-gradient(${g.angle}deg,${g.from},${g.to})` }} />
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                const grad = gradType === "linear"
                  ? `linear-gradient(${gradAngle}deg,${gradFrom},${gradTo})`
                  : `radial-gradient(circle,${gradFrom},${gradTo})`;
                patchStyle(sel, { colorBg: grad });
                setPicker(null);
              }}
              className="w-full py-1.5 bg-cta text-white text-[13px] rounded-[6px] hover:bg-active transition-colors"
            >
              Применить
            </button>
          </div>
        )}

        {/* ── Image Picker ── */}
        {picker === "image" && (
          <div className="absolute right-[285px] top-[150px] z-50 w-[340px] bg-white rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-cardbg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cardbg">
              <span className="text-[14px] font-semibold text-primary">Изображение</span>
              <button onClick={() => setPicker(null)} className="text-primary/40 hover:text-primary text-[16px] leading-none">✕</button>
            </div>
            <div className="flex border-b border-cardbg">
              {(["gallery", "url", "upload"] as const).map((t) => (
                <button key={t} onClick={() => setImgTab(t)}
                  className={cn("flex-1 py-2 text-[12px] transition-colors",
                    imgTab === t ? "text-cta border-b-2 border-cta font-medium" : "text-primary/50 hover:text-primary")}>
                  {t === "gallery" ? "Медиатека" : t === "url" ? "По URL" : "Загрузить"}
                </button>
              ))}
            </div>
            <div className="p-4 flex flex-col gap-3" style={{ minHeight: 220 }}>
              {imgTab === "gallery" && (
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_GALLERY.map((img) => (
                    <button key={img.id} onClick={() => setSelectedImg(img.id)}
                      className={cn("rounded-[6px] overflow-hidden border-2 transition-all",
                        selectedImg === img.id ? "border-cta scale-[1.03]" : "border-transparent hover:border-cta/40")}>
                      <div className="h-16 w-full" style={{ background: img.bg }} />
                      <p className="text-[10px] text-primary/60 py-0.5 text-center bg-mainbg">{img.label}</p>
                    </button>
                  ))}
                </div>
              )}
              {imgTab === "url" && (
                <div className="flex flex-col gap-3">
                  <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://example.com/image.png"
                    className="w-full px-3 py-2 text-[12px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
                  {imgUrl && (
                    <div className="h-28 rounded-[6px] border border-cardbg bg-mainbg flex items-center justify-center overflow-hidden">
                      <img src={imgUrl} alt="preview" className="max-h-full max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>
              )}
              {imgTab === "upload" && (
                <div className="flex-1 rounded-[8px] border-2 border-dashed border-cta/30 hover:border-cta/60 transition-colors flex flex-col items-center justify-center gap-2 py-8 cursor-pointer bg-mainbg">
                  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 text-cta/40">
                    <rect x="5" y="10" width="30" height="22" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 25V15M15 20l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[13px] text-primary/60 text-center">Перетащите файл сюда<br/><span className="text-cta">или нажмите для выбора</span></p>
                  <p className="text-[11px] text-primary/40">PNG, JPG, SVG до 10 МБ</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-cardbg">
              <button onClick={() => setPicker(null)} className="px-4 py-1.5 text-[13px] border border-cta text-cta rounded-[6px] hover:bg-cta/10 transition-colors">Отмена</button>
              <button onClick={() => setPicker(null)} className="px-4 py-1.5 text-[13px] bg-cta text-white rounded-[6px] hover:bg-active transition-colors">Выбрать</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ── Helpers ── */
function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 hover:text-primary hover:bg-mainbg transition-colors">
      {children}
    </button>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" | "justify" }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      {align === "left"    && <><path d="M2 4h12M2 7h8M2 10h10M2 13h6"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
      {align === "center"  && <><path d="M2 4h12M4 7h8M3 10h10M5 13h6"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
      {align === "right"   && <><path d="M2 4h12M6 7h8M4 10h10M8 13h6"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
      {align === "justify" && <><path d="M2 4h12M2 7h12M2 10h12M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}
    </svg>
  );
}

/* ── Icons ── */
const S = "#00205F";
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke={S} strokeWidth="1.5" strokeOpacity="0.4" /><path d="M10.5 10.5l2.5 2.5" stroke={S} strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" /></svg>;
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function UndoIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M3 8a5 5 0 100 0V5M3 5l3 3M3 5l-3 3" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function RedoIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M13 8a5 5 0 110 0V5M13 5l-3 3M13 5l3 3" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DesktopIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function TabletIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="12.5" r="0.75" fill="currentColor" /></svg>;
}
function MobileIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="4" y="1" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="12.5" r="0.75" fill="currentColor" /></svg>;
}
function TextIcon()     { return <svg viewBox="0 0 20 20" fill="none"><path d="M4 5h12M10 5v10M7 15h6" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function ImageIcon()    { return <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke={S} strokeWidth="1.5" /><path d="M3 13l4-4 4 4 2-2 4 3" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="7" r="1.5" fill={S} /></svg>; }
function TableIcon()    { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 7h16M7 7v11" stroke={S} strokeWidth="1.5" /></svg>; }
function ChartIcon()    { return <svg viewBox="0 0 20 20" fill="none"><path d="M3 15l4-5 4 3 4-6" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 17h14" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function ButtonIcon()   { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="8" rx="4" stroke={S} strokeWidth="1.5" /><path d="M8 10h4" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function InputIcon()    { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="6" rx="2" stroke={S} strokeWidth="1.5" /><path d="M5 10h3" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function CheckboxIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke={S} strokeWidth="1.5" /><path d="M6 10l3 3 5-5" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SelectIcon()   { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="6" rx="2" stroke={S} strokeWidth="1.5" /><path d="M14 10l2 2 2-2" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MenuIcon()     { return <svg viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function TabsIcon()     { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="11" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 10h5a1 1 0 001-1V7M8 7h5a1 1 0 011 1v2" stroke={S} strokeWidth="1.5" /></svg>; }
function LinkIcon()     { return <svg viewBox="0 0 20 20" fill="none"><path d="M7 13l6-6M9 7h4v4" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BlockIcon()    { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke={S} strokeWidth="1.5" /></svg>; }
function RowIcon()      { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="7" rx="1.5" stroke={S} strokeWidth="1.5" /><rect x="2" y="11" width="16" height="7" rx="1.5" stroke={S} strokeWidth="1.5" /></svg>; }
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M1 4h14M1 8h14M1 12h14M4 1v14M8 1v14M12 1v14" stroke={S} strokeWidth="1" strokeOpacity="0.7" />
    </svg>
  );
}
function DragDots() {
  return (
    <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-4">
      <circle cx="2.5" cy="3" r="1.5" /><circle cx="7.5" cy="3" r="1.5" />
      <circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" />
      <circle cx="2.5" cy="13" r="1.5" /><circle cx="7.5" cy="13" r="1.5" />
    </svg>
  );
}
function CardIcon()     { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 8h16" stroke={S} strokeWidth="1.5" /></svg>; }
