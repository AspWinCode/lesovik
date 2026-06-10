import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";

type IntelSection = "forecast" | "text" | "assistant";

export function IntelligencePage() {
  const [railModule, setRailModule] = useState<RailModule>("notifications");
  const [active, setActive]         = useState<IntelSection | null>(null);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sidebar ── */}
      <aside
        className="absolute bg-white overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="flex items-center px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Интеллект</span>
        </div>

        <nav className="py-3 px-4">
          <p className="text-[13px] text-primary/50 mb-3">Модели ещё не созданы</p>

          <SidebarGroup
            label="Модели прогнозирования"
            active={active === "forecast"}
            onSelect={() => setActive("forecast")}
            onAdd={() => setActive("forecast")}
          />
          <SidebarGroup
            label="Модели распознавания текста"
            active={active === "text"}
            onSelect={() => setActive("text")}
            onAdd={() => setActive("text")}
          />

          <button
            onClick={() => setActive("assistant")}
            className={cn(
              "w-full flex items-center gap-2 px-1 py-2 text-[15px] transition-colors rounded-[6px]",
              active === "assistant"
                ? "bg-[#EBF4FF] text-cta font-medium"
                : "text-primary hover:bg-mainbg"
            )}
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2a6 6 0 016 6c0 2.5-1.5 4.7-3.7 5.7L12 16H8l-.3-2.3A6 6 0 014 8a6 6 0 016-6z" strokeLinejoin="round" />
              <path d="M8 19h4" strokeLinecap="round" />
            </svg>
            Умный помощник
          </button>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto flex items-center justify-center"
        style={{ left: 380, top: 70, width: 945, height: 1010 }}
      >
        {active === null && <EmptyState onForecast={() => setActive("forecast")} onText={() => setActive("text")} />}
        {active === "forecast"  && <ForecastSection />}
        {active === "text"      && <TextSection />}
        {active === "assistant" && <AssistantSection />}
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

/* ── Sidebar group ── */
function SidebarGroup({ label, active, onSelect, onAdd }: {
  label: string;
  active: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-1 py-2 rounded-[6px] transition-colors cursor-pointer",
      active ? "bg-[#EBF4FF]" : "hover:bg-mainbg"
    )}
      onClick={onSelect}
    >
      <span className={cn("text-[15px]", active ? "text-cta font-medium" : "text-primary")}>{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="w-6 h-6 flex items-center justify-center text-cta hover:bg-[#d4eaff] rounded-[4px] transition-colors"
      >
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ onForecast, onText }: { onForecast: () => void; onText: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 120 120" className="w-[140px] h-[140px] text-cta" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="60" cy="48" r="30" />
        <path d="M44 48c0-8.8 7.2-16 16-16M60 78v12M50 90h20" strokeLinecap="round" />
        {/* spiral detail */}
        <path d="M60 30c0 0-4 4-4 10s4 10 4 10" strokeLinecap="round" />
      </svg>

      <div className="text-center">
        <h2 className="text-[22px] font-bold text-cta mb-2">Интеллект</h2>
        <p className="text-[15px] text-primary/60">Расширенные функции для повышения<br />эффективности ваших приложений</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onForecast}
          className="flex items-center gap-2 bg-cta text-white text-[15px] font-medium rounded-[20px] px-6 py-2.5 hover:bg-active transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Добавить модель прогнозирования
        </button>
        <button
          onClick={onText}
          className="flex items-center gap-2 bg-cta text-white text-[15px] font-medium rounded-[20px] px-6 py-2.5 hover:bg-active transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Добавить модель распознавания текста
        </button>
      </div>
    </div>
  );
}

/* ── Forecast section ── */
function ForecastSection() {
  return (
    <div className="w-full h-full flex items-start px-10 py-8">
      <div className="w-full">
        <h2 className="text-[20px] font-bold text-primary mb-2">Модели прогнозирования</h2>
        <p className="text-[14px] text-primary/60 mb-6">
          Создайте модель прогнозирования для предсказания значений на основе данных вашего приложения.
        </p>
        <button className="flex items-center gap-2 bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Добавить модель прогнозирования
        </button>
      </div>
    </div>
  );
}

/* ── Text recognition section ── */
function TextSection() {
  return (
    <div className="w-full h-full flex items-start px-10 py-8">
      <div className="w-full">
        <h2 className="text-[20px] font-bold text-primary mb-2">Модели распознавания текста</h2>
        <p className="text-[14px] text-primary/60 mb-6">
          Создайте модель для распознавания текста и извлечения данных из документов и изображений.
        </p>
        <button className="flex items-center gap-2 bg-cta text-white text-[14px] font-medium rounded-[20px] px-5 py-2 hover:bg-active transition-colors">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Добавить модель распознавания текста
        </button>
      </div>
    </div>
  );
}

/* ── Smart assistant section ── */
function AssistantSection() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Привет! Я умный помощник OI. Как я могу помочь вам с вашим приложением?" },
  ]);

  function send() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "ai",   text: "Понял! Работаю над вашим запросом..." },
    ]);
    setInput("");
  }

  return (
    <div className="w-full h-full flex flex-col px-10 py-8">
      <h2 className="text-[20px] font-bold text-primary mb-4">Умный помощник</h2>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[600px] rounded-[12px] px-4 py-3 text-[14px]",
              m.role === "ai"
                ? "bg-white border border-cardbg text-primary self-start"
                : "bg-cta text-white self-end"
            )}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-white border border-cardbg rounded-[12px] px-4 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Введите сообщение..."
          className="flex-1 bg-transparent text-[14px] text-primary outline-none"
        />
        <button
          onClick={send}
          className="bg-cta text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-active transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12V4M4 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
