import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { ActionOrderModal } from "@/components/modals/Modals";
import { EditActionModal } from "@/components/modals/MiscModals";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities } from "@/shared/hooks/useEntities";
import { useWorkflows } from "@/shared/hooks/useWorkflows";

const POSITIONS = ["основной", "выделенный", "встроенный", "скрыть"];
const ICON_TABS = ["Все", "Заполненные", "Тонкие", "Обычные"];

export function ActionsPage() {
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState("");
  const [position, setPosition] = useState("основной");
  const [displayOpen, setDisplayOpen] = useState(true);
  const [iconTab, setIconTab] = useState("Все");
  const [actionOrderOpen, setActionOrderOpen] = useState(false);
  const [editAction, setEditAction] = useState(false);

  const appsQuery = useApps();
  const appId = appsQuery.data?.items[0]?.id;
  const entitiesQuery = useEntities(appId);
  const entities = entitiesQuery.data ?? [];

  const workflowsQuery = useWorkflows(appId, openGroup ?? undefined);
  const workflows = workflowsQuery.data ?? [];

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Actions list panel ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1000, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[15px]">
          <h2 className="text-nav font-bold text-primary">Действия</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" className="w-5 h-5"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {entities.map((entity) => {
            const open = openGroup === entity.id;
            const entityWorkflows = open ? workflows : [];
            return (
              <div key={entity.id} className="flex flex-col">
                <button
                  onClick={() => setOpenGroup(open ? null : entity.id)}
                  className="flex items-center gap-[7px] h-[46px] px-[15px] text-left"
                >
                  <span className="flex-1 text-[18px] leading-[150%] text-primary truncate">
                    {entity.display_name} ({entity.fields.length})
                  </span>
                  {open ? (
                    <>
                      <span className="w-5 h-5"><PlusIcon /></span>
                      <span className="w-6 h-6"><LayersIcon /></span>
                      <span className="w-3 h-3 rotate-180"><Chevron /></span>
                    </>
                  ) : (
                    <span className="w-3 h-3 -rotate-90"><Chevron /></span>
                  )}
                </button>

                {open && entityWorkflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => setActiveAction(wf.id)}
                    className={cn(
                      "flex items-center gap-[7px] h-[46px] px-[15px] rounded-btn transition-colors text-left",
                      wf.id === activeAction ? "bg-selected" : "hover:bg-cardbg/50"
                    )}
                  >
                    <span className="w-6 h-6 shrink-0"><DbIcon highlight={wf.id === activeAction} /></span>
                    <span className={cn(
                      "text-[18px] leading-[150%] font-medium",
                      wf.id === activeAction ? "text-cta" : "text-primary"
                    )}>{wf.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Center: action editor ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: 380, top: 70, width: 945, height: 1000 }}
      >
        {/* Title bar */}
        <div className="h-[60px] flex items-center justify-between px-[41px] shrink-0">
          <h1 className="text-nav font-bold text-primary">
            {workflows.find((w) => w.id === activeAction)?.name ?? activeAction}
          </h1>
          <div className="flex items-center gap-2">
          <button
            onClick={() => setEditAction(true)}
            className="flex items-center gap-2 px-4 h-[32px] border border-cta/40 rounded-btn text-cta text-[13px] hover:bg-cta/10 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#35A7FF" strokeWidth="1.5" />
              <path d="M5 7h6M5 9.5h4" stroke="#35A7FF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Изменить
          </button>
          <button
            onClick={() => setActionOrderOpen(true)}
            className="flex items-center gap-2 px-4 h-[32px] border border-cta/40 rounded-btn text-cta text-[13px] hover:bg-cta/10 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <line x1="3" y1="4" x2="9" y2="4" stroke="#35A7FF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="8" x2="9" y2="8" stroke="#35A7FF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="12" x2="9" y2="12" stroke="#35A7FF" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 3v10M10 11l2 2 2-2" stroke="#35A7FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Порядок
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Сгенерированное системой */}
          <div className="flex flex-col gap-[14px] pb-[30px]">
            <h2 className="text-[20px] font-medium text-primary px-[41px] pt-[4px]">Сгенерированное системой</h2>

            <FieldRow title="Название" desc="Уникальное название для этого действия.">
              <InputPill value={workflows.find((w) => w.id === activeAction)?.name ?? activeAction} />
            </FieldRow>

            <FieldRow title="Таблица" desc="Это действие применимо к строкам какой таблицы?">
              <div className="flex items-center gap-5 w-[538px]">
                <DropdownPill value="Отчеты" className="flex-1" />
                <IconButton label="Редактировать"><EditIcon /></IconButton>
              </div>
            </FieldRow>

            <FieldRow title="Действие" desc="Тип выполняемого действия">
              <DropdownPill value="Добавить" className="w-[538px]" />
            </FieldRow>

            <FieldRow title="Положение" desc="Где действие будет отображаться в приложении." labelWidth={241}>
              <div className="flex py-[7px]">
                {POSITIONS.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => setPosition(p)}
                    className={cn(
                      "h-[41px] px-[15px] flex items-center justify-center text-[18px] font-medium bg-cardbg box-border whitespace-nowrap",
                      position === p ? "border-2 border-cta text-cta z-10" : "border border-mainbg text-primary",
                      i === 0 && "rounded-l-[18px]",
                      i === POSITIONS.length - 1 && "rounded-r-[18px]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>

          {/* Отображение */}
          <div className="border-t-2 border-white py-[10px] pb-[30px] flex flex-col gap-[20px]">
            <button onClick={() => setDisplayOpen((v) => !v)} className="flex items-center justify-between px-[40px] py-[7px]">
              <span className="text-[20px] font-bold text-primary">Отображение</span>
              <span className="w-3 h-3"><Chevron open={displayOpen} /></span>
            </button>

            {displayOpen && (
              <div className="flex flex-col gap-[30px]">
                {/* Отображаемое имя */}
                <FieldRow
                  title="Отображамое имя"
                  desc="Скрыть имя, отображаемое для этого действия в приложении. Оставьте это поле пустым, чтобы использовать только имя действия. Или задайте текстовое значение (в двойных кавычках) или формулу."
                >
                  <div className="flex items-center gap-[10px] w-[539px]">
                    <InputPill value={workflows.find((w) => w.id === activeAction)?.name ?? activeAction} className="w-[423px]" />
                    <div className="flex items-center w-[100px] h-[41px] bg-white rounded-btn overflow-hidden">
                      <span className="flex-1 h-full flex items-center justify-center bg-selected rounded-l-btn text-cta text-[22px] font-bold">T</span>
                      <span className="flex-1 h-full flex items-center justify-center"><FilterIcon /></span>
                    </div>
                  </div>
                </FieldRow>

                {/* Иконка */}
                <FieldRow title="Иконка" desc="Значок, который используется для данного действия." labelWidth={215}>
                  <div className="w-[538px] bg-white rounded-[10px] p-[3px_10px_10px] flex flex-col gap-[5px]">
                    {/* search row */}
                    <div className="flex items-center gap-[15px] h-[45px]">
                      <span className="w-[41px] h-[41px] flex items-center justify-center bg-selected rounded-full shrink-0">
                        <span className="w-[21px] h-[21px]"><BookIcon /></span>
                      </span>
                      <div className="flex-1 flex items-center gap-[10px] h-[31px] px-5 bg-selected rounded-btn">
                        <span className="w-[15px] h-[15px]"><SearchIcon /></span>
                        <span className="text-[14px] text-primary">Поиск</span>
                      </div>
                    </div>
                    {/* icon picker */}
                    <div className="bg-selected rounded-[10px] p-[13px_20px] flex flex-col gap-[10px]">
                      <div className="flex items-center gap-[10px]">
                        {ICON_TABS.map((t) => (
                          <button
                            key={t}
                            onClick={() => setIconTab(t)}
                            className={cn(
                              "h-[25px] px-[15px] flex items-center rounded-[20px] text-[12px] text-primary box-border",
                              iconTab === t ? "border-2 border-cta bg-selected" : "bg-selected"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-[10px]">
                        <div className="flex-1 h-[118px] overflow-y-auto grid grid-cols-[repeat(13,1fr)] gap-x-1 gap-y-2 content-start">
                          {Array.from({ length: 78 }).map((_, i) => (
                            <span key={i} className="w-[18px] h-[18px] text-primary"><GlyphIcon n={i} /></span>
                          ))}
                        </div>
                        <div className="w-[6px] bg-white rounded-[5px] flex justify-center p-px">
                          <div className="w-[4px] h-[18px] bg-cardbg rounded-[5px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </FieldRow>
              </div>
            )}
          </div>

          {/* Поведение / Документация */}
          <SectionHeader title="Поведение" />
          <SectionHeader title="Документация" />
        </div>
      </div>

      <PreviewPanel projectName="Отчёты" />

      {actionOrderOpen && (
        <ActionOrderModal
          viewName={openGroup ? (entities.find((e) => e.id === openGroup)?.display_name ?? "Аналитики") : "Аналитики"}
          onClose={() => setActionOrderOpen(false)}
        />
      )}

      {editAction && (
        <EditActionModal
          actionName={workflows.find((w) => w.id === activeAction)?.name ?? activeAction}
          onClose={() => setEditAction(false)}
          onSave={() => setEditAction(false)}
        />
      )}
    </div>
  );
}

/* ── Helpers ── */
function FieldRow({ title, desc, labelWidth = 188, children }: {
  title: string; desc: string; labelWidth?: number; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start px-[40px] gap-[40px]">
      <div className="flex flex-col shrink-0" style={{ width: labelWidth }}>
        <span className="text-[20px] leading-[150%] font-medium text-primary">{title}</span>
        <span className="text-[14px] leading-[150%] text-primary">{desc}</span>
      </div>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}
function SectionHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t-2 border-white py-[10px]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] font-bold text-primary">{title}</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>
    </div>
  );
}
function InputPill({ value, className }: { value: string; className?: string }) {
  const [v, setV] = useState(value);
  return (
    <div className={cn("h-[41px] bg-cardbg rounded-btn px-5 flex items-center", className ?? "w-[539px]")}>
      <input value={v} onChange={(e) => setV(e.target.value)}
        className="w-full bg-transparent text-[18px] text-primary outline-none" />
    </div>
  );
}
function DropdownPill({ value, className }: { value: string; className?: string }) {
  return (
    <button className={cn("flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary", className)}>
      <span className="truncate">{value}</span>
      <span className="w-3 h-3 shrink-0"><Chevron /></span>
    </button>
  );
}
function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full transition-colors shrink-0">
      {children}
    </button>
  );
}

/* ── Icons ── */
function Chevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={cn("w-full h-full transition-transform", open && "rotate-180")}>
      <path d="M2 4 L6 8 L10 4" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <line x1="10" y1="3" x2="10" y2="17" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M12 3 L21 8 L12 13 L3 8 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 13 L12 18 L21 13" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function DbIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke={c} strokeWidth="2" />
      <path d="M4 5 L4 19 C4 20.66 7.58 22 12 22 C16.42 22 20 20.66 20 19 L20 5" stroke={c} strokeWidth="2" />
      <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke={c} strokeWidth="2" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]">
      <rect x="5" y="6" width="13" height="13" rx="1" stroke="#00205F" strokeWidth="2" />
      <path d="M16 3 L21 8 L18.5 10.5 L13.5 5.5 Z" fill="#00205F" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M3 4 L17 4 L11 11 L11 17 L9 15 L9 11 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 21 21" fill="none" className="w-full h-full">
      <path d="M10.5 4 C8.5 2.5 5 2.5 2.5 3.5 L2.5 17 C5 16 8.5 16 10.5 17.5 C12.5 16 16 16 18.5 17 L18.5 3.5 C16 2.5 12.5 2.5 10.5 4 Z"
            stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="10.5" y1="4" x2="10.5" y2="17.5" stroke="#00205F" strokeWidth="1.8" />
    </svg>
  );
}
function GlyphIcon({ n }: { n: number }) {
  // simple varied placeholder glyphs
  const variant = n % 4;
  return (
    <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
      {variant === 0 && <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />}
      {variant === 1 && <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4" />}
      {variant === 2 && <path d="M9 2 L16 15 L2 15 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
      {variant === 3 && <path d="M9 2 L11 7 L16 7 L12 11 L13 16 L9 13 L5 16 L6 11 L2 7 L7 7 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
    </svg>
  );
}
