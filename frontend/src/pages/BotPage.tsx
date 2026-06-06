import { useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import {
  useRules,
  useActivateRule,
  useDeactivateRule,
  useDeleteRule,
  useUpdateRule,
} from "@/shared/hooks/useRules";
import type { Rule } from "@/shared/api/rules";
import { useEntities } from "@/shared/hooks/useEntities";

const BOT_TABS = ["Бот", "События", "Процесс"];
const POSITIONS_DC = ["Добавить", "Удалить", "Обновить"];

function triggerLabel(event: string): string {
  if (event === "record.created") return "insert";
  if (event === "record.updated") return "update";
  if (event === "record.deleted") return "delete";
  return event;
}

function eventToDc(event: string): string {
  if (event === "record.created") return "Добавить";
  if (event === "record.deleted") return "Удалить";
  return "Обновить";
}

function dcToEvent(dc: string): string {
  if (dc === "Добавить") return "record.created";
  if (dc === "Удалить") return "record.deleted";
  return "record.updated";
}

export function BotPage() {
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [botTab, setBotTab] = useState("Бот");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(true);

  const { data: appsData } = useApps();
  const appId = appsData?.items[0]?.id;

  const { data: rules = [], isLoading } = useRules(appId);
  const activateRule  = useActivateRule(appId ?? "");
  const deactivateRule = useDeactivateRule(appId ?? "");
  const deleteRule    = useDeleteRule(appId ?? "");
  const updateRule    = useUpdateRule(appId ?? "");

  useEffect(() => {
    if (rules.length > 0 && !activeRuleId) setActiveRuleId(rules[0].id);
  }, [rules, activeRuleId]);

  const activeRule = rules.find((r) => r.id === activeRuleId) ?? null;

  function handleToggle() {
    if (!activeRule || !appId) return;
    if (activeRule.is_active) {
      deactivateRule.mutate(activeRule.id);
    } else {
      activateRule.mutate(activeRule.id);
    }
  }

  function handleDelete(ruleId: string) {
    if (!appId) return;
    deleteRule.mutate(ruleId);
    if (activeRuleId === ruleId) setActiveRuleId(rules.find((r) => r.id !== ruleId)?.id ?? null);
    setOpenMenuId(null);
  }

  function handleRename(ruleId: string) {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || !appId) return;
    const name = window.prompt("Новое название:", rule.name);
    if (name && name.trim() && name.trim() !== rule.name) {
      updateRule.mutate({ ruleId, body: { name: name.trim() } });
    }
    setOpenMenuId(null);
  }

  return (
    <div
      className="relative w-[1920px] h-[1080px] bg-white overflow-hidden"
      onClick={() => setOpenMenuId(null)}
    >
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── List panel ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1005, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[25px]">
          <h2 className="text-[20px] font-bold text-primary">События</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" className="w-5 h-5"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Single "Отчеты" group */}
          <button
            onClick={() => setGroupOpen((v) => !v)}
            className="flex items-center gap-[7px] h-[46px] px-[15px] text-left"
          >
            <span className={cn("flex-1 text-[18px] leading-[150%] truncate", groupOpen ? "text-cta" : "text-primary")}>
              {`Отчеты${rules.length > 0 ? ` (${rules.length})` : ""}`}
            </span>
            {groupOpen ? (
              <>
                <span className="w-5 h-5"><PlusIcon highlight /></span>
                <span className="w-6 h-6"><LayersIcon highlight /></span>
                <span className="w-3 h-3 rotate-180"><Chevron /></span>
              </>
            ) : (
              <span className="w-3 h-3 -rotate-90"><Chevron /></span>
            )}
          </button>

          {groupOpen && isLoading && (
            <div className="px-[15px] py-2 text-[14px] text-primary/60">Загрузка…</div>
          )}

          {groupOpen && !isLoading && rules.length === 0 && (
            <div className="px-[15px] py-2 text-[14px] text-primary/60">Нет событий</div>
          )}

          {groupOpen && rules.map((rule) => (
            <BotItem
              key={rule.id}
              rule={rule}
              isActive={rule.id === activeRuleId}
              menuOpen={openMenuId === rule.id}
              onClick={() => { setActiveRuleId(rule.id); setOpenMenuId(null); }}
              onMenuOpen={(e) => { e.stopPropagation(); setOpenMenuId((v) => v === rule.id ? null : rule.id); }}
              onRename={() => handleRename(rule.id)}
              onDelete={() => handleDelete(rule.id)}
            />
          ))}
        </div>
      </aside>

      {/* ── Center panel ── */}
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
          {botTab === "Бот" && (
            <BotFlow rule={activeRule} onToggle={handleToggle} />
          )}
          {botTab === "События" && (
            <EventEditor
              rule={activeRule}
              appId={appId}
              onSave={(ruleId, body) => updateRule.mutate({ ruleId, body })}
            />
          )}
          {botTab === "Процесс" && <ProcessGraph rule={activeRule} appId={appId} />}
        </div>
      </div>

      {/* ── Right panel — always illustration per design ── */}
      {botTab === "События"
        ? <PreviewPanel projectName="Profile" />
        : <AutomationPreview />}
    </div>
  );
}

