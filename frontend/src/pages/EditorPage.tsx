import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { cn } from "@/lib/cn";

type Device = "desktop" | "tablet" | "mobile";
type PropTab = "basic" | "style" | "events";

const COMPONENT_CATEGORIES = [
  {
    id: "display",
    label: "Отображение",
    items: [
      { id: "text",    label: "Текст",       icon: <TextIcon /> },
      { id: "image",   label: "Изображение", icon: <ImageIcon /> },
      { id: "table",   label: "Таблица",     icon: <TableIcon /> },
      { id: "chart",   label: "График",      icon: <ChartIcon /> },
    ],
  },
  {
    id: "form",
    label: "Форма",
    items: [
      { id: "button",   label: "Кнопка",          icon: <ButtonIcon /> },
      { id: "input",    label: "Поле ввода",       icon: <InputIcon /> },
      { id: "checkbox", label: "Чекбокс",          icon: <CheckboxIcon /> },
      { id: "select",   label: "Выпадающий список", icon: <SelectIcon /> },
    ],
  },
  {
    id: "nav",
    label: "Навигация",
    items: [
      { id: "menu",  label: "Меню",    icon: <MenuIcon /> },
      { id: "tabs",  label: "Вкладки", icon: <TabsIcon /> },
      { id: "link",  label: "Ссылка",  icon: <LinkIcon /> },
    ],
  },
  {
    id: "layout",
    label: "Макет",
    items: [
      { id: "block", label: "Блок",    icon: <BlockIcon /> },
      { id: "row",   label: "Строка",  icon: <RowIcon /> },
      { id: "grid",  label: "Сетка",   icon: <GridIcon /> },
      { id: "card",  label: "Карточка", icon: <CardIcon /> },
    ],
  },
];

