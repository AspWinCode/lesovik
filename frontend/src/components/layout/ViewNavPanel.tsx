import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onDeleteSystemView?: (viewId: string) => void;
  onAddRecord?: (entityId: string) => void;
  onReorderViews?: (sectionId: string, orderedIds: string[]) => void;
  onPagePermissions?: (viewId: string) => void;
  warnings?: { message: string; hint: string; pageId: string }[];
  systemGroups?: SystemNavGroup[];
}

export function ViewNavPanel({
  title = "UX/UI",
  sections,
  activeViewId,
  onSelect,
  onAddView,
  onDeleteView,
  onDeleteSystemView,
  onAddRecord,
  onReorderViews,
  onPagePermissions,
  warnings = [],
  systemGroups = [],
}: ViewNavPanelProps) {
  const [systemOpen, setSystemOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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

  function handleDragEnd(sectionId: string, views: NavView[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = views.findIndex((v) => v.id === active.id);
    const newIndex = views.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(views, oldIndex, newIndex);
    onReorderViews?.(sectionId, reordered.map((v) => v.id));
  }

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
          {warnings.length > 0 && !searchOpen && (
            <div className="relative">
              <button
                onClick={() => setWarningOpen((v) => !v)}
                aria-label="Есть предупреждения"
                className="w-[22px] h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
              >
                <WarningIcon />
              </button>
              {warningOpen && (
                <div
                  className="absolute right-0 top-[28px] z-50 bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] py-[10px] flex flex-col min-w-[260px]"
                  onMouseLeave={() => setWarningOpen(false)}
                >
                  <p className="text-[12px] font-semibold text-primary/50 px-4 pb-[6px] uppercase tracking-wide">
                    Предупреждения ({warnings.length})
                  </p>
                  {warnings.map((w, i) => (
                    <button
                      key={i}
                      className="flex items-start gap-2 px-4 py-[6px] text-left hover:bg-primary/5 transition-colors"
                      onClick={() => { onSelect(w.pageId); setWarningOpen(false); }}
                    >
                      <span className="mt-[2px] shrink-0 w-[14px] h-[14px]"><WarningIcon /></span>
                      <span className="flex flex-col gap-[2px]">
                        <span className="text-[13px] text-primary leading-[1.4]">{w.message}</span>
                        <span className="text-[11px] text-primary/50 leading-[1.3]">{w.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-[22px] pt-[10px]">
        {filteredSections.map((section, idx) => {
          const isCollapsed = collapsedSections.has(section.id);
          const isDraggable = !!onReorderViews && !query;
          return (
            <div key={section.id} className="flex flex-col gap-[10px]">
              <div className="flex items-center justify-between px-[15px] h-[27px]">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center gap-[6px] min-w-0 flex-1 text-left hover:opacity-70 transition-opacity"
                  aria-expanded={!isCollapsed}
                >
                  <span className={cn("text-[18px] leading-[150%] font-bold truncate", idx === 0 ? "text-cta" : "text-primary")}>
                    {section.title}
                  </span>
                  <span className={cn("w-4 h-4 shrink-0 transition-transform opacity-40", isCollapsed && "-rotate-90")}>
                    <ChevronDownIcon />
                  </span>
                </button>
                <button
                  onClick={() => onAddView?.(section.id)}
                  aria-label={`Добавить в ${section.title}`}
                  className="w-[15px] h-[15px] flex items-center justify-center hover:opacity-70 transition-opacity shrink-0 ml-2"
                >
                  <PlusIcon color={idx === 0 ? "#35A7FF" : "#00205F"} />
                </button>
              </div>

              {!isCollapsed && section.views.length === 0 && (
                <p className="text-[13px] text-primary/40 px-[15px]">
                  {query ? "Нет совпадений" : "Нет страниц — нажмите +"}
                </p>
              )}

              {!isCollapsed && (
                isDraggable ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(section.id, section.views, e)}
                  >
                    <SortableContext items={section.views.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                      {section.views.map((view) => (
                        <SortableNavPill
                          key={view.id}
                          view={view}
                          active={view.id === activeViewId}
                          onClick={() => { onSelect(view.id); setSearchOpen(false); setSearchQuery(""); }}
                          onDelete={onDeleteView ? () => onDeleteView(view.id) : undefined}
                          onPermissions={onPagePermissions ? () => onPagePermissions(view.id) : undefined}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  section.views.map((view) => (
                    <NavPill
                      key={view.id}
                      label={view.label}
                      active={view.id === activeViewId}
                      onClick={() => { onSelect(view.id); setSearchOpen(false); setSearchQuery(""); }}
                      onDelete={onDeleteView ? () => onDeleteView(view.id) : undefined}
                      onPermissions={onPagePermissions ? () => onPagePermissions(view.id) : undefined}
                    />
                  ))
                )
              )}
            </div>
          );
        })}
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
                <div className="flex items-center justify-between px-[15px]">
                  <span className="text-[13px] font-semibold text-primary/50 uppercase tracking-wide">
                    {group.entityName}
                  </span>
                  {onAddRecord && (
                    <button
                      onClick={() => onAddRecord(group.entityId)}
                      title="Добавить запись"
                      className="w-[18px] h-[18px] flex items-center justify-center hover:opacity-70 transition-opacity"
                    >
                      <PlusIcon color="#00205F" />
                    </button>
                  )}
                </div>
                {group.views.map((view) => (
                  <NavPill
                    key={view.id}
                    label={view.label}
                    active={view.id === activeViewId}
                    onClick={() => onSelect(view.id)}
                    systemType={view.systemType}
                    onDelete={onDeleteSystemView ? () => onDeleteSystemView(view.id) : undefined}
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

function SortableNavPill({
  view,
  active,
  onClick,
  onDelete,
  onPermissions,
}: {
  view: NavView;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onPermissions?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <NavPill
        label={view.label}
        active={active}
        onClick={onClick}
        onDelete={onDelete}
        onPermissions={onPermissions}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function NavPill({
  label,
  active,
  onClick,
  onDelete,
  onPermissions,
  systemType,
  dragHandleProps,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onPermissions?: () => void;
  systemType?: "detail" | "form" | "inline";
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          className="absolute left-[2px] flex items-center justify-center w-4 h-full cursor-grab opacity-0 hover:opacity-60 transition-opacity z-10"
          title="Перетащить"
        >
          <DragDotsIcon />
        </span>
      )}
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-[7px] w-[290px] h-[46px] px-[15px] rounded-btn transition-colors text-left",
          active ? "bg-selected" : "hover:bg-cardbg/50",
          dragHandleProps && "pl-[22px]",
        )}
      >
        <span className="w-6 h-6 shrink-0">
          {systemType === "detail" ? <DetailIcon highlight={active} /> : systemType === "form" ? <FormIcon highlight={active} /> : systemType === "inline" ? <InlineIcon highlight={active} /> : <DbPillIcon highlight={active} />}
        </span>
        <span className={cn("text-[18px] leading-[150%] font-medium truncate flex-1", active ? "text-cta" : "text-primary")}>
          {label}
        </span>
      </button>
      {hovered && (
        <div className="absolute right-[6px] flex items-center gap-[2px]">
          {onPermissions && (
            <button
              onClick={(e) => { e.stopPropagation(); onPermissions(); }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors"
              title="Права доступа"
            >
              <ShieldIcon />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors"
              title="Удалить страницу"
            >
              <TrashSmIcon />
            </button>
          )}
        </div>
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

function DragDotsIcon() {
  return (
    <svg viewBox="0 0 10 16" fill="none" className="w-2.5 h-4">
      {[0, 1].map((col) =>
        [0, 1, 2].map((row) => (
          <circle key={`${col}-${row}`} cx={col * 4 + 3} cy={row * 5 + 3} r="1.2" fill="#00205F" opacity="0.4" />
        ))
      )}
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
      <path d="M10 2L3 5V10C3 14 6.5 17.5 10 18.5C13.5 17.5 17 14 17 10V5L10 2Z" stroke="#35A7FF" strokeWidth="1.6" strokeLinejoin="round" />
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
