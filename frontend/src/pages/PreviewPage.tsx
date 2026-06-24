import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { EDITOR_DRAFT_KEY } from "./EditorPage";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1200, h: 750, label: "Десктоп" },
  tablet:  { w: 768,  h: 960, label: "Планшет" },
  mobile:  { w: 375,  h: 667, label: "Мобильный" },
};

/* ── Types matching EditorPage ── */
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
interface EditorDraft {
  basicMap: Record<string, ElementBasic>;
  styleMap: Record<string, Record<string, string>>;
  eventMap: Record<string, ElementEvent>;
}

const DEFAULT_DRAFT: EditorDraft = {
  basicMap: {
    "heading":       { text: "Заголовок страницы", width: "100%", height: "auto", paddingX: "12", paddingY: "8", btnVariant: "primary", btnSize: "md" },
    "btn-primary":   { text: "Сохранить",          width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "primary", btnSize: "md" },
    "btn-secondary": { text: "Отмена",             width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "secondary", btnSize: "md" },
    "btn-danger":    { text: "Удалить",            width: "auto", height: "auto", paddingX: "16", paddingY: "8", btnVariant: "danger", btnSize: "md" },
  },
  styleMap: {},
  eventMap: {
    "heading":       { onClick: "none", navigateTo: "", customJs: "", onChange: "none" },
    "btn-primary":   { onClick: "none", navigateTo: "", customJs: "", onChange: "none" },
    "btn-secondary": { onClick: "none", navigateTo: "", customJs: "", onChange: "none" },
    "btn-danger":    { onClick: "none", navigateTo: "", customJs: "", onChange: "none" },
  },
};

const MOCK_ROWS = [
  { id: 1, name: "Клиент А", status: "Активен",  date: "12.01.2025" },
  { id: 2, name: "Клиент Б", status: "Архив",     date: "08.01.2025" },
  { id: 3, name: "Клиент В", status: "Активен",  date: "05.01.2025" },
  { id: 4, name: "Клиент Г", status: "Ожидание", date: "02.01.2025" },
  { id: 5, name: "Клиент Д", status: "Активен",  date: "29.12.2024" },
];

