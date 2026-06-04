import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";

/* ── Bot groups ── */
interface BotGroup {
  id: string;
  name: string;
  count: number;
  bots?: string[];
}

// Map bot name → default action type
const BOT_ACTION_MAP: Record<string, ActionType> = {
  insert: "add",
  update: "update",
  delete: "delete",
};

type ActionType = "add" | "delete" | "update" | "run" | "send";

const GROUPS: BotGroup[] = [
  { id: "operations", name: "Операции", count: 3 },
  {
    id: "reports",
    name: "Отчеты",
    count: 0,
    bots: ["insert", "update", "delete", "Отчет TG 2", "(disable) Ошибка отчета", "New Bot 9", "Аналитические таблицы", "New Bot 10"],
  },
  { id: "nomenclature", name: "Номенклатура", count: 4 },
  { id: "min",          name: "Необходимый минимум", count: 3 },
  { id: "report-d",     name: "Детали отчета", count: 8 },
  { id: "for-report",   name: "Для отчета", count: 3 },
  { id: "defect",       name: "Журнал бракеража", count: 7 },
  { id: "receipts",     name: "Журнал поступлений", count: 7 },
  { id: "receipts-f",   name: "Журнал поступлений files", count: 2 },
];

const BOT_TABS = ["Бот", "События", "Процесс"];
const POSITIONS_DC = ["Добавить", "Удалить", "Обновить"];

export function BotPage() {
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [openGroup, setOpenGroup] = useState<string | null>("reports");
  const [activeBot, setActiveBot] = useState("insert");
  const [botTab, setBotTab] = useState("Бот");
  const [enabled, setEnabled] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("add");

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── List panel ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1005, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[25px]">
          <h2 className="text-nav font-bold text-primary">{botTab}</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" className="w-5 h-5"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {GROUPS.map((g) => {
            const open = openGroup === g.id;
            const expandable = !!g.bots;
            return (
              <div key={g.id} className="flex flex-col">
                <button
                  onClick={() => setOpenGroup(open ? null : g.id)}
                  className="flex items-center gap-[7px] h-[46px] px-[15px] text-left"
                >
                  <span className={cn(
                    "flex-1 text-[18px] leading-[150%] truncate",
                    open && expandable ? "text-cta" : "text-primary"
                  )}>
                    {g.name}{g.count > 0 ? ` (${g.count})` : ""}
                  </span>
                  {open && expandable ? (
                    <>
                      <span className="w-5 h-5"><PlusIcon highlight /></span>
                      <span className="w-6 h-6"><LayersIcon highlight /></span>
                      <span className="w-3 h-3 rotate-180"><Chevron /></span>
                    </>
                  ) : (
                    <span className="w-3 h-3 -rotate-90"><Chevron /></span>
                  )}
                </button>

                {open && g.bots?.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setActiveBot(b); if (BOT_ACTION_MAP[b]) setActionType(BOT_ACTION_MAP[b]); }}
                    className={cn(
                      "flex items-center gap-[15px] h-[46px] px-[15px] rounded-btn transition-colors text-left",
                      b === activeBot ? "bg-selected" : "hover:bg-cardbg/50"
                    )}
                  >
                    <span className="w-5 h-5 shrink-0"><RobotIcon highlight={b === activeBot} /></span>
                    <span className={cn(
                      "text-[18px] leading-[150%] font-medium truncate",
                      b === activeBot ? "text-cta" : "text-primary"
                    )}>{b}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Center ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: 380, top: 70, width: 945, height: 1000 }}
      >
        {/* Tab bar */}
        <div className="h-[55px] flex items-center gap-[30px] px-[40px] shrink-0">
          {BOT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setBotTab(t)}
              className={cn("text-[18px] font-semibold transition-colors", botTab === t ? "text-cta" : "text-primary")}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {botTab === "Бот" && <BotFlow activeBot={activeBot} enabled={enabled} onToggle={() => setEnabled((v) => !v)} />}
          {botTab === "События" && <EventEditor />}
          {botTab === "Процесс" && <ProcessGraph />}
        </div>
      </div>

      {/* ── Right panel ── */}
      {botTab === "События"
        ? <PreviewPanel projectName="Profile" />
        : <SettingsPanel actionType={actionType} onActionChange={setActionType} />}
    </div>
  );
}

