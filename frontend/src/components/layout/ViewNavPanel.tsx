import { useState } from "react";
import { cn } from "@/lib/cn";

export interface NavView {
  id: string;
  label: string;
}

export interface NavSection {
  id: string;
  title: string;
  views: NavView[];
}

interface ViewNavPanelProps {
  title?: string;
  sections: NavSection[];
  activeViewId: string;
  onSelect: (id: string) => void;
  onAddView?: (sectionId: string) => void;
  onDeleteView?: (viewId: string) => void;
}

export function ViewNavPanel({
  title = "UX/UI",
  sections,
  activeViewId,
  onSelect,
  onAddView,
  onDeleteView,
}: ViewNavPanelProps) {
  const [systemOpen, setSystemOpen] = useState(false);

  return (
    <aside
      className="absolute top-[70px] bg-mainbg flex flex-col"
      style={{ left: 85, width: 290, height: 1005, borderRadius: "20px 5px 5px 20px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[15px] pt-[15px] h-[45px]">
        <h2 className="text-nav font-bold text-primary">{title}</h2>
        <div className="flex items-center gap-5">
          <span aria-label="Есть предупреждения" title="Есть предупреждения" className="w-[22px] h-5">
            <WarningIcon />
          </span>
          <button aria-label="Поиск" className="w-5 h-5 hover:opacity-70 transition-opacity">
            <SearchIcon />
          </button>
          <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
            {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-[22px] pt-[10px]">
        {sections.map((section, idx) => (
          <div key={section.id} className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between px-[15px] h-[27px]">
              <span className={cn("text-[18px] leading-[150%] font-bold", idx === 0 ? "text-cta" : "text-primary")}>
                {section.title}
              </span>
              <button
                onClick={() => onAddView?.(section.id)}
                aria-label={`Добавить в ${section.title}`}
                className="w-[15px] h-[15px] flex items-center justify-center hover:opacity-70 transition-opacity"
              >
                <PlusIcon color={idx === 0 ? "#35A7FF" : "#00205F"} />
              </button>
            </div>

            {section.views.length === 0 && (
              <p className="text-[13px] text-primary/40 px-[15px]">Нет страниц — нажмите +</p>
            )}

            {section.views.map((view) => (
              <NavPill
                key={view.id}
                label={view.label}
                active={view.id === activeViewId}
                onClick={() => onSelect(view.id)}
                onDelete={onDeleteView ? () => onDeleteView(view.id) : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {/* System views (bottom) */}
      <div className="border-t-2 border-white flex flex-col items-center py-[15px] gap-[15px]">
        <button
          onClick={() => setSystemOpen((v) => !v)}
          className="flex items-center justify-center gap-[10px] px-[15px] pb-[3px]"
        >
          <span className="text-meta text-primary">Системные представления</span>
          <span className={cn("w-6 h-6 transition-transform", systemOpen && "rotate-180")}>
            <ChevronDownIcon />
          </span>
        </button>
        {systemOpen && (
          <div className="w-full flex flex-col gap-[10px]">
            <NavPill label="Аналитика_Detail" active={activeViewId === "analytics-detail"} onClick={() => onSelect("analytics-detail")} />
          </div>
        )}
      </div>
    </aside>
  );
}

function NavPill({
  label,
  active,
  onClick,
  onDelete,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-[7px] w-[290px] h-[46px] px-[15px] rounded-btn transition-colors text-left",
          active ? "bg-selected" : "hover:bg-cardbg/50"
        )}
      >
        <span className="w-6 h-6 shrink-0"><DbPillIcon highlight={active} /></span>
        <span className={cn("text-[18px] leading-[150%] font-medium truncate flex-1", active ? "text-cta" : "text-primary")}>
          {label}
        </span>
      </button>
      {onDelete && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-[10px] w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors"
          title="Удалить страницу"
        >
          <TrashSmIcon />
        </button>
      )}
    </div>
  );
}

/* ── Icons ── */
function WarningIcon() {
  return (
    <svg viewBox="0 0 22 20" fill="none" className="w-full h-full">
      <path d="M11 2 L20.5 18.5 L1.5 18.5 Z" stroke="#FFA600" strokeWidth="2.46" strokeLinejoin="round" />
      <line x1="11" y1="8" x2="11" y2="13" stroke="#FFA600" strokeWidth="2.46" strokeLinecap="round" />
      <circle cx="11" cy="15.8" r="0.6" fill="#FFA600" stroke="#FFA600" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="9" cy="9" r="6" stroke="#00205F" strokeWidth="2" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 15 15" fill="none" className="w-full h-full">
      <line x1="7.5" y1="2" x2="7.5" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M7 10 L12 15 L17 10" stroke="#00205F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DbPillIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke={c} strokeWidth="2" />
      <path d="M4 5 L4 19 C4 20.66 7.58 22 12 22 C16.42 22 20 20.66 20 19 L20 5" stroke={c} strokeWidth="2" />
      <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke={c} strokeWidth="2" />
    </svg>
  );
}

function TrashSmIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path d="M4 6 L16 6" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 6 L7 4 L13 4 L13 6" stroke="#EF4444" strokeWidth="1.6" />
      <path d="M5.5 6 L6 17 L14 17 L14.5 6" stroke="#EF4444" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