export function PreviewPage() {
  const [device, setDevice] = useState<Device>("desktop");
  const [draft, setDraft] = useState<EditorDraft>(DEFAULT_DRAFT);
  const [feedback, setFeedback] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw) as EditorDraft);
    } catch {
      /* ignore */
    }
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  function executeEvent(id: string) {
    const ev = draft.eventMap[id];
    if (!ev || ev.onClick === "none") return;

    if (ev.onClick === "navigate") {
      const to = ev.navigateTo?.trim();
      if (!to) { showFeedback("Не задан адрес для перехода"); return; }
      if (to.startsWith("http://") || to.startsWith("https://")) {
        window.open(to, "_blank", "noopener");
      } else {
        navigate(to);
      }
      return;
    }

    if (ev.onClick === "submit") {
      showFeedback("Форма отправлена");
      return;
    }

    if (ev.onClick === "custom") {
      try {
        // eslint-disable-next-line no-new-func
        new Function(ev.customJs)();
      } catch (err) {
        showFeedback("Ошибка в скрипте: " + String(err));
      }
    }
  }

  function renderBtn(id: string) {
    const b = draft.basicMap[id];
    if (!b) return null;
    const ev = draft.eventMap[id];
    const hasAction = ev && ev.onClick !== "none";

    const sizeClass = b.btnSize === "sm"
      ? "px-3 py-1 text-[12px]"
      : b.btnSize === "lg"
      ? "px-6 py-3 text-[15px]"
      : "px-4 py-2 text-[13px]";

    const variantClass =
      b.btnVariant === "primary"   ? "bg-cta text-white hover:bg-active" :
      b.btnVariant === "secondary" ? "border border-cardbg text-primary hover:bg-mainbg" :
                                     "bg-[#DC2626] text-white hover:bg-[#B91C1C]";

    return (
      <button
        key={id}
        onClick={() => executeEvent(id)}
        title={hasAction ? `Действие: ${ev.onClick}` : undefined}
        className={cn(
          "rounded-[6px] font-medium transition-colors relative",
          sizeClass,
          variantClass,
          hasAction && "ring-2 ring-offset-1 ring-cta/40"
        )}
      >
        {b.text}
        {hasAction && (
          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-cta border-2 border-white" title={ev.onClick} />
        )}
      </button>
    );
  }

  const { w, h } = DEVICE_SIZES[device];
  const availW = 1860;
  const availH = 940;
  const scale = Math.min(1, availW / (w + 40), availH / (h + 40));

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 h-[60px] border-b border-cardbg bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 hover:text-primary hover:bg-mainbg transition-colors"
          >
            <BackIcon />
          </button>
          <span className="text-[16px] font-semibold text-primary">Предпросмотр</span>
        </div>

        <div className="flex items-center gap-1 bg-mainbg rounded-[8px] p-1">
          {(Object.entries(DEVICE_SIZES) as [Device, typeof DEVICE_SIZES[Device]][]).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-[13px] transition-colors",
                device === key ? "bg-white text-cta shadow-sm font-medium" : "text-primary/60 hover:text-primary"
              )}
            >
              {key === "desktop" && <DesktopIcon />}
              {key === "tablet"  && <TabletIcon />}
              {key === "mobile"  && <MobileIcon />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[13px] text-primary/50">
            <span className="w-2.5 h-2.5 rounded-full bg-cta/40 inline-block" />
            Активные кнопки отмечены синей точкой
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-mainbg text-primary text-[14px] rounded-[20px] px-4 py-1.5 hover:bg-cardbg transition-colors"
          >
            <span className="text-[16px] leading-none">✕</span>
            Закрыть
          </button>
        </div>
      </header>

      {/* ── Preview area ── */}
      <div className="flex-1 bg-mainbg flex items-center justify-center overflow-hidden relative">
        {/* Feedback toast */}
        {feedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-white text-[14px] font-medium px-5 py-2.5 rounded-[8px] shadow-lg pointer-events-none animate-fade-in">
            {feedback}
          </div>
        )}

        <div
          style={{
            width: w, height: h,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="bg-white rounded-[12px] shadow-2xl overflow-hidden flex flex-col border border-cardbg"
        >
          {/* App header */}
          <div className="bg-primary px-6 py-3 flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-[6px] bg-cta flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">A</span>
            </div>
            <span className="text-white text-[15px] font-semibold">Предпросмотр приложения</span>
          </div>

          {/* Canvas content — mirrors EditorPage layout */}
          <div className="flex-1 relative overflow-hidden bg-white p-6 flex flex-col gap-6">
            {/* Heading */}
            <div className="flex items-center h-10">
              <span className="text-[20px] font-bold text-primary">
                {draft.basicMap["heading"]?.text ?? "Заголовок страницы"}
              </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <div className="bg-[#F5F6F8] rounded-t-[4px] grid grid-cols-4 border border-cardbg">
                {["Название", "Статус", "Дата", "Пользователь"].map((col) => (
                  <div key={col} className="px-3 py-2 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{col}</div>
                ))}
              </div>
              {MOCK_ROWS.map((row) => (
                <div key={row.id} className="grid grid-cols-4 border-x border-b border-cardbg hover:bg-mainbg transition-colors cursor-pointer">
                  <div className="px-3 py-2 text-[12px] text-primary border-r border-cardbg">{row.name}</div>
                  <div className="px-3 py-2 border-r border-cardbg">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[20px]",
                      row.status === "Активен"  ? "bg-[#E8F5E9] text-[#2E7D32]" :
                      row.status === "Архив"    ? "bg-[#F5F6F8] text-primary/60" :
                                                  "bg-[#FFF8E1] text-[#E65100]"
                    )}>{row.status}</span>
                  </div>
                  <div className="px-3 py-2 text-[12px] text-primary/60 border-r border-cardbg">{row.date}</div>
                  <div className="px-3 py-2 text-[12px] text-primary/60">user@app.ru</div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 shrink-0">
              {renderBtn("btn-primary")}
              {renderBtn("btn-secondary")}
              {renderBtn("btn-danger")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */
const S = "currentColor";

function BackIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M10 4L6 8l4 4" stroke={S} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DesktopIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><rect x="1" y="2" width="14" height="10" rx="1.5" stroke={S} strokeWidth="1.5" /><path d="M5 14h6M8 12v2" stroke={S} strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function TabletIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke={S} strokeWidth="1.5" /><circle cx="8" cy="12.5" r="0.75" fill={S} /></svg>;
}
function MobileIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><rect x="4" y="1" width="8" height="14" rx="1.5" stroke={S} strokeWidth="1.5" /><circle cx="8" cy="12.5" r="0.75" fill={S} /></svg>;
}