/* ── Бот tab ── */
function BotFlow({ activeBot, enabled, onToggle }: { activeBot: string; enabled: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-[40px] h-[64px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">Добавление события предприятия</h1>
        <div className="flex items-center gap-5">
          <button onClick={onToggle} className={cn(
            "px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta transition-colors",
            enabled ? "bg-white text-cta" : "bg-cta text-white"
          )}>{enabled ? "Включить" : "Отключить"}</button>
          <button className="px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta text-cta">Монитор</button>
          <button aria-label="Меню" className="flex flex-col items-center gap-[3px] w-[5px] h-5 justify-center">
            {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
          </button>
        </div>
      </div>
      <div className="h-[47px] flex items-center px-[40px] bg-selected shrink-0">
        <span className="text-[18px] font-semibold text-primary">{enabled ? "Бот включён" : "Бот отключен"}</span>
      </div>
      <div className="px-[40px] pt-[25px]">
        <p className="text-[18px] font-medium text-primary mb-[20px]">Когда происходит это <span className="font-bold">СОБЫТИЕ</span></p>
        <FlowCard title={activeBot} subtitle="Позиция предприятия" />
      </div>
      <div className="px-[40px] pt-[25px] flex flex-col items-start">
        <p className="text-[18px] font-medium text-primary mb-[20px]">Запустите этот <span className="font-bold">ПРОЦЕСС</span></p>
        <StepCard />
        <div className="w-[356px] flex flex-col items-center pt-[10px]">
          <div className="w-px h-[60px] border-l-2 border-dashed border-cta" />
          <button aria-label="Добавить шаг" className="w-[43px] h-[43px] -mt-[2px]"><AddDashedIcon /></button>
        </div>
      </div>
      <div className="mt-[37px]">
        <SectionHeader title="Отображение" />
        <SectionHeader title="Документация" />
      </div>
    </>
  );
}

/* ── События tab ── */
function EventEditor() {
  const src = "Приложение";
  const [dc, setDc] = useState("Добавить");
  const [bypass, setBypass] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(true);

  return (
    <div className="flex flex-col">
      {/* title */}
      <div className="flex items-center justify-between px-[40px] h-[60px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">insert_audit</h1>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-6 h-6"><Chevron /></span>
        </div>
      </div>

      <div className="px-[40px] flex flex-col gap-[20px] pb-[30px]">
        <Row label="Название">
          <InputPill value="insert_audit" />
        </Row>
        <Row label="Источник события" desc="Выберите продукт или расписание, по которому проводится событие." labelW={247}>
          <Dropdown value={src} />
        </Row>
        <Row label="Таблица" desc="Изменение данных в какой таблице должно вызывать это событие?">
          <div className="flex items-center gap-5 w-[299px]">
            <Dropdown value="Audit" className="flex-1" />
            <IconBtn label="Редактировать"><EditIcon /></IconBtn>
          </div>
        </Row>
        <Row label="Тип изменения данных" desc="Изменение данных в какой таблице должно вызывать это событие?" labelW={236}>
          <div className="flex items-center gap-[30px] py-[7px]">
            {POSITIONS_DC.map((p) => {
              const sel = dc === p;
              const dim = !sel;
              return (
                <button key={p} onClick={() => setDc(p)} className={cn(
                  "w-[106px] h-[95px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] box-border border-2",
                  sel ? "bg-selected border-cta" : "border-[#C2DBF8]"
                )}>
                  <span className={cn("w-[39px] h-[39px]", dim && "opacity-60")}>
                    {p === "Добавить" ? <WidgetAddIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                      : p === "Удалить" ? <TrashIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                      : <DeskEditIcon c={sel ? "#35A7FF" : "#C2DBF8"} />}
                  </span>
                  <span className={cn("text-[14px] font-semibold", sel ? "text-cta" : "text-[#C2DBF8]")}>{p}</span>
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Условие" desc="Дополнительное условие, проверяемое перед запуском процесса." labelW={273}>
          <div className="flex items-center gap-[10px] w-[580px] py-[7px]">
            <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary">=</div>
            <span className="w-8 h-8"><FilterIcon /></span>
          </div>
        </Row>
        <Row label="Обойти защитные фильтры?" desc="Выполните это действие и процессы, которые оно запускает, как если бы в источниках данных не было фильтров безопасности." labelW={259}>
          <div className="py-[7px]"><Toggle on={bypass} onChange={() => setBypass((v) => !v)} /></div>
        </Row>
      </div>

      {/* Отображение */}
      <div className="border-t-2 border-white py-[10px] pb-[30px] flex flex-col gap-[20px] px-[40px]">
        <button onClick={() => setDisplayOpen((v) => !v)} className="flex items-center justify-between py-[7px]">
          <span className="text-[20px] font-bold text-primary">Отображение</span>
          <span className="w-3 h-3"><Chevron open={displayOpen} /></span>
        </button>
        {displayOpen && (
          <Row label="Значок события" desc="Значок для этого события." labelW={203}>
            <IconPicker />
          </Row>
        )}
      </div>
      <div className="px-[40px]"><SectionHeader title="Документация" inset /></div>
    </div>
  );
}

/* ── Процесс tab ── */
function ProcessGraph() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-[40px] h-[60px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">Отчет TG 2</h1>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-6 h-6"><Chevron /></span>
        </div>
      </div>

      <div className="flex flex-col items-center pt-[10px] pb-[40px]">
        {/* table card */}
        <span className="text-[12px] text-primary self-center -ml-[40px] mb-[5px]">Таблица</span>
        <div className="w-[287px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-5 flex items-center justify-between">
          <span className="flex items-center gap-[10px]">
            <span className="w-[30px] h-[30px]"><FileDocIcon /></span>
            <span className="text-[20px] font-medium text-primary">Номенклатура</span>
          </span>
          <span className="w-3 h-3"><Chevron /></span>
        </div>
        <span className="text-[12px] text-primary text-center mt-[5px]">К какой таблице применить процесс?</span>
        <span className="w-[43px] h-[43px] my-[5px]"><AddDashedIcon /></span>

        {/* main card */}
        <ProcCard icon={<ShuffleIcon />} title="Запуск поиск Id номенклатуры" />

        {/* branch */}
        <svg viewBox="0 0 520 70" className="w-[520px] h-[70px]" fill="none">
          <path d="M260 0 L260 20 M260 20 L120 20 L120 50 M260 20 L400 20 L400 50" stroke="#35A7FF" strokeWidth="2" />
          <path d="M114 44 L120 50 L126 44 M394 44 L400 50 L406 44" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Да</text>
          <text x="350" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Нет</text>
        </svg>

        {/* two children */}
        <div className="flex gap-[78px] items-start">
          <div className="flex flex-col items-center gap-[15px]">
            <ProcCard icon={<SendIcon />} title="Send_telegram" w={357} />
            <span className="w-[43px] h-[43px]"><AddDashedIcon /></span>
          </div>
          <div className="flex flex-col items-center gap-[15px]">
            <ProcCard icon={<StatusIcon />} title={`Установить статус\n“Отправлен”`} w={356} />
            <span className="w-[43px] h-[43px]"><AddDashedIcon /></span>
          </div>
        </div>

        {/* merge */}
        <svg viewBox="0 0 520 70" className="w-[520px] h-[70px]" fill="none">
          <path d="M120 0 L120 30 L260 30 L260 55 M400 0 L400 30 L260 30" stroke="#35A7FF" strokeWidth="2" />
          <path d="M254 49 L260 55 L266 49" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* merge card */}
        <ProcCard icon={<SendIcon />} title={`Установить статус\n“Отправлен”`} />
        <div className="w-px h-[40px] border-l-2 border-dashed border-cta mt-[5px]" />
      </div>
    </div>
  );
}

/* ── Shared building blocks ── */
function FlowCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="w-[356px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[20px_30px_30px] flex flex-col items-end">
      <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mb-[10px]">
        {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
      </button>
      <div className="w-full flex items-start justify-center gap-5">
        <span className="w-[30px] h-[30px] mt-[2px] shrink-0"><ShuffleIcon /></span>
        <div className="w-[209px] flex flex-col items-center">
          <span className="text-[20px] font-medium text-primary">{title}</span>
          {subtitle && <span className="text-[16px] text-primary">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

function ProcCard({ icon, title, w = 356 }: { icon: React.ReactNode; title: string; w?: number }) {
  return (
    <div className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[20px_30px_30px] flex flex-col items-end" style={{ width: w }}>
      <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mb-[10px]">
        {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
      </button>
      <div className="w-full flex items-start justify-center gap-5">
        <span className="w-[30px] h-[30px] mt-[2px] shrink-0">{icon}</span>
        <span className="w-[209px] text-center text-[20px] font-medium text-primary whitespace-pre-line">{title}</span>
      </div>
    </div>
  );
}

function Row({ label, desc, labelW = 250, children }: { label: string; desc?: string; labelW?: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-[40px]">
      <div className="flex flex-col shrink-0" style={{ width: labelW }}>
        <span className="text-[20px] leading-[150%] font-medium text-primary">{label}</span>
        {desc && <span className="text-[14px] leading-[150%] text-primary">{desc}</span>}
      </div>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function InputPill({ value }: { value: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="w-[580px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
      <input value={v} onChange={(e) => setV(e.target.value)} className="w-full bg-transparent text-[18px] text-primary outline-none" />
    </div>
  );
}
function Dropdown({ value, className }: { value: string; className?: string }) {
  return (
    <button className={cn("flex items-center justify-between gap-5 w-[580px] h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary", className)}>
      <span className="truncate">{value}</span>
      <span className="w-3 h-3 shrink-0"><Chevron /></span>
    </button>
  );
}
function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full transition-colors shrink-0">{children}</button>
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className={cn(
      "w-[55px] h-[31px] rounded-[30px] flex items-center px-[3px] transition-colors",
      on ? "bg-cardbg" : "bg-white border-2 border-cardbg"
    )}>
      <span className={cn("w-[23px] h-[23px] rounded-full transition-transform", on ? "translate-x-[24px] bg-cta" : "translate-x-0 bg-primary/30")} />
    </button>
  );
}
function IconPicker() {
  const TABS = ["Все", "Заполненные", "Тонкие", "Обычные"];
  const [tab, setTab] = useState("Все");
  return (
    <div className="w-[538px] bg-white rounded-[10px] p-[3px_10px_10px] flex flex-col gap-[5px]">
      <div className="flex items-center gap-[15px] h-[45px]">
        <span className="w-[41px] h-[41px] flex items-center justify-center bg-selected rounded-full shrink-0"><span className="w-[21px] h-[21px]"><BookIcon /></span></span>
        <div className="flex-1 flex items-center gap-[10px] h-[31px] px-5 bg-selected rounded-btn">
          <span className="w-[15px] h-[15px]"><SearchIcon /></span>
          <span className="text-[14px] text-primary">Поиск</span>
        </div>
      </div>
      <div className="bg-selected rounded-[10px] p-[13px_20px] flex flex-col gap-[10px]">
        <div className="flex items-center gap-[10px]">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              "h-[25px] px-[15px] flex items-center rounded-[20px] text-[12px] text-primary box-border bg-selected",
              tab === t && "border-2 border-cta"
            )}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(13,1fr)] gap-x-1 gap-y-2 h-[118px] overflow-y-auto content-start">
          {Array.from({ length: 78 }).map((_, i) => <span key={i} className="w-[18px] h-[18px] text-primary"><GlyphIcon n={i} /></span>)}
        </div>
      </div>
    </div>
  );
}
function SectionHeader({ title, inset }: { title: string; inset?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t-2 border-white py-[10px]">
      <button onClick={() => setOpen((v) => !v)} className={cn("w-full flex items-center justify-between py-[7px]", !inset && "px-[40px]")}>
        <span className="text-[20px] font-bold text-primary">{title}</span>
        <span className={cn("w-3 h-3 transition-transform", open ? "rotate-180" : "-rotate-90")}><Chevron /></span>
      </button>
    </div>
  );
}

// AutomationPreview removed — replaced by SettingsPanel

/* ── Step card (New step in bot flow) ── */
function StepCard() {
  return (
    <div className="w-[356px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] pt-5 pb-[30px] flex flex-col items-end">
      {/* dots menu */}
      <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mr-[30px] mb-[10px]">
        {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
      </button>
      {/* "New step" title centered */}
      <div className="w-full px-[100px] mb-[10px]">
        <div className="flex items-center justify-center h-[30px] rounded-[30px]">
          <span className="text-[20px] font-medium text-primary text-center">New step</span>
        </div>
      </div>
      {/* divider + action button */}
      <div className="relative w-full mb-[10px]">
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-selected" />
        <div className="flex justify-center">
          <button className="relative flex items-center gap-[5px] px-[18px] py-[5px] bg-white border-2 border-cta rounded-[30px]">
            <SortListIcon />
            <span className="text-[16px] font-medium text-cta">Выполнить действие с данными</span>
          </button>
        </div>
      </div>
      {/* task type dropdown */}
      <div className="w-full px-[30px]">
        <button className="w-full flex items-center justify-between px-5 py-[7px] bg-selected rounded-[30px]">
          <span className="text-[18px] text-primary">Пользовательская задача</span>
          <span className="w-3 h-3 rotate-180"><Chevron /></span>
        </button>
      </div>
    </div>
  );
}

/* ── Settings panel (right side, replaces AutomationPreview for Bot tab) ── */
const ACTION_CARDS: { type: ActionType; label: string; icon: (c: string) => React.ReactNode }[] = [
  { type: "add",    label: "Добавить\nновую строку",     icon: (c) => <WidgetAddIcon c={c} /> },
  { type: "delete", label: "Удалить\nстроку",            icon: (c) => <TrashIcon c={c} /> },
  { type: "update", label: "Настроить\nзначение строки", icon: (c) => <DeskEditIcon c={c} /> },
  { type: "run",    label: "Запустить\nдействие строки", icon: (c) => <RunRowIcon c={c} /> },
  { type: "send",   label: "Отправить\nдействие",        icon: (c) => <SendIcon2 c={c} /> },
];

function SettingsPanel({ actionType, onActionChange }: { actionType: ActionType; onActionChange: (t: ActionType) => void }) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [extraOpen, setExtraOpen] = useState(true);

  return (
    <div
      className="absolute top-[70px] bg-mainbg flex flex-col overflow-y-auto"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      <div className="flex flex-col gap-[30px] px-[40px] py-[7px]">
        {/* top row: settings btn + device toggle */}
        <div className="flex items-center gap-5 h-[40px]">
          <button aria-label="Настройки" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shrink-0">
            <span className="w-6 h-6"><GearIcon /></span>
          </button>
          <div className="flex items-center bg-white rounded-[36px] p-[3.6px] gap-0">
            <button
              onClick={() => setDevice("phone")}
              className={cn("flex items-center gap-[9px] px-5 py-[3.6px] rounded-[36px] transition-colors", device === "phone" ? "bg-selected" : "")}
            >
              <span className="w-[22px] h-[22px]"><PhoneIcon /></span>
              <span className="text-[20px] font-semibold text-primary">Смартфон</span>
            </button>
            <button
              onClick={() => setDevice("desktop")}
              className={cn("flex items-center gap-[9px] px-[11px] py-[3.6px] rounded-[36px] transition-colors", device === "desktop" ? "bg-selected" : "")}
            >
              <span className="w-[22px] h-[22px]"><DesktopIcon /></span>
              <span className="text-[20px] font-semibold text-primary">Десктоп</span>
            </button>
          </div>
        </div>

        {/* Настройки header */}
        <div className="flex items-center justify-between h-[30px]">
          <span className="text-[20px] font-semibold text-primary">Настройки</span>
          <div className="flex items-center gap-5">
            <span className="w-6 h-6"><LinkIcon /></span>
            <button className="w-6 h-6"><Chevron /></button>
          </div>
        </div>

        {/* Action type cards grid */}
        <div className="flex flex-wrap gap-x-[25px] gap-y-[30px] w-[500px]">
          {ACTION_CARDS.map(({ type, label, icon }) => {
            const active = actionType === type;
            const c = active ? "#35A7FF" : "#C2DBF8";
            return (
              <button
                key={type}
                onClick={() => onActionChange(type)}
                className={cn(
                  "w-[106px] h-[116px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] border-2 transition-colors box-border",
                  active ? "bg-selected border-cta" : "bg-white border-[#C2DBF8]"
                )}
              >
                <span className="w-[44px] h-[44px]">{icon(c)}</span>
                <span className={cn("text-[12px] font-semibold text-center leading-[1.2] whitespace-pre-line", active ? "text-cta" : "text-[#C2DBF8]")}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic content based on action type */}
        {actionType === "add" && (
          <>
            {/* Добавьте строку в эту таблицу */}
            <div className="flex flex-col gap-[5px] w-[500px]">
              <span className="text-[20px] font-medium text-primary">Добавьте строку в эту таблицу</span>
              <button className="flex items-center justify-between px-5 py-[7px] bg-selected rounded-[30px] w-[277px]">
                <span className="text-[18px] text-primary">Не указан</span>
                <span className="w-3 h-3 rotate-180"><Chevron /></span>
              </button>
            </div>
            <ColumnConfig />
            <ExtraSection open={extraOpen} onToggle={() => setExtraOpen(v => !v)} />
          </>
        )}

        {actionType === "update" && (
          <>
            <ColumnConfig />
            <ExtraSection open={extraOpen} onToggle={() => setExtraOpen(v => !v)} />
          </>
        )}

        {actionType === "delete" && (
          <div className="w-[500px]">
            <span className="text-[20px] font-medium text-primary">Строка будет удалена</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnConfig() {
  return (
    <div className="flex flex-col gap-[5px] w-[500px]">
      <span className="text-[20px] font-medium text-primary">Настроить эти столбцы</span>
      <div className="flex flex-col gap-[5px]">
        {/* Column row */}
        <div className="flex items-center justify-between h-[43px] px-5 bg-white rounded-[20px] w-[500px]">
          <span className="flex items-center gap-[2px]">
            <DotsHandleIcon /><DotsHandleIcon />
          </span>
          <div className="flex items-center gap-[10px]">
            <button className="w-[173px] h-[41px] flex items-center px-5 bg-selected rounded-[30px]">
              <span className="text-[18px] text-primary">Имя</span>
            </button>
            <span className="text-[20px] font-medium text-black">=</span>
            <button className="w-[172px] h-[41px] flex items-center px-5 bg-selected rounded-[30px]" />
            <span className="w-[27px] h-[27px]"><FilterIcon /></span>
            <span className="w-[28px] h-[28px]"><TrashIcon c="#00205F" /></span>
          </div>
        </div>
        {/* Add button */}
        <button className="flex items-center justify-center w-10 h-10">
          <span className="w-5 h-5"><PlusIcon /></span>
        </button>
      </div>
    </div>
  );
}

function ExtraSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-[5px] w-[500px]">
      <button onClick={onToggle} className="flex items-center justify-between">
        <span className="text-[20px] font-bold text-primary">Дополнительно</span>
        <span className={cn("w-3 h-3 transition-transform", open ? "" : "rotate-180")}><Chevron /></span>
      </button>
      {open && (
        <div className="flex flex-col gap-[5px]">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[20px] font-medium text-primary">Входные</span>
            <span className="text-[14px] text-primary leading-[150%]">Список входных данных, которые могут быть использованы в этой задаче.</span>
          </div>
          {/* Inputs row */}
          <div className="flex flex-col gap-[5px]">
            <div className="flex items-start justify-between bg-white rounded-[20px] px-5 py-[8px] w-[500px]">
              <span className="flex items-center gap-[2px] mt-[10px]">
                <DotsHandleIcon /><DotsHandleIcon />
              </span>
              <div className="flex flex-col gap-[5px] flex-1 ml-[10px]">
                <div className="flex items-center gap-[10px]">
                  <button className="w-[173px] h-[41px] flex items-center px-5 bg-selected rounded-[30px]">
                    <span className="text-[18px] text-primary">Имя</span>
                  </button>
                  <button className="w-[173px] h-[41px] flex items-center justify-between px-5 bg-selected rounded-[30px]">
                    <span className="text-[18px] text-primary">Тип</span>
                    <span className="w-3 h-3 rotate-180"><Chevron /></span>
                  </button>
                </div>
                <div className="flex items-center gap-[10px]">
                  <button className="w-[359px] h-[41px] flex items-center px-5 bg-selected rounded-[30px]">
                    <span className="text-[20px] text-black">=</span>
                  </button>
                  <span className="w-[27px] h-[27px]"><FilterIcon /></span>
                </div>
              </div>
            </div>
            <button className="flex items-center justify-center w-10 h-10">
              <span className="w-5 h-5"><PlusIcon /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */
function Chevron({ open }: { open?: boolean }) {
  return <svg viewBox="0 0 12 12" fill="none" className={cn("w-full h-full", open && "rotate-180")}><path d="M2 4 L6 8 L10 4" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><circle cx="9" cy="9" r="6" stroke="#00205F" strokeWidth="2" /><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function PlusIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><line x1="10" y1="3" x2="10" y2="17" stroke={c} strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="10" x2="17" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg>;
}
function LayersIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M12 3 L21 8 L12 13 L3 8 Z" stroke={c} strokeWidth="2" strokeLinejoin="round" /><path d="M3 13 L12 18 L21 13" stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>;
}
function RobotIcon({ highlight }: { highlight?: boolean }) {
  const c = highlight ? "#35A7FF" : "#00205F";
  return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><rect x="3" y="7" width="14" height="10" rx="2" stroke={c} strokeWidth="1.8" /><line x1="10" y1="2.5" x2="10" y2="7" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><circle cx="10" cy="2.5" r="1.3" fill={c} /><circle cx="7.5" cy="12" r="1.2" fill={c} /><circle cx="12.5" cy="12" r="1.2" fill={c} /></svg>;
}
function ShuffleIcon() {
  return <svg viewBox="0 0 30 30" fill="none" className="w-full h-full"><path d="M3 8 L8 8 L20 22 L27 22" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 22 L8 22 L13 16" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 11 L20 8 L27 8" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 5 L27 8 L24 11 M24 19 L27 22 L24 25" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function AddDashedIcon() {
  return <svg viewBox="0 0 43 43" fill="none" className="w-full h-full"><circle cx="21.5" cy="21.5" r="19" stroke="#35A7FF" strokeWidth="1.8" strokeDasharray="4 4" /><line x1="21.5" y1="13" x2="21.5" y2="30" stroke="#35A7FF" strokeWidth="2.15" strokeLinecap="round" /><line x1="13" y1="21.5" x2="30" y2="21.5" stroke="#35A7FF" strokeWidth="2.15" strokeLinecap="round" /></svg>;
}
function GearIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="3" stroke="#00205F" strokeWidth="2" /><path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function PhoneIcon() {
  return <svg viewBox="0 0 23 23" fill="none" className="w-full h-full"><rect x="4" y="1" width="15" height="21" rx="3" stroke="#00205F" strokeWidth="2" /><circle cx="11.5" cy="18.5" r="1" fill="#00205F" /></svg>;
}
function DesktopIcon() {
  return <svg viewBox="0 0 23 23" fill="none" className="w-full h-full"><rect x="1" y="2" width="21" height="14" rx="2" stroke="#00205F" strokeWidth="2" /><path d="M7 20 L16 20 M11.5 16 L11.5 20" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function LinkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M10 14 C11 15 13 15 14 14 L17 11 C18.5 9.5 18.5 7 17 5.5 C15.5 4 13 4 11.5 5.5 L10 7" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><path d="M14 10 C13 9 11 9 10 10 L7 13 C5.5 14.5 5.5 17 7 18.5 C8.5 20 11 20 12.5 18.5 L14 17" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]"><rect x="5" y="6" width="13" height="13" rx="1" stroke="#00205F" strokeWidth="2" /><path d="M16 3 L21 8 L18.5 10.5 L13.5 5.5 Z" fill="#00205F" /></svg>;
}
function FilterIcon() {
  return <svg viewBox="0 0 32 32" fill="none" className="w-full h-full"><path d="M5 7 L27 7 L18 16 L18 26 L14 23 L14 16 Z" stroke="#00205F" strokeWidth="3" strokeLinejoin="round" /></svg>;
}
function WidgetAddIcon({ c }: { c: string }) {
  return <svg viewBox="0 0 39 39" fill="none" className="w-full h-full"><rect x="5" y="5" width="11" height="11" rx="1.6" stroke={c} strokeWidth="3.25" /><rect x="23" y="5" width="11" height="11" rx="1.6" stroke={c} strokeWidth="3.25" /><rect x="5" y="23" width="11" height="11" rx="1.6" stroke={c} strokeWidth="3.25" /><line x1="28.5" y1="23" x2="28.5" y2="34" stroke={c} strokeWidth="3.25" strokeLinecap="round" /><line x1="23" y1="28.5" x2="34" y2="28.5" stroke={c} strokeWidth="3.25" strokeLinecap="round" /></svg>;
}
function TrashIcon({ c }: { c: string }) {
  return <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><path d="M11 13 L33 13" stroke={c} strokeWidth="3.66" strokeLinecap="round" /><path d="M17 13 L17 9 L27 9 L27 13" stroke={c} strokeWidth="3.66" /><path d="M14 13 L15 36 L29 36 L30 13" stroke={c} strokeWidth="3.66" strokeLinejoin="round" /></svg>;
}
function DeskEditIcon({ c }: { c: string }) {
  return <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><rect x="9" y="9" width="22" height="26" rx="2" stroke={c} strokeWidth="3" /><path d="M28 7 L35 14 L24 25 L17 25 L17 18 Z" fill="#F1F6FF" stroke={c} strokeWidth="2.3" strokeLinejoin="round" /></svg>;
}
function FileDocIcon() {
  return <svg viewBox="0 0 30 30" fill="none" className="w-full h-full"><path d="M7 3 L18 3 L24 9 L24 27 L7 27 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" /><path d="M18 3 L18 9 L24 9" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" /><line x1="11" y1="16" x2="20" y2="16" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /><line x1="11" y1="21" x2="16" y2="21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function SendIcon() {
  return <svg viewBox="0 0 30 30" fill="none" className="w-full h-full"><path d="M26 4 L3 14 L12 17 L15 26 L26 4 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" /><path d="M12 17 L26 4" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function StatusIcon() {
  return <svg viewBox="0 0 30 30" fill="none" className="w-full h-full"><path d="M5 9 L18 9 M5 15 L18 15 M5 21 L13 21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /><circle cx="23" cy="8" r="4" fill="#00205F" /></svg>;
}
function BookIcon() {
  return <svg viewBox="0 0 21 21" fill="none" className="w-full h-full"><path d="M10.5 4 C8.5 2.5 5 2.5 2.5 3.5 L2.5 17 C5 16 8.5 16 10.5 17.5 C12.5 16 16 16 18.5 17 L18.5 3.5 C16 2.5 12.5 2.5 10.5 4 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /><line x1="10.5" y1="4" x2="10.5" y2="17.5" stroke="#00205F" strokeWidth="1.8" /></svg>;
}
function GlyphIcon({ n }: { n: number }) {
  const v = n % 4;
  return <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
    {v === 0 && <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />}
    {v === 1 && <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4" />}
    {v === 2 && <path d="M9 2 L16 15 L2 15 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
    {v === 3 && <path d="M9 2 L11 7 L16 7 L12 11 L13 16 L9 13 L5 16 L6 11 L2 7 L7 7 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
  </svg>;
}
function SortListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><line x1="5" y1="7" x2="11" y2="7" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><line x1="5" y1="12" x2="11" y2="12" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><line x1="5" y1="17" x2="11" y2="17" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><rect x="14" y="5" width="5" height="5" rx="1" stroke="#35A7FF" strokeWidth="2" transform="rotate(90 16 8.5)" /><path d="M17 13 L17 19 L20 16" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function RunRowIcon({ c }: { c: string }) {
  return <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><path d="M9 9 L35 22 L9 35 Z" stroke={c} strokeWidth="3.5" strokeLinejoin="round" /></svg>;
}
function SendIcon2({ c }: { c: string }) {
  return <svg viewBox="0 0 44 44" fill="none" className="w-full h-full"><path d="M38 6 L6 20 L18 25 L22 38 L38 6 Z" stroke={c} strokeWidth="3.5" strokeLinejoin="round" /><path d="M18 25 L38 6" stroke={c} strokeWidth="3.5" strokeLinecap="round" /></svg>;
}
function DotsHandleIcon() {
  return <svg viewBox="0 0 5 20" fill="none" className="w-[5px] h-5"><circle cx="2.5" cy="4" r="1.5" fill="#00205F" /><circle cx="2.5" cy="10" r="1.5" fill="#00205F" /><circle cx="2.5" cy="16" r="1.5" fill="#00205F" /></svg>;
}
// AutomationIllustration removed (no longer used)
