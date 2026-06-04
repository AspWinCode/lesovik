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
                    onClick={() => setActiveBot(b)}
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

      {/* ── Preview ── */}
      {botTab === "События"
        ? <PreviewPanel projectName="Profile" />
        : <AutomationPreview />}
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
        <FlowCard title="New Step" />
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

function AutomationPreview() {
  return (
    <div className="absolute top-[70px] bg-mainbg flex flex-col items-center"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px", paddingTop: 7 }}>
      <div className="flex items-center gap-5 px-[46px] h-[40px]">
        <button aria-label="Настройки" className="w-10 h-10 flex items-center justify-center bg-white rounded-full"><span className="w-6 h-6"><GearIcon /></span></button>
        <div className="flex items-center bg-white rounded-[36px] p-[3.6px] gap-[20px] pr-5">
          <span className="flex items-center gap-[9px] px-5 py-[3.6px] bg-selected rounded-[36px]">
            <span className="w-[22px] h-[22px]"><PhoneIcon /></span><span className="text-nav font-semibold text-primary">Смартфон</span>
          </span>
          <span className="flex items-center gap-[9px] px-[11px] py-[3.6px]">
            <span className="w-[22px] h-[22px]"><DesktopIcon /></span><span className="text-nav font-semibold text-primary">Десктоп</span>
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center" style={{ marginTop: 265 }}>
        <span className="w-[278px] h-[278px]"><AutomationIllustration /></span>
        <span className="text-nav font-semibold text-cta mt-[10px]">Настройки автоматизации</span>
      </div>
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
function AutomationIllustration() {
  return <svg viewBox="0 0 278 278" fill="none" className="w-full h-full">
    <rect x="40" y="150" width="180" height="110" rx="10" stroke="#35A7FF" strokeWidth="6" />
    <rect x="20" y="258" width="238" height="12" rx="6" fill="#35A7FF" />
    <circle cx="110" cy="95" r="42" stroke="#35A7FF" strokeWidth="6" />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={110 + Math.cos(a) * 42} y1={95 + Math.sin(a) * 42} x2={110 + Math.cos(a) * 56} y2={95 + Math.sin(a) * 56} stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" />;
    })}
    <circle cx="110" cy="95" r="16" stroke="#35A7FF" strokeWidth="6" />
    <circle cx="185" cy="150" r="26" stroke="#35A7FF" strokeWidth="6" />
    <path d="M210 60 C235 70 240 110 215 125" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" />
    <path d="M210 50 L210 62 L222 60" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
