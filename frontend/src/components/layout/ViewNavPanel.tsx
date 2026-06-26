import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface NavView {
  id: string;
  label: string;
  systemType?: "detail" | "form" | "inline";
}

export interface NavSection {
  id: string;
  title: string;
  views: NavView[];
}

export interface SystemNavGroup {
  entityId: string;
  entityName: string;
  views: NavView[];
}

interface ViewNavPanelProps {
  title?: string;
  sections: NavSection[];
  activeViewId: string;
  onSelect: (id: string) => void;
  onAddView?: (sectionId: string) => void;
  onDeleteView?: (viewId: string) => void;
  hasWarning?: boolean;
  systemGroups?: SystemNavGroup[];
}

export function ViewNavPanel({
  title = "UX/UI",
  sections,
  activeViewId,
  onSelect,
  onAddView,
  onDeleteView,
  hasWarning = false,
  systemGroups = [],
}: ViewNavPanelProps) {
  const [systemOpen, setSystemOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  function toggleSearch() {
    if (searchOpen) {
      setSearchQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }

  const query = searchQuery.toLowerCase();
  const filteredSections = sections.map((s) => ({
    ...s,
    views: query ? s.views.filter((v) => v.label.toLowerCase().includes(query)) : s.views,
  }));

  return (
    <aside
      className="absolute top-[70px] bg-mainbg flex flex-col"
      style={{ left: 85, width: 290, height: 1005, borderRadius: "20px 5px 5px 20px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[15px] pt-[15px] h-[45px]">
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-[8px] bg-white rounded-btn px-[10px] h-[32px] mr-[8px]">
            <span className="w-4 h-4 shrink-0 opacity-40"><SearchIcon /></span>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск страниц…"
              className="flex-1 text-[14px] text-primary bg-transparent outline-none placeholder-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-primary/40 hover:text-primary/70 text-[16px] leading-none">×</button>
            )}
          </div>
        ) : (
          <h2 className="text-nav font-bold text-primary">{title}</h2>
        )}
        <div className="flex items-center gap-4 shrink-0">
          {hasWarning && !searchOpen && (
            <span aria-label="Есть предупреждения" title="Есть предупреждения" className="w-[22px] h-5">
              <WarningIcon />
            </span>
          )}
          <button
            aria-label="Поиск"
            onClick={toggleSearch}
            className={cn("w-5 h-5 transition-opacity hover:opacity-70", searchOpen && "opacity-70")}
          >
            <SearchIcon />
          </button>
          <div className="relative">
            <button
              aria-label="Меню"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center hover:opacity-70 transition-opacity"
            >
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-[26px] z-50 bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] py-[5px] flex flex-col min-w-[200px]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {onAddView && sections[0] && (
                  <button
                    onClick={() => { onAddView(sections[0].id); setMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-selected text-[14px] text-primary text-left transition-colors"
                  >
                    + Новая страница
                  </button>
                )}
                <button
                  onClick={() => { setSearchOpen(true); setMenuOpen(false); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-selected text-[14px] text-primary text-left transition-colors"
                >
                  Поиск страниц
                </button>
                <div className="h-px bg-cardbg mx-3 my-1" />
                <button
                  onClick={() => { setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-selected text-[14px] text-primary/50 text-left transition-colors cursor-not-allowed"
                  disabled
                >
                  Сортировать A→Я
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-[22px] pt-[10px]">
        {filteredSections.map((section, idx) => (
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
              <p className="text-[13px] text-primary/40 px-[15px]">
                {query ? "Нет совпадений" : "Нет страниц — нажмите +"}
              </p>
            )}

            {section.views.map((view) => (
              <NavPill
                key={view.id}
                label={view.label}
                active={view.id === activeViewId}
                onClick={() => { onSelect(view.id); setSearchOpen(false); setSearchQuery(""); }}
                onDelete={onDeleteView ? () => onDeleteView(view.id) : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {/* System views (bottom) */}
      <div className="border-t-2 border-white flex flex-col py-[15px] gap-[10px]">
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
          <div className="w-full flex flex-col gap-[15px]">
            {systemGroups.length === 0 && (
              <p className="text-[13px] text-primary/40 px-[15px]">
                Выберите таблицу на странице — появятся Detail и Form
              </p>
            )}
            {systemGroups.map((group) => (
              <div key={group.entityId} className="flex flex-col gap-[6px]">
                <span className="text-[13px] font-semibold text-primary/50 px-[15px] uppercase tracking-wide">
                  {group.entityName}
                </span>
                {group.views.map((view) => (
                  <NavPill
                    key={view.id}
                    label={view.label}
                    active={view.id === activeViewId}
                    onClick={() => onSelect(view.id)}
                    systemType={view.systemType}
                  />
                ))}
              </div>
            ))}
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
  systemType,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  systemType?: "detail" | "form" | "inline";
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
        <span className="w-6 h-6 shrink-0">
          {systemType === "detail" ? <DetailIcon highlight={active} /> : systemType === "form" ? <FormIcon highlight={active} /> : systemType === "inline" ? <InlineIcon highlight={active} /> : <DbPillIcon highlight={active} />}
        </span>
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

function DetailIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="2" />
      <line x1="7" y1="8" x2="17" y2="8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="12" x2="17" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="16" x2="13" y2="16" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FormIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="2" />
      <line x1="7" y1="8" x2="17" y2="8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="11" width="10" height="3" rx="1.5" stroke={c} strokeWidth="1.5" />
      <line x1="7" y1="17" x2="12" y2="17" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InlineIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="3" y="3" width="18" height="7" rx="2" stroke={c} strokeWidth="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="7" y1="6.5" x2="17" y2="6.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
