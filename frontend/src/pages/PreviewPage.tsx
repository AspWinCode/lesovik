import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1200, h: 750,  label: "Десктоп" },
  tablet:  { w: 768,  h: 960,  label: "Планшет" },
  mobile:  { w: 375,  h: 667,  label: "Мобильный" },
};

const MOCK_ROWS = [
  { id: 1, name: "Клиент А",   status: "Активен",  date: "12.01.2025" },
  { id: 2, name: "Клиент Б",   status: "Архив",    date: "08.01.2025" },
  { id: 3, name: "Клиент В",   status: "Активен",  date: "05.01.2025" },
  { id: 4, name: "Клиент Г",   status: "Ожидание", date: "02.01.2025" },
  { id: 5, name: "Клиент Д",   status: "Активен",  date: "29.12.2024" },
];

export function PreviewPage() {
  const [device, setDevice] = useState<Device>("desktop");
  const navigate = useNavigate();

  const { w, h } = DEVICE_SIZES[device];

  // Scale down if the simulator doesn't fit in the available area (1920×1000 minus toolbar 60)
  const availW = 1860;
  const availH = 940;
  const scaleX = Math.min(1, availW / (w + 40));
  const scaleY = Math.min(1, availH / (h + 40));
  const scale  = Math.min(scaleX, scaleY);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 h-[60px] border-b border-cardbg bg-white shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 hover:text-primary hover:bg-mainbg transition-colors"
          >
            <BackIcon />
          </button>
          <span className="text-[16px] font-semibold text-primary">Предпросмотр: AppSheet</span>
        </div>

        {/* Center: Device switcher */}
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

        {/* Right */}
        <div className="flex items-center gap-3">
          <button className="border border-cta text-cta text-[14px] font-medium rounded-[20px] px-5 py-1.5 hover:bg-[#EBF4FF] transition-colors">
            Поделиться
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-mainbg text-primary text-[14px] rounded-[20px] px-4 py-1.5 hover:bg-cardbg transition-colors"
          >
            <span className="text-[16px] leading-none">✕</span>
            Закрыть
          </button>
        </div>
      </header>

      {/* ── Preview area ── */}
      <div className="flex-1 bg-mainbg flex items-center justify-center overflow-hidden">
        <div
          style={{
            width: w,
            height: h,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="bg-white rounded-[12px] shadow-2xl overflow-hidden flex flex-col border border-cardbg"
        >
          {/* Simulated app header */}
          <div className="bg-primary px-6 py-3 flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-[6px] bg-cta flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">A</span>
            </div>
            <span className="text-white text-[15px] font-semibold">AppSheet</span>
            <div className="flex-1" />
            <div className="w-7 h-7 rounded-full bg-white/20" />
          </div>

          {/* Simulated nav */}
          <div className="bg-white border-b border-cardbg px-6 flex gap-1 shrink-0">
            {["Главная", "Записи", "Аналитика", "Настройки"].map((tab, i) => (
              <button
                key={tab}
                className={cn(
                  "px-4 py-2.5 text-[13px] border-b-2 transition-colors",
                  i === 1 ? "border-cta text-cta font-medium" : "border-transparent text-primary/60 hover:text-primary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Simulated content */}
          <div className="flex-1 bg-mainbg p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-primary">Записи</h2>
              <button className="bg-cta text-white text-[13px] font-medium rounded-[6px] px-4 py-2">
                + Добавить
              </button>
            </div>

            <div className="bg-white rounded-[8px] border border-cardbg overflow-hidden">
              <div className="grid grid-cols-4 bg-[#F5F6F8] border-b border-cardbg">
                {["ID", "Название", "Статус", "Дата"].map((h) => (
                  <div key={h} className="px-4 py-2 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{h}</div>
                ))}
              </div>
              {MOCK_ROWS.map((row) => (
                <div key={row.id} className="grid grid-cols-4 border-b border-cardbg last:border-b-0 hover:bg-mainbg transition-colors cursor-pointer">
                  <div className="px-4 py-2.5 text-[12px] text-primary/60 border-r border-cardbg">{row.id}</div>
                  <div className="px-4 py-2.5 text-[12px] text-primary border-r border-cardbg">{row.name}</div>
                  <div className="px-4 py-2.5 border-r border-cardbg">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[20px]",
                      row.status === "Активен"  ? "bg-[#E8F5E9] text-[#2E7D32]" :
                      row.status === "Архив"    ? "bg-[#F5F6F8] text-primary/60" :
                      "bg-[#FFF8E1] text-[#E65100]"
                    )}>{row.status}</span>
                  </div>
                  <div className="px-4 py-2.5 text-[12px] text-primary/60">{row.date}</div>
                </div>
              ))}
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