/* ── Bot list item (pill, always visible bg, hover shows dots) ── */
function BotItem({
  rule,
  isActive,
  menuOpen,
  onClick,
  onMenuOpen,
  onRename,
  onDelete,
}: {
  rule: Rule;
  isActive: boolean;
  menuOpen: boolean;
  onClick: () => void;
  onMenuOpen: (e: React.MouseEvent) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative px-[15px]">
      <div
        className={cn(
          "group flex items-center gap-[15px] h-[46px] px-[15px] rounded-[30px] cursor-pointer transition-colors",
          isActive ? "bg-selected" : "bg-mainbg hover:bg-selected/60",
          !rule.is_active && "opacity-60",
        )}
        onClick={onClick}
      >
        <span className="w-5 h-5 shrink-0"><RobotIcon highlight={isActive} /></span>
        <span className={cn(
          "flex-1 text-[18px] leading-[150%] font-medium truncate",
          isActive ? "text-cta" : "text-primary",
        )}>
          {rule.name}
        </span>
        {/* 3-dot menu — visible on hover or when menu is open */}
        <button
          onClick={onMenuOpen}
          className={cn(
            "flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center shrink-0 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-label="Меню"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("w-1 h-1 rounded-full", isActive ? "bg-cta" : "bg-primary")} />
          ))}
        </button>
      </div>

      {/* Context dropdown */}
      {menuOpen && (
        <div
          className="absolute right-[15px] top-[48px] z-50 w-[160px] bg-white rounded-[25px] shadow-[10px_10px_20px_rgba(0,0,0,0.25),-10px_-10px_20px_rgba(0,0,0,0.25)] p-[5px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: "Переименовать", action: onRename },
            { label: "Удалить",       action: onDelete },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="text-left px-[30px] py-[11px] text-[16px] font-medium text-primary bg-mainbg rounded-[30px] hover:bg-selected transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Right panel: automation illustration ── */
function AutomationPreview() {
  return (
    <div
      className="absolute top-[70px] bg-mainbg flex flex-col items-center justify-center"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      <div className="flex flex-col items-center gap-[30px]">
        {/* Gear/automation SVG illustration */}
        <svg viewBox="0 0 278 278" fill="none" className="w-[278px] h-[278px]">
          {/* Outer gear */}
          <circle cx="139" cy="139" r="90" stroke="#35A7FF" strokeWidth="8" />
          <circle cx="139" cy="139" r="60" stroke="#35A7FF" strokeWidth="6" />
          {/* Gear teeth */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 139 + 90 * Math.cos(angle);
            const y1 = 139 + 90 * Math.sin(angle);
            const x2 = 139 + 108 * Math.cos(angle);
            const y2 = 139 + 108 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#35A7FF" strokeWidth="10" strokeLinecap="round" />;
          })}
          {/* Inner circle */}
          <circle cx="139" cy="139" r="28" fill="#CBE3FF" stroke="#35A7FF" strokeWidth="5" />
          {/* Small gear (top-right) */}
          <circle cx="210" cy="68" r="38" stroke="#35A7FF" strokeWidth="5" />
          <circle cx="210" cy="68" r="24" stroke="#35A7FF" strokeWidth="4" />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = 210 + 38 * Math.cos(angle);
            const y1 = 68 + 38 * Math.sin(angle);
            const x2 = 210 + 48 * Math.cos(angle);
            const y2 = 68 + 48 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#35A7FF" strokeWidth="7" strokeLinecap="round" />;
          })}
          <circle cx="210" cy="68" r="12" fill="#CBE3FF" stroke="#35A7FF" strokeWidth="4" />
          {/* Arrows (download-like) */}
          <path d="M100 210 L100 240 M100 240 L80 220 M100 240 L120 220" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M178 210 L178 240 M178 240 L158 220 M178 240 L198 220" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <span className="text-[20px] font-semibold text-cta">Настройки автоматизации</span>
      </div>
    </div>
  );
}

