import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

interface Theme {
  id: string;
  label: string;
  primary: string;
  accent: string;
}

const THEMES: Theme[] = [
  { id: "blue-green",    label: "Синий / Зелёный",    primary: "#00205F", accent: "#20BE4F" },
  { id: "blue-dark",     label: "Синий / Тёмный",     primary: "#00205F", accent: "#0D1B3E" },
  { id: "orange-red",    label: "Оранжевый / Красный", primary: "#E87722", accent: "#C22A2A" },
  { id: "red-dark",      label: "Красный / Тёмный",   primary: "#C22A2A", accent: "#1A0A0A" },
  { id: "black-dark",    label: "Чёрный / Тёмный",    primary: "#1A1A1A", accent: "#2D2D2D" },
  { id: "green-red",     label: "Зелёный / Красный",  primary: "#1A7A3C", accent: "#C22A2A" },
  { id: "teal-blue",     label: "Бирюзовый / Синий",  primary: "#007A7A", accent: "#35A7FF" },
  { id: "purple-pink",   label: "Фиолетовый / Розовый", primary: "#6B21A8", accent: "#DB2777" },
  { id: "navy-cyan",     label: "Тёмно-синий / Голубой", primary: "#1E3A5F", accent: "#00B4D8" },
  { id: "indigo-gold",   label: "Индиго / Золотой",   primary: "#3730A3", accent: "#D97706" },
  { id: "slate-green",   label: "Серо-синий / Зелёный", primary: "#334155", accent: "#16A34A" },
  { id: "rose-indigo",   label: "Розовый / Индиго",   primary: "#BE123C", accent: "#4338CA" },
  { id: "amber-brown",   label: "Янтарный / Коричневый", primary: "#B45309", accent: "#78350F" },
  { id: "green-navy",    label: "Зелёный / Синий",    primary: "#065F46", accent: "#1E3A5F" },
  { id: "cyan-dark",     label: "Голубой / Тёмный",   primary: "#0E7490", accent: "#0F172A" },
  { id: "violet-teal",   label: "Фиолетовый / Бирюзовый", primary: "#7C3AED", accent: "#0F766E" },
  { id: "orange-navy",   label: "Оранжевый / Синий",  primary: "#C2410C", accent: "#1E3A5F" },
  { id: "pink-dark",     label: "Розовый / Тёмный",   primary: "#9D174D", accent: "#1A1A2E" },
];

export function ThemesPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("blue-green");

  return (
    <div className="relative w-[1920px] h-[1080px] bg-mainbg overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-[56px] shrink-0 flex items-center px-8 gap-6 bg-white border-b border-cardbg">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold text-primary">OI</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] text-primary/60 hover:text-primary transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-[120px]">
        <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,32,95,0.10)] px-[60px] py-[50px] w-[900px]">
          <h1 className="text-[26px] font-bold text-primary mb-2 text-center">Темы оформления</h1>
          <p className="text-[14px] text-primary/50 text-center mb-8">Выберите цветовую схему интерфейса</p>

          {/* Grid 6×3 */}
          <div className="grid grid-cols-6 gap-5 mb-10">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelected(theme.id)}
                title={theme.label}
                className={cn(
                  "flex flex-col rounded-[10px] overflow-hidden transition-all",
                  "hover:scale-105 hover:shadow-md",
                  selected === theme.id
                    ? "ring-2 ring-offset-2 ring-cta shadow-md scale-105"
                    : "ring-1 ring-cardbg"
                )}
                style={{ width: 96, height: 96 }}
              >
                <div className="flex-1" style={{ backgroundColor: theme.primary }} />
                <div className="flex-1" style={{ backgroundColor: theme.accent }} />
              </button>
            ))}
          </div>

          {/* Selected label */}
          <p className="text-center text-[14px] text-primary/60 mb-8">
            Выбрано:{" "}
            <span className="font-semibold text-primary">
              {THEMES.find((t) => t.id === selected)?.label ?? "—"}
            </span>
          </p>

          {/* Save button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-[10px] bg-cta border-2 border-cta rounded-btn text-white text-[15px] font-medium
                         hover:bg-active transition-colors"
            >
              Сохранить тему
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