export function EditorPage() {
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [activeCategory, setActiveCategory] = useState<string>("display");
  const [selectedElement, setSelectedElement] = useState<string | null>("heading");
  const [zoom, setZoom] = useState(100);
  const [device, setDevice] = useState<Device>("desktop");
  const [activePropTab, setActivePropTab] = useState<PropTab>("basic");
  const [search, setSearch] = useState("");

  const deviceSizes: Record<Device, { w: number; h: number }> = {
    desktop: { w: 800, h: 600 },
    tablet:  { w: 540, h: 720 },
    mobile:  { w: 320, h: 568 },
  };
  const { w: canvasW, h: canvasH } = deviceSizes[device];

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sidebar: Component List ── */}
      <aside
        className="absolute bg-white border-r border-cardbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
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

      {/* ── Canvas area ── */}
      <main
        className="absolute overflow-hidden flex flex-col"
        style={{ left: 380, top: 70, width: 1255, height: 1010 }}
      >
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-cardbg shrink-0">
          <div className="flex items-center gap-2">
            <ToolbarBtn title="Отменить" onClick={() => {}}>
              <UndoIcon className="w-4 h-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Повторить" onClick={() => {}}>
              <RedoIcon className="w-4 h-4" />
            </ToolbarBtn>
            <div className="w-px h-5 bg-cardbg mx-1" />
            <div className="flex items-center gap-1 bg-mainbg rounded-[6px] px-2 py-1">
              <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="text-primary/60 hover:text-primary px-1 text-[13px]">−</button>
              <span className="text-[13px] text-primary w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="text-primary/60 hover:text-primary px-1 text-[13px]">+</button>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-mainbg rounded-[6px] p-1">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
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
        </div>

        {/* Canvas workspace */}
        <div className="flex-1 bg-[#F5F6F8] overflow-auto relative" style={{ backgroundImage: "radial-gradient(circle, #c8cdd6 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ minWidth: canvasW + 120, minHeight: canvasH + 120 }}>
            <div
              className="bg-white shadow-xl rounded-[4px] relative"
              style={{ width: canvasW, height: canvasH, transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
            >
              {/* Mock canvas elements */}
              <div
                onClick={() => setSelectedElement("heading")}
                className={cn("absolute top-6 left-6 right-6 h-10 flex items-center cursor-pointer rounded-[4px] px-3", selectedElement === "heading" ? "ring-2 ring-cta" : "hover:ring-1 hover:ring-cta/40")}
              >
                <span className="text-[20px] font-bold text-primary">Заголовок страницы</span>
              </div>

              <div
                onClick={() => setSelectedElement("table")}
                className={cn("absolute top-24 left-6 right-6 cursor-pointer rounded-[4px]", selectedElement === "table" ? "ring-2 ring-cta" : "hover:ring-1 hover:ring-cta/40")}
              >
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

              <div className="absolute bottom-6 left-6 flex gap-3">
                <button
                  onClick={() => setSelectedElement("btn-primary")}
                  className={cn("bg-cta text-white text-[13px] font-medium rounded-[6px] px-4 py-2 cursor-pointer", selectedElement === "btn-primary" ? "ring-2 ring-cta ring-offset-2" : "")}
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setSelectedElement("btn-secondary")}
                  className={cn("border border-cardbg text-primary text-[13px] rounded-[6px] px-4 py-2 cursor-pointer", selectedElement === "btn-secondary" ? "ring-2 ring-cta" : "")}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right Panel: Properties ── */}
      <aside
        className="absolute bg-white border-l border-cardbg overflow-y-auto"
        style={{ right: 0, top: 70, width: 285, height: 1010 }}
      >
        <div className="px-4 py-3 border-b border-cardbg">
          <p className="text-[16px] font-semibold text-primary">Свойства</p>
          {selectedElement && (
            <p className="text-[12px] text-primary/50 mt-0.5">
              {selectedElement === "heading" ? "Заголовок" : selectedElement === "table" ? "Таблица" : "Кнопка"}
            </p>
          )}
        </div>

        {/* Prop tabs */}
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

        {activePropTab === "basic" && (
          <div className="p-4 flex flex-col gap-4">
            {[
              { label: "Ширина",   value: "100%" },
              { label: "Высота",   value: "auto" },
              { label: "Отступы",  value: "0" },
              { label: "Фон",      value: "transparent" },
              { label: "Текст",    value: "Заголовок страницы" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <input
                  defaultValue={value}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
            ))}
          </div>
        )}

        {activePropTab === "style" && (
          <div className="p-4 flex flex-col gap-4">
            {[
              { label: "Размер шрифта",  value: "20px" },
              { label: "Жирность",       value: "bold" },
              { label: "Цвет текста",    value: "#00205F" },
              { label: "Радиус",         value: "4px" },
              { label: "Тень",           value: "none" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <input
                  defaultValue={value}
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                />
              </div>
            ))}
          </div>
        )}

        {activePropTab === "events" && (
          <div className="p-4">
            <p className="text-[13px] text-primary/50 mb-3">События компонента</p>
            {["onClick", "onChange", "onHover"].map((evt) => (
              <div key={evt} className="flex items-center justify-between py-2 border-b border-cardbg last:border-0">
                <span className="text-[13px] text-primary">{evt}</span>
                <button className="text-[12px] text-cta hover:underline">+ Добавить</button>
              </div>
            ))}
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

/* ── Icons ── */
const S = "#00205F";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke={S} strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M10.5 10.5l2.5 2.5" stroke={S} strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
    </svg>
  );
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
function TextIcon() { return <svg viewBox="0 0 20 20" fill="none"><path d="M4 5h12M10 5v10M7 15h6" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function ImageIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke={S} strokeWidth="1.5" /><path d="M3 13l4-4 4 4 2-2 4 3" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="7" r="1.5" fill={S} /></svg>; }
function TableIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 7h16M7 7v11" stroke={S} strokeWidth="1.5" /></svg>; }
function ChartIcon() { return <svg viewBox="0 0 20 20" fill="none"><path d="M3 15l4-5 4 3 4-6" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 17h14" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function ButtonIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="8" rx="4" stroke={S} strokeWidth="1.5" /><path d="M8 10h4" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function InputIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="6" rx="2" stroke={S} strokeWidth="1.5" /><path d="M5 10h3" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function CheckboxIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke={S} strokeWidth="1.5" /><path d="M6 10l3 3 5-5" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SelectIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="6" rx="2" stroke={S} strokeWidth="1.5" /><path d="M14 10l2 2 2-2" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MenuIcon() { return <svg viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function TabsIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="11" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 10h5a1 1 0 001-1V7M8 7h5a1 1 0 011 1v2" stroke={S} strokeWidth="1.5" /></svg>; }
function LinkIcon() { return <svg viewBox="0 0 20 20" fill="none"><path d="M7 13l6-6M9 7h4v4" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BlockIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke={S} strokeWidth="1.5" /></svg>; }
function RowIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="7" rx="1.5" stroke={S} strokeWidth="1.5" /><rect x="2" y="11" width="16" height="7" rx="1.5" stroke={S} strokeWidth="1.5" /></svg>; }
function GridIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1" stroke={S} strokeWidth="1.5" /><rect x="11" y="2" width="7" height="7" rx="1" stroke={S} strokeWidth="1.5" /><rect x="2" y="11" width="7" height="7" rx="1" stroke={S} strokeWidth="1.5" /><rect x="11" y="11" width="7" height="7" rx="1" stroke={S} strokeWidth="1.5" /></svg>; }
function CardIcon() { return <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke={S} strokeWidth="1.5" /><path d="M2 8h16" stroke={S} strokeWidth="1.5" /></svg>; }