/* ── Бот tab ── */
function BotFlow({ rule, onToggle }: { rule: Rule | null; onToggle: () => void }) {
  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary/60 text-[18px]">
        Выберите событие из списка
      </div>
    );
  }

  const eventLabel = triggerLabel(rule.trigger?.event ?? "");

  return (
    <>
      <div className="flex items-center justify-between px-[40px] h-[64px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">{rule.name}</h1>
        <div className="flex items-center gap-5">
          <button
            onClick={onToggle}
            className={cn(
              "px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta transition-colors",
              rule.is_active ? "bg-white text-cta" : "bg-cta text-white",
            )}
          >
            {rule.is_active ? "Отключить" : "Включить"}
          </button>
          <button className="px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta text-cta">
            Монитор
          </button>
          <button aria-label="Меню" className="flex flex-col items-center gap-[3px] w-[5px] h-5 justify-center">
            {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
          </button>
        </div>
      </div>

      <div className="h-[47px] flex items-center px-[40px] bg-selected shrink-0">
        <span className="text-[18px] font-semibold text-primary">
          {rule.is_active ? "Бот включён" : "Бот отключен"}
        </span>
      </div>

      <div className="px-[40px] pt-[25px]">
        <p className="text-[18px] font-medium text-primary mb-[20px]">
          Когда происходит это <span className="font-bold">СОБЫТИЕ</span>
        </p>
        <FlowCard title={eventLabel} subtitle="Позиция предприятия" />
      </div>

      <div className="px-[40px] pt-[25px] flex flex-col items-start">
        <p className="text-[18px] font-medium text-primary mb-[20px]">
          Запустите этот <span className="font-bold">ПРОЦЕСС</span>
        </p>
        <StepCard />
        <div className="w-[356px] flex flex-col items-center pt-[10px]">
          <div className="w-px h-[60px] border-l-2 border-dashed border-cta" />
          <button aria-label="Добавить шаг" className="w-[43px] h-[43px] -mt-[2px]">
            <AddDashedIcon />
          </button>
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
function EventEditor({
  rule,
  appId,
  onSave,
}: {
  rule: Rule | null;
  appId: string | undefined;
  onSave: (ruleId: string, body: Record<string, unknown>) => void;
}) {
  const [dc, setDc] = useState(() => eventToDc(rule?.trigger?.event ?? "record.created"));
  const [bypass, setBypass] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(true);
  const [showSrc, setShowSrc] = useState(false);
  const [showEntityDd, setShowEntityDd] = useState(false);
  const [src, setSrc] = useState("Приложение");
  const [nameVal, setNameVal] = useState(rule?.name ?? "");

  const { data: entities = [] } = useEntities(appId);

  const selectedEntity = entities.find((e) => e.id === rule?.entity_id) ?? entities[0] ?? null;

  useEffect(() => {
    if (rule) {
      setDc(eventToDc(rule.trigger?.event ?? "record.created"));
      setNameVal(rule.name);
    }
  }, [rule?.id]);

  function saveName() {
    if (!rule || !nameVal.trim() || nameVal.trim() === rule.name) return;
    onSave(rule.id, { name: nameVal.trim() });
  }

  function handleDcChange(p: string) {
    setDc(p);
    if (!rule) return;
    onSave(rule.id, { trigger: { ...rule.trigger, event: dcToEvent(p) } });
  }

  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary/60 text-[18px]">
        Выберите событие из списка
      </div>
    );
  }

  return (
    <div className="flex flex-col relative" onClick={() => { setShowSrc(false); setShowEntityDd(false); }}>
      {/* Header */}
      <div className="flex items-center justify-between px-[40px] h-[60px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">{rule.name}</h1>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-6 h-6"><Chevron /></span>
        </div>
      </div>

      {/* Settings section header */}
      <div className="flex items-center justify-between px-[40px] h-[47px] bg-selected shrink-0 mb-[20px]">
        <span className="text-[18px] font-semibold text-primary">Настройки</span>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-3 h-3"><Chevron /></span>
        </div>
      </div>

      <div className="px-[40px] flex flex-col gap-[20px] pb-[30px]">
        {/* Название */}
        <Row label="Название">
          <div className="w-[580px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
              className="w-full bg-transparent text-[18px] text-primary outline-none"
            />
          </div>
        </Row>

        {/* Источник события */}
        <Row label="Источник события" desc="Выберите продукт или расписание, по которому проводится событие." labelW={247}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowSrc((v) => !v); setShowEntityDd(false); }}
              className="flex items-center justify-between gap-5 w-[580px] h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary"
            >
              <span className="truncate">{src}</span>
              <span className={cn("w-3 h-3 shrink-0 transition-transform", showSrc && "rotate-180")}><Chevron /></span>
            </button>
            {showSrc && (
              <SourceDropdown
                value={src}
                onChange={(v) => { setSrc(v); setShowSrc(false); }}
              />
            )}
          </div>
        </Row>

        {/* Таблица */}
        <Row label="Таблица" desc="Изменение данных в какой таблице должно вызывать это событие?">
          <div className="flex items-center gap-[10px] w-[580px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex-1">
              <button
                onClick={() => { setShowEntityDd((v) => !v); setShowSrc(false); }}
                className="flex items-center justify-between gap-5 w-full h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary"
              >
                <span className="truncate">{selectedEntity?.display_name ?? "Выберите таблицу"}</span>
                <span className={cn("w-3 h-3 shrink-0 transition-transform", showEntityDd && "rotate-180")}><Chevron /></span>
              </button>
              {showEntityDd && entities.length > 0 && (
                <div className="absolute top-[44px] left-0 z-50 w-full bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-[5px] flex flex-col max-h-[280px] overflow-y-auto">
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => {
                        if (rule) onSave(rule.id, { entity_id: ent.id });
                        setShowEntityDd(false);
                      }}
                      className={cn(
                        "flex items-center gap-[15px] px-[20px] py-[10px] rounded-[20px] text-[16px] font-medium text-primary transition-colors text-left",
                        ent.id === (rule?.entity_id ?? entities[0]?.id)
                          ? "bg-selected"
                          : "bg-white hover:bg-selected/60",
                      )}
                    >
                      <span className="w-5 h-5 shrink-0"><FileDocIcon /></span>
                      {ent.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <IconBtn label="Редактировать"><EditIcon /></IconBtn>
          </div>
        </Row>

        {/* Тип изменения данных */}
        <Row label="Тип изменения данных" desc="Изменение данных в какой таблице должно вызывать это событие?" labelW={236}>
          <div className="flex items-center gap-[30px] py-[7px]">
            {POSITIONS_DC.map((p) => {
              const sel = dc === p;
              return (
                <button
                  key={p}
                  onClick={() => handleDcChange(p)}
                  className={cn(
                    "w-[106px] h-[95px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] box-border border-2 transition-colors",
                    sel ? "bg-selected border-cta" : "border-[#C2DBF8] hover:border-cta/40",
                  )}
                >
                  <span className="w-[39px] h-[39px]">
                    {p === "Добавить"
                      ? <WidgetAddIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                      : p === "Удалить"
                        ? <TrashIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                        : <DeskEditIcon c={sel ? "#35A7FF" : "#C2DBF8"} />}
                  </span>
                  <span className={cn("text-[14px] font-semibold", sel ? "text-cta" : "text-[#C2DBF8]")}>{p}</span>
                </button>
              );
            })}
          </div>
        </Row>

        {/* Условие */}
        <Row label="Условие" desc="Дополнительное условие, проверяемое перед запуском процесса." labelW={273}>
          <div className="flex items-center gap-[10px] w-[580px] py-[7px]">
            <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary">=</div>
            <span className="w-8 h-8"><FilterIcon /></span>
          </div>
        </Row>

        {/* Обойти защитные фильтры */}
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
function ProcessGraph({ rule, appId }: { rule: Rule | null; appId: string | undefined }) {
  const { data: entities = [] } = useEntities(appId);

  const entityName = entities.find((e) => e.id === rule?.entity_id)?.display_name
    ?? entities[0]?.display_name
    ?? "Таблица";

  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary/60 text-[18px]">
        Выберите событие из списка
      </div>
    );
  }

  const eventLabel = triggerLabel(rule.trigger?.event ?? "");

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-[40px] h-[60px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">{rule.name}</h1>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-6 h-6"><Chevron /></span>
        </div>
      </div>
      <div className="flex flex-col items-center pt-[10px] pb-[40px]">
        <span className="text-[12px] text-primary self-center -ml-[40px] mb-[5px]">Таблица</span>
        <div className="w-[287px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-5 flex items-center justify-between">
          <span className="flex items-center gap-[10px]">
            <span className="w-[30px] h-[30px]"><FileDocIcon /></span>
            <span className="text-[20px] font-medium text-primary">{entityName}</span>
          </span>
          <span className="w-3 h-3"><Chevron /></span>
        </div>
        <span className="text-[12px] text-primary text-center mt-[5px]">К какой таблице применить процесс?</span>
        <span className="w-[43px] h-[43px] my-[5px]"><AddDashedIcon /></span>
        <ProcCard icon={<ShuffleIcon />} title={`Запуск ${eventLabel}`} />
        <svg viewBox="0 0 520 70" className="w-[520px] h-[70px]" fill="none">
          <path d="M260 0 L260 20 M260 20 L120 20 L120 50 M260 20 L400 20 L400 50" stroke="#35A7FF" strokeWidth="2" />
          <path d="M114 44 L120 50 L126 44 M394 44 L400 50 L406 44" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Да</text>
          <text x="350" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Нет</text>
        </svg>
        <div className="flex gap-[78px] items-start">
          <div className="flex flex-col items-center gap-[15px]">
            <ProcCard icon={<SendIcon />} title="Send_telegram" w={357} />
            <span className="w-[43px] h-[43px]"><AddDashedIcon /></span>
          </div>
          <div className="flex flex-col items-center gap-[15px]">
            <ProcCard icon={<StatusIcon />} title={`Установить статус\n"Отправлен"`} w={356} />
            <span className="w-[43px] h-[43px]"><AddDashedIcon /></span>
          </div>
        </div>
        <svg viewBox="0 0 520 70" className="w-[520px] h-[70px]" fill="none">
          <path d="M120 0 L120 30 L260 30 L260 55 M400 0 L400 30 L260 30" stroke="#35A7FF" strokeWidth="2" />
          <path d="M254 49 L260 55 L266 49" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <ProcCard icon={<SendIcon />} title={`Установить статус\n"Отправлен"`} />
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

function ProcCard({ icon, title, w = 356 }: { icon: ReactNode; title: string; w?: number }) {
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

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full transition-colors shrink-0">
      {children}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={on} className={cn(
      "w-[55px] h-[31px] rounded-[30px] flex items-center px-[3px] transition-colors",
      on ? "bg-cardbg" : "bg-white border-2 border-cardbg",
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
        <span className="w-[41px] h-[41px] flex items-center justify-center bg-selected rounded-full shrink-0">
          <span className="w-[21px] h-[21px]"><BookIcon /></span>
        </span>
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
              tab === t && "border-2 border-cta",
            )}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(13,1fr)] gap-x-1 gap-y-2 h-[118px] overflow-y-auto content-start">
          {Array.from({ length: 78 }).map((_, i) => (
            <span key={i} className="w-[18px] h-[18px] text-primary"><GlyphIcon n={i} /></span>
          ))}
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

function StepCard() {
  return (
    <div className="w-[356px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] pt-5 pb-[30px] flex flex-col items-end">
      <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mr-[30px] mb-[10px]">
        {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
      </button>
      <div className="w-full px-[100px] mb-[10px]">
        <div className="flex items-center justify-center h-[30px] rounded-[30px]">
          <span className="text-[20px] font-medium text-primary text-center">New Step</span>
        </div>
      </div>
      <div className="relative w-full mb-[10px]">
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-selected" />
        <div className="flex justify-center">
          <button className="relative flex items-center gap-[5px] px-[18px] py-[5px] bg-white border-2 border-cta rounded-[30px]">
            <SortListIcon />
            <span className="text-[16px] font-medium text-cta">Выполнить действие с данными</span>
          </button>
        </div>
      </div>
      <div className="w-full px-[30px]">
        <button className="w-full flex items-center justify-between px-5 py-[7px] bg-selected rounded-[30px]">
          <span className="text-[18px] text-primary">Пользовательская задача</span>
          <span className="w-3 h-3 rotate-180"><Chevron /></span>
        </button>
      </div>
    </div>
  );
}

/* ── Source event dropdown ── */
const SOURCE_OPTIONS = [
  { label: "Приложение", icon: "phone" },
  { label: "База данных AppSheet", icon: "db" },
  { label: "Расписание", icon: "clock" },
  { label: "Приложение для чата", icon: "chat" },
  { label: "Формы", icon: "form" },
  { label: "Gmail", icon: "gmail" },
] as const;

function SourceDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="absolute top-[44px] left-0 z-50 w-[580px] bg-white rounded-[30px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[5px] flex flex-col">
      {SOURCE_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onChange(opt.label)}
          className={cn(
            "flex items-center gap-[30px] px-[30px] py-[11px] rounded-[30px] text-[16px] font-medium text-primary transition-colors",
            value === opt.label ? "bg-selected" : "bg-mainbg hover:bg-selected/60",
          )}
        >
          <span className="w-6 h-6 shrink-0"><SourceIcon type={opt.icon} /></span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SourceIcon({ type }: { type: string }) {
  if (type === "phone") return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M9 2 L15 2 C15.6 2 16 2.4 16 3 L16 21 C16 21.6 15.6 22 15 22 L9 22 C8.4 22 8 21.6 8 21 L8 3 C8 2.4 8.4 2 9 2 Z" stroke="#00205F" strokeWidth="1.8" />
      <circle cx="12" cy="19" r="1" fill="#00205F" />
    </svg>
  );
  if (type === "db") return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="7" rx="7" ry="3" stroke="#00205F" strokeWidth="1.8" />
      <path d="M5 7 L5 17 C5 18.65 8.13 20 12 20 C15.87 20 19 18.65 19 17 L19 7" stroke="#00205F" strokeWidth="1.8" />
      <path d="M5 12 C5 13.65 8.13 15 12 15 C15.87 15 19 13.65 19 12" stroke="#00205F" strokeWidth="1.8" />
    </svg>
  );
  if (type === "clock") return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <circle cx="12" cy="12" r="9" stroke="#00205F" strokeWidth="1.8" />
      <path d="M12 7 L12 12 L16 14" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "chat") return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M4 4 L20 4 C20.6 4 21 4.4 21 5 L21 15 C21 15.6 20.6 16 20 16 L8 16 L4 20 L4 5 C4 4.4 4.4 4 4 4 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="8" y1="9" x2="16" y2="9" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="12" x2="13" y2="12" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  if (type === "form") return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path d="M6 2 L15 2 L19 6 L19 22 L6 22 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 2 L15 6 L19 6" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="9" y1="11" x2="16" y2="11" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="15" x2="16" y2="15" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="19" x2="13" y2="19" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  // gmail
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <rect x="2" y="5" width="20" height="14" rx="1" stroke="#00205F" strokeWidth="1.8" />
      <path d="M2 6 L12 13 L22 6" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
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
