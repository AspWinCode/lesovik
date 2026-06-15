import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { cn } from "@/lib/cn";

type Device = "desktop" | "tablet" | "mobile";
type PropTab = "basic" | "style" | "events";
type PickerKind = "color" | "gradient" | "image" | null;

/* ── Preset colour swatches ── */
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

  /* pickers */
  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerTarget, setPickerTarget] = useState<string>("Цвет текста");
  const [colorValues, setColorValues] = useState<Record<string, string>>({
    "Цвет текста": "#00205F",
    "Фон":         "#FFFFFF",
    "Граница":     "#E2E8F0",
  });
  const [gradFrom, setGradFrom] = useState("#35A7FF");
  const [gradTo,   setGradTo]   = useState("#00205F");
  const [gradAngle, setGradAngle] = useState(135);
  const [gradType, setGradType] = useState<"linear" | "radial">("linear");
  const [imgTab, setImgTab] = useState<"gallery" | "url" | "upload">("gallery");
  const [imgUrl, setImgUrl] = useState("");
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  function openColorPicker(target: string) {
    setPickerTarget(target);
    setPicker(picker === "color" && pickerTarget === target ? null : "color");
  }

  function openGradient() { setPicker("gradient"); }
  function openImagePicker() { setPicker(picker === "image" ? null : "image"); }

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
              { label: "Ширина",  value: "100%" },
              { label: "Высота",  value: "auto" },
              { label: "Отступы", value: "0" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <input defaultValue={value} className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
            ))}
            <div>
              <label className="block text-[12px] text-primary/60 mb-1">Текст</label>
              <input defaultValue="Заголовок страницы" className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
            </div>
            {selectedElement === "image" || selectedElement === "heading" ? (
              <div>
                <label className="block text-[12px] text-primary/60 mb-1">Изображение</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[60px] rounded-[6px] border border-cardbg bg-mainbg overflow-hidden flex items-center justify-center">
                    {selectedImg
                      ? <div className="w-full h-full" style={{ background: IMAGE_GALLERY.find(i=>i.id===selectedImg)?.bg ?? imgUrl }} />
                      : <span className="text-[11px] text-primary/40">Не выбрано</span>}
                  </div>
                  <button
                    onClick={openImagePicker}
                    className="shrink-0 px-3 py-2 text-[12px] rounded-[6px] border border-cta text-cta hover:bg-cta/10 transition-colors"
                  >
                    Выбрать
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activePropTab === "style" && (
          <div className="p-4 flex flex-col gap-4">
            {[
              { label: "Размер шрифта", value: "20px" },
              { label: "Жирность",      value: "bold" },
              { label: "Радиус",        value: "4px" },
              { label: "Тень",          value: "none" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <input defaultValue={value} className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta" />
              </div>
            ))}

            {/* Colour fields */}
            {(["Цвет текста", "Фон", "Граница"] as const).map((label) => (
              <div key={label}>
                <label className="block text-[12px] text-primary/60 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openColorPicker(label)}
                    className={cn(
                      "w-7 h-7 rounded-[4px] border-2 shrink-0 transition-all",
                      picker === "color" && pickerTarget === label ? "border-cta scale-110" : "border-cardbg"
                    )}
                    style={{ background: colorValues[label] }}
                    title="Выбрать цвет"
                  />
                  <input
                    value={colorValues[label]}
                    onChange={(e) => setColorValues((p) => ({ ...p, [label]: e.target.value }))}
                    className="flex-1 px-3 py-2 text-[13px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta font-mono"
                  />
                </div>
              </div>
            ))}

            {/* Gradient shortcut */}
            <button
              onClick={openGradient}
              className={cn(
                "w-full py-2 rounded-[6px] border text-[12px] font-medium transition-colors",
                picker === "gradient" ? "border-cta text-cta bg-cta/5" : "border-cardbg text-primary/60 hover:border-cta/50 hover:text-primary"
              )}
              style={{ background: picker === "gradient" ? undefined : `linear-gradient(90deg,${gradFrom},${gradTo})`, WebkitBackgroundClip: picker === "gradient" ? undefined : "text", WebkitTextFillColor: picker === "gradient" ? undefined : "transparent" }}
            >
              🎨 Градиент фона
            </button>
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

        {/* ── Color Palette Picker ── */}
        {picker === "color" && (
          <div className="absolute right-[285px] top-[220px] z-50 w-[240px] bg-white rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-cardbg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-primary">{pickerTarget}</span>
              <button onClick={() => setPicker(null)} className="text-primary/40 hover:text-primary text-[16px] leading-none">✕</button>
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[4px] border border-cardbg shrink-0" style={{ background: colorValues[pickerTarget] }} />
              <input
                value={colorValues[pickerTarget]}
                onChange={(e) => setColorValues((p) => ({ ...p, [pickerTarget]: e.target.value }))}
                maxLength={7}
                className="flex-1 px-2 py-1.5 text-[13px] rounded-[4px] border border-cardbg bg-mainbg text-primary font-mono focus:outline-none focus:border-cta"
              />
            </div>

            {/* Opacity slider */}
            <div>
              <label className="text-[11px] text-primary/50 mb-1 block">Прозрачность</label>
              <input type="range" min={0} max={100} defaultValue={100} className="w-full accent-cta h-1.5" />
            </div>

            {/* Preset swatches */}
            <div className="grid grid-cols-10 gap-1">
              {PALETTE_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorValues((p) => ({ ...p, [pickerTarget]: c }))}
                  className={cn(
                    "w-[18px] h-[18px] rounded-[3px] border transition-transform hover:scale-110",
                    colorValues[pickerTarget] === c ? "border-cta scale-110" : "border-cardbg"
                  )}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>

            <button
              onClick={openGradient}
              className="w-full py-1.5 rounded-[6px] border border-cardbg text-[12px] text-primary/60 hover:border-cta hover:text-cta transition-colors"
              style={{ background: `linear-gradient(90deg,${gradFrom},${gradTo})`, color: "white", border: "none" }}
            >
              Открыть градиент →
            </button>
          </div>
        )}

        {/* ── Gradient Picker ── */}
        {picker === "gradient" && (
          <div className="absolute right-[285px] top-[220px] z-50 w-[280px] bg-white rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-cardbg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-primary">Градиент</span>
              <button onClick={() => setPicker(null)} className="text-primary/40 hover:text-primary text-[16px] leading-none">✕</button>
            </div>

            {/* Preview bar */}
            <div
              className="w-full h-8 rounded-[6px] border border-cardbg"
              style={{
                background: gradType === "linear"
                  ? `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`
                  : `radial-gradient(circle, ${gradFrom}, ${gradTo})`
              }}
            />

            {/* Type tabs */}
            <div className="flex bg-mainbg rounded-[6px] p-0.5 gap-0.5">
              {(["linear", "radial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGradType(t)}
                  className={cn(
                    "flex-1 py-1 text-[12px] rounded-[4px] transition-colors",
                    gradType === t ? "bg-white text-cta shadow-sm font-medium" : "text-primary/60"
                  )}
                >
                  {t === "linear" ? "Линейный" : "Радиальный"}
                </button>
              ))}
            </div>

            {/* From / To colours */}
            <div className="flex gap-3">
              {([["Начало", gradFrom, setGradFrom], ["Конец", gradTo, setGradTo]] as [string, string, (v:string)=>void][]).map(([lbl, val, set]) => (
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

            {/* Angle selector (linear only) */}
            {gradType === "linear" && (
              <div>
                <label className="text-[11px] text-primary/50 mb-1 block">Угол: {gradAngle}°</label>
                <div className="grid grid-cols-8 gap-1">
                  {GRADIENT_ANGLES.map((a) => (
                    <button
                      key={a}
                      onClick={() => setGradAngle(a)}
                      className={cn(
                        "w-6 h-6 rounded-[4px] border text-[10px] flex items-center justify-center transition-colors",
                        gradAngle === a ? "border-cta bg-cta/10 text-cta font-bold" : "border-cardbg text-primary/50 hover:border-cta/50"
                      )}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
                <input type="range" min={0} max={360} value={gradAngle} onChange={(e) => setGradAngle(Number(e.target.value))} className="w-full mt-2 accent-cta h-1.5" />
              </div>
            )}

            {/* Presets */}
            <div>
              <label className="text-[11px] text-primary/50 mb-1.5 block">Пресеты</label>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADIENT_PRESETS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => { setGradFrom(g.from); setGradTo(g.to); setGradAngle(g.angle); }}
                    className="w-8 h-8 rounded-[4px] border border-cardbg hover:border-cta transition-colors"
                    style={{ background: `linear-gradient(${g.angle}deg,${g.from},${g.to})` }}
                    title={`${g.from} → ${g.to}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const grad = gradType === "linear"
                  ? `linear-gradient(${gradAngle}deg,${gradFrom},${gradTo})`
                  : `radial-gradient(circle,${gradFrom},${gradTo})`;
                setColorValues((p) => ({ ...p, "Фон": grad }));
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

            {/* Tabs */}
            <div className="flex border-b border-cardbg">
              {(["gallery", "url", "upload"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setImgTab(t)}
                  className={cn(
                    "flex-1 py-2 text-[12px] transition-colors",
                    imgTab === t ? "text-cta border-b-2 border-cta font-medium" : "text-primary/50 hover:text-primary"
                  )}
                >
                  {t === "gallery" ? "Медиатека" : t === "url" ? "По URL" : "Загрузить"}
                </button>
              ))}
            </div>

            <div className="p-4 flex flex-col gap-3" style={{ minHeight: 220 }}>
              {imgTab === "gallery" && (
                <>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input placeholder="Поиск…" className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-[6px] border border-cardbg bg-mainbg focus:outline-none focus:border-cta" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_GALLERY.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImg(img.id)}
                        className={cn(
                          "rounded-[6px] overflow-hidden border-2 transition-all",
                          selectedImg === img.id ? "border-cta scale-[1.03]" : "border-transparent hover:border-cta/40"
                        )}
                      >
                        <div className="h-16 w-full" style={{ background: img.bg }} />
                        <p className="text-[10px] text-primary/60 py-0.5 text-center bg-mainbg">{img.label}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {imgTab === "url" && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] text-primary/50 mb-1 block">URL изображения</label>
                    <input
                      value={imgUrl}
                      onChange={(e) => setImgUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="w-full px-3 py-2 text-[12px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
                    />
                  </div>
                  {imgUrl && (
                    <div className="h-28 rounded-[6px] border border-cardbg bg-mainbg flex items-center justify-center overflow-hidden">
                      <img src={imgUrl} alt="preview" className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>
              )}

              {imgTab === "upload" && (
                <div
                  className="flex-1 rounded-[8px] border-2 border-dashed border-cta/30 hover:border-cta/60 transition-colors flex flex-col items-center justify-center gap-2 py-8 cursor-pointer bg-mainbg"
                  onClick={() => {}}
                >
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
