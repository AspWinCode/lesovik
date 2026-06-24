import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  NewStepModal, EventSourcesModal,
  RunTaskModal, WaitModal, DataActionModal, BranchModal, CallProcessModal, ReturnValueModal,
} from "@/components/modals/BotModals";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import {
  useRules,
  useActivateRule,
  useDeactivateRule,
  useDeleteRule,
  useUpdateRule,
  useCreateRule,
  useSteps,
  useAddStep,
  useUpdateStep,
  useDeleteStep,
  useReorderSteps,
} from "@/shared/hooks/useRules";
import type { Rule, ProcessStep } from "@/shared/api/rules";
import { useEntities } from "@/shared/hooks/useEntities";

const BOT_TABS = ["Бот", "События", "Процесс", "Правила"];
const POSITIONS_DC = ["Добавить", "Удалить", "Обновить"];

const ACTION_TYPES = [
  { id: "add_row",    label: "Добавить новую строку",     icon: "add_row" },
  { id: "del_row",    label: "Удалить строку",            icon: "del_row" },
  { id: "set_row",    label: "Настроить значение строки", icon: "set_row" },
  { id: "run_action", label: "Запустить действие со строкой", icon: "run_action" },
  { id: "format",     label: "Отформатировать действие",  icon: "format" },
] as const;

type ActionTypeId = typeof ACTION_TYPES[number]["id"];
type SelectedCard = "event" | "step" | null;

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [botTab, setBotTab] = useState("Бот");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SelectedCard>(null);
  const [selectedProcessNode, setSelectedProcessNode] = useState<string | null>(null);

  const [showEventSources, setShowEventSources] = useState(false);

  const { data: appsData } = useApps();
  const apps = appsData?.items ?? [];
  const app = useActiveApp(apps);
  const appId = app?.id;

  const { data: rules = [], isLoading } = useRules(appId);
  const activateRule  = useActivateRule(appId ?? "");
  const deactivateRule = useDeactivateRule(appId ?? "");
  const deleteRule    = useDeleteRule(appId ?? "");
  const updateRule    = useUpdateRule(appId ?? "");
  const createRule    = useCreateRule(appId ?? "");

  const { data: allEntities = [], isLoading: entitiesLoading } = useEntities(appId);

  useEffect(() => {
    if (rules.length > 0 && !activeRuleId) setActiveRuleId(rules[0].id);
  }, [rules, activeRuleId]);

  // Reset selected card when switching rules
  useEffect(() => { setSelectedCard(null); }, [activeRuleId]);

  const activeRule = rules.find((r) => r.id === activeRuleId) ?? null;
  const leftTitle = botTab === "Бот" ? "Бот" : "События";

  function handleToggle() {
    if (!activeRule || !appId) return;
    if (activeRule.is_active) deactivateRule.mutate(activeRule.id);
    else activateRule.mutate(activeRule.id);
  }

  function handleDelete(ruleId: string) {
    if (!appId) return;
    deleteRule.mutate(ruleId);
    if (activeRuleId === ruleId) setActiveRuleId(rules.find((r) => r.id !== ruleId)?.id ?? null);
    setOpenMenuId(null);
  }

  function handleCreate() {
    if (!appId || entitiesLoading) return;
    const firstEntityId = allEntities[0]?.id;
    if (!firstEntityId) {
      window.alert("Сначала создайте таблицу в разделе Данные");
      return;
    }
    const name = window.prompt("Название правила:", "Новое правило");
    if (!name || !name.trim()) return;
    createRule.mutate(
      { name: name.trim(), entity_id: firstEntityId, trigger: { event: "record.created", watch_fields: [] } },
      { onSuccess: (rule) => setActiveRuleId(rule.id) },
    );
  }

  function handleRename(ruleId: string) {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || !appId) return;
    const name = window.prompt("Новое название:", rule.name);
    if (name && name.trim() && name.trim() !== rule.name)
      updateRule.mutate({ ruleId, body: { name: name.trim() } });
    setOpenMenuId(null);
  }

  return (
    <div
      className="relative w-[1920px] h-[1080px] bg-white overflow-hidden"
      onClick={() => setOpenMenuId(null)}
    >
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Left panel ── */}
      <aside
        className="absolute top-[70px] bg-mainbg flex flex-col"
        style={{ left: 85, width: 290, height: 1005, borderRadius: "20px 5px 5px 20px" }}
      >
        <div className="flex items-center justify-between px-[15px] pt-[15px] h-[30px] mb-[25px]">
          <h2 className="text-[20px] font-bold text-primary">{leftTitle}</h2>
          <div className="flex items-center gap-5">
            <button aria-label="Поиск" className="w-5 h-5"><SearchIcon /></button>
            <button aria-label="Добавить" onClick={(e) => { e.stopPropagation(); handleCreate(); }} className="w-5 h-5"><PlusIcon /></button>
            <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center">
              {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* "Операции" group — only shown on Бот tab */}
          {botTab === "Бот" && (
            <button className="flex items-center gap-[7px] h-[46px] px-[15px] text-left">
              <span className="flex-1 text-[18px] leading-[150%] text-primary truncate">
                Операции (3)
              </span>
              <span className="w-3 h-3 -rotate-90"><Chevron /></span>
            </button>
          )}

          {/* "Отчеты" group */}
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
        <div className="h-[55px] flex items-center gap-[30px] px-[40px] shrink-0">
          {BOT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "Правила") {
                  const appId = searchParams.get("app");
                  navigate(appId ? `/rules?app=${appId}` : "/rules");
                } else {
                  setBotTab(t);
                }
              }}
              className={cn("text-[18px] font-semibold transition-colors", botTab === t ? "text-cta" : "text-primary")}
            >
              {t === "Правила" ? "Правила →" : t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {botTab === "Бот" && (
            <BotFlow
              rule={activeRule}
              selectedCard={selectedCard}
              onToggle={handleToggle}
              onSelectCard={setSelectedCard}
            />
          )}
          {botTab === "События" && (
            <EventEditor
              rule={activeRule}
              appId={appId}
              onSave={(ruleId, body) => updateRule.mutate({ ruleId, body })}
              onOpenEventSources={() => setShowEventSources(true)}
            />
          )}
          {botTab === "Процесс" && (
            <>
              <ProcessStepsEditor rule={activeRule} appId={appId} />
              <div className="px-[40px] pt-[10px] pb-[4px]">
                <span className="text-[13px] text-primary/40">Визуальная схема (демонстрация)</span>
              </div>
              <ProcessGraph
                rule={activeRule}
                appId={appId}
                selectedNode={selectedProcessNode}
                onSelectNode={setSelectedProcessNode}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {botTab === "События" ? (
        <PreviewPanel projectName="Profile" />
      ) : botTab === "Процесс" ? (
        selectedProcessNode
          ? <ProcessNodeSettingsPanel nodeId={selectedProcessNode} onClose={() => setSelectedProcessNode(null)} />
          : <AutomationPreview />
      ) : (
        /* Бот tab — context-sensitive Настройки panel */
        <BotSettingsPanel
          rule={activeRule}
          appId={appId}
          selectedCard={selectedCard}
          onSave={(ruleId, body) => updateRule.mutate({ ruleId, body })}
        />
      )}

      {showEventSources && (
        <EventSourcesModal
          tables={allEntities.map((e) => e.display_name)}
          onClose={() => setShowEventSources(false)}
          onSave={() => setShowEventSources(false)}
        />
      )}

    </div>
  );
}

/* ── Left sidebar item ── */
function BotItem({
  rule, isActive, menuOpen, onClick, onMenuOpen, onRename, onDelete,
}: {
  rule: Rule; isActive: boolean; menuOpen: boolean;
  onClick: () => void; onMenuOpen: (e: React.MouseEvent) => void;
  onRename: () => void; onDelete: () => void;
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
        )}>{rule.name}</span>
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
      {menuOpen && (
        <div
          className="absolute right-[15px] top-[48px] z-50 w-[160px] bg-white rounded-[25px] shadow-[10px_10px_20px_rgba(0,0,0,0.25),-10px_-10px_20px_rgba(0,0,0,0.25)] p-[5px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {[{ label: "Переименовать", action: onRename }, { label: "Удалить", action: onDelete }].map(({ label, action }) => (
            <button key={label} onClick={action}
              className="text-left px-[30px] py-[11px] text-[16px] font-medium text-primary bg-mainbg rounded-[30px] hover:bg-selected transition-colors">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Right panel: process node settings ── */
const PROC_ACTION_TYPES = [
  { id: "email",   label: "Отправить email" },
  { id: "notify",  label: "Отправить уведомление" },
  { id: "sms",     label: "SMS" },
  { id: "webhook", label: "Вызвать webhook" },
  { id: "file",    label: "Создать новый файл" },
  { id: "script",  label: "Выполнить сценарий" },
  { id: "ai",      label: "Задание ИИ" },
] as const;
type ProcActionId = typeof PROC_ACTION_TYPES[number]["id"];

function ProcessNodeSettingsPanel({
  nodeId: _nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const [activeType, setActiveType] = useState<ProcActionId>("email");
  const [emailType, setEmailType] = useState<"attach" | "template">("attach");

  return (
    <div
      className="absolute top-[70px] bg-mainbg flex flex-col overflow-y-auto"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[40px] h-[55px] shrink-0">
        <div className="flex items-center gap-[10px]">
          <span className="w-6 h-6"><GearIcon /></span>
          <span className="text-[20px] font-semibold text-primary">Настройки</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 text-primary/40 hover:text-primary transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-[15px] px-[30px] pb-[30px]">
        {/* Action type grid */}
        <div className="grid grid-cols-3 gap-[10px]">
          {PROC_ACTION_TYPES.map(({ id, label }) => {
            const sel = activeType === id;
            return (
              <button
                key={id}
                onClick={() => setActiveType(id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-[6px] h-[80px] rounded-[5px] border-2 transition-colors px-2",
                  sel ? "bg-selected border-cta" : "border-[#C2DBF8] hover:border-cta/40",
                )}
              >
                <span className="w-[28px] h-[28px]"><ProcActionIcon id={id} active={sel} /></span>
                <span className={cn("text-[11px] font-semibold text-center leading-[1.2]", sel ? "text-cta" : "text-[#C2DBF8]")}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {activeType === "email" && (
          <>
            {/* Email type section */}
            <div className="flex flex-col gap-[8px]">
              <span className="text-[18px] font-medium text-primary">Тип электронной почты</span>
              <div className="flex items-center gap-[10px]">
                {[
                  { id: "attach" as const, label: "Просмотр вложений приложения" },
                  { id: "template" as const, label: "Шаблон" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setEmailType(id)}
                    className={cn(
                      "flex-1 h-[41px] flex items-center justify-center rounded-btn text-[14px] font-medium border-2 transition-colors",
                      emailType === id ? "border-cta bg-selected text-cta" : "border-cardbg text-primary hover:border-cta/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email form */}
            <div className="flex flex-col gap-[10px]">
              <SettingsRow label="Таблица">
                <button className="flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary w-full">
                  <span>Отчеты</span>
                  <span className="w-3 h-3 shrink-0"><Chevron /></span>
                </button>
              </SettingsRow>

              <SettingsRow label="Кому">
                <div className="flex items-center gap-[8px] h-[41px] w-full">
                  <div className="flex-1 h-full bg-cardbg rounded-btn px-5 flex items-center gap-[8px]">
                    <div className="flex items-center gap-[4px] bg-white rounded-[4px] px-[6px] h-[28px]">
                      <span className="text-[14px] font-bold text-primary">T</span>
                    </div>
                    <input
                      placeholder="email@example.com"
                      className="flex-1 bg-transparent text-[16px] text-primary outline-none placeholder-primary/40"
                    />
                  </div>
                  <button className="w-6 h-6 text-primary/40 hover:text-mistake shrink-0 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                      <path d="M6 7L18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9 7L9 5L15 5L15 7" stroke="currentColor" strokeWidth="2" />
                      <path d="M7.5 7L8 19L16 19L16.5 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </SettingsRow>
            </div>
          </>
        )}

        {activeType !== "email" && (
          <div className="flex flex-col gap-[8px]">
            <SettingsRow label="Настройки">
              <div className="h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary/40 w-full">
                Настройте параметры...
              </div>
            </SettingsRow>
          </div>
        )}
      </div>
    </div>
  );
}

function ProcActionIcon({ id, active }: { id: ProcActionId; active: boolean }) {
  const c = active ? "#35A7FF" : "#C2DBF8";
  if (id === "email") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><rect x="3" y="6" width="22" height="16" rx="2" stroke={c} strokeWidth="2"/><path d="M3 8l11 8 11-8" stroke={c} strokeWidth="2" strokeLinejoin="round"/></svg>;
  if (id === "notify") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M6 20L22 20L22 19L20 16L20 11C20 7.7 17.3 5 14 5 C10.7 5 8 7.7 8 11L8 16L6 19Z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M11.5 23C12 24 16 24 16.5 23" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (id === "sms") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M4 4L24 4C24.6 4 25 4.4 25 5L25 18C25 18.6 24.6 19 24 19L9 19L4 24L4 5C4 4.4 4.4 4 4 4Z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><line x1="9" y1="10" x2="19" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="14" x2="15" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (id === "webhook") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><circle cx="8" cy="14" r="4" stroke={c} strokeWidth="2"/><circle cx="20" cy="8" r="4" stroke={c} strokeWidth="2"/><circle cx="20" cy="20" r="4" stroke={c} strokeWidth="2"/><line x1="12" y1="14" x2="16" y2="10" stroke={c} strokeWidth="2"/><line x1="12" y1="14" x2="16" y2="18" stroke={c} strokeWidth="2"/></svg>;
  if (id === "file") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M6 3L18 3L22 7L22 25L6 25Z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M18 3L18 7L22 7" stroke={c} strokeWidth="2" strokeLinejoin="round"/><line x1="10" y1="13" x2="18" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="10" x2="14" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
  if (id === "script") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><rect x="3" y="3" width="22" height="22" rx="2" stroke={c} strokeWidth="2"/><path d="M9 11L6 14L9 17" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 11L22 14L19 17" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="15" y1="9" x2="13" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><circle cx="14" cy="10" r="4" stroke={c} strokeWidth="2"/><path d="M7 24C7 19.58 10.13 16 14 16S21 19.58 21 24" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M20 7L22 9L18 13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* ── Right panel: gear illustration (Автоматизация) ── */
function AutomationPreview() {
  return (
    <div
      className="absolute top-[70px] bg-mainbg flex flex-col items-center justify-center"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      <div className="flex flex-col items-center gap-[30px]">
        <svg viewBox="0 0 278 278" fill="none" className="w-[278px] h-[278px]">
          <circle cx="139" cy="139" r="90" stroke="#35A7FF" strokeWidth="8" />
          <circle cx="139" cy="139" r="60" stroke="#35A7FF" strokeWidth="6" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            return <line key={i} x1={139 + 90 * Math.cos(angle)} y1={139 + 90 * Math.sin(angle)} x2={139 + 108 * Math.cos(angle)} y2={139 + 108 * Math.sin(angle)} stroke="#35A7FF" strokeWidth="10" strokeLinecap="round" />;
          })}
          <circle cx="139" cy="139" r="28" fill="#CBE3FF" stroke="#35A7FF" strokeWidth="5" />
          <circle cx="210" cy="68" r="38" stroke="#35A7FF" strokeWidth="5" />
          <circle cx="210" cy="68" r="24" stroke="#35A7FF" strokeWidth="4" />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            return <line key={i} x1={210 + 38 * Math.cos(angle)} y1={68 + 38 * Math.sin(angle)} x2={210 + 48 * Math.cos(angle)} y2={68 + 48 * Math.sin(angle)} stroke="#35A7FF" strokeWidth="7" strokeLinecap="round" />;
          })}
          <circle cx="210" cy="68" r="12" fill="#CBE3FF" stroke="#35A7FF" strokeWidth="4" />
          <path d="M100 210 L100 240 M100 240 L80 220 M100 240 L120 220" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M178 210 L178 240 M178 240 L158 220 M178 240 L198 220" stroke="#35A7FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[20px] font-semibold text-cta">Настройки автоматизации</span>
      </div>
    </div>
  );
}

/* ── Right panel for "Бот" tab — context-sensitive ── */
function BotSettingsPanel({
  rule, appId, selectedCard, onSave,
}: {
  rule: Rule | null;
  appId: string | undefined;
  selectedCard: SelectedCard;
  onSave: (ruleId: string, body: Record<string, unknown>) => void;
}) {
  if (!rule || selectedCard === null) return <AutomationPreview />;

  return (
    <div
      className="absolute top-[70px] bg-mainbg flex flex-col overflow-y-auto"
      style={{ left: 1330, width: 580, height: 1000, borderRadius: "5px 20px 20px 5px" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-[40px] h-[55px] shrink-0">
        <div className="flex items-center gap-[10px]">
          <span className="w-6 h-6"><GearIcon /></span>
          <span className="text-[20px] font-semibold text-primary">Настройки</span>
        </div>
        <div className="flex items-center gap-[7px]">
          <span className="w-5 h-5 opacity-40"><ExpandIcon /></span>
          <span className="w-3 h-3"><Chevron open /></span>
        </div>
      </div>

      {selectedCard === "event" && (
        <EventSettingsPanel rule={rule} appId={appId} onSave={onSave} />
      )}
      {selectedCard === "step" && (
        <StepSettingsPanel />
      )}
    </div>
  );
}

/* ── Event settings in right panel ── */
function EventSettingsPanel({
  rule, appId, onSave,
}: {
  rule: Rule;
  appId: string | undefined;
  onSave: (ruleId: string, body: Record<string, unknown>) => void;
}) {
  const [dc, setDc] = useState(() => eventToDc(rule.trigger?.event ?? "record.created"));
  const [bypass, setBypass] = useState(false);
  const [nameVal, setNameVal] = useState(rule.name);
  const [showEntityDd, setShowEntityDd] = useState(false);

  const { data: entities = [] } = useEntities(appId);
  const selectedEntity = entities.find((e) => e.id === rule.entity_id) ?? entities[0] ?? null;

  useEffect(() => {
    setDc(eventToDc(rule.trigger?.event ?? "record.created"));
    setNameVal(rule.name);
  }, [rule.id]);

  function saveName() {
    if (!nameVal.trim() || nameVal.trim() === rule.name) return;
    onSave(rule.id, { name: nameVal.trim() });
  }

  function handleDcChange(p: string) {
    setDc(p);
    onSave(rule.id, { trigger: { ...rule.trigger, event: dcToEvent(p) } });
  }

  return (
    <div className="flex flex-col gap-[15px] px-[30px] pb-[30px]" onClick={() => setShowEntityDd(false)}>
      {/* Название */}
      <SettingsRow label="Название">
        <div className="h-[41px] bg-cardbg rounded-btn px-5 flex items-center w-full">
          <input
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-full bg-transparent text-[18px] text-primary outline-none"
          />
        </div>
      </SettingsRow>

      {/* Источник события */}
      <SettingsRow label="Источник события" desc="Выберите продукт или расписание, по которому проводится событие.">
        <button className="flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary w-full">
          <span>Приложение</span>
          <span className="w-3 h-3 shrink-0"><Chevron /></span>
        </button>
      </SettingsRow>

      {/* Таблица */}
      <SettingsRow label="Таблица" desc="Изменение данных в какой таблице должно вызывать это событие?">
        <div className="flex items-center gap-[10px] w-full" onClick={(e) => e.stopPropagation()}>
          <div className="relative flex-1">
            <button
              onClick={() => setShowEntityDd((v) => !v)}
              className="flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary w-full"
            >
              <span className="truncate">{selectedEntity?.display_name ?? "Выберите таблицу"}</span>
              <span className={cn("w-3 h-3 shrink-0 transition-transform", showEntityDd && "rotate-180")}><Chevron /></span>
            </button>
            {showEntityDd && entities.length > 0 && (
              <div className="absolute top-[44px] left-0 z-50 w-full bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-[5px] flex flex-col max-h-[280px] overflow-y-auto">
                {entities.map((ent) => (
                  <button key={ent.id}
                    onClick={() => { onSave(rule.id, { entity_id: ent.id }); setShowEntityDd(false); }}
                    className={cn(
                      "flex items-center gap-[15px] px-[20px] py-[10px] rounded-[20px] text-[16px] font-medium text-primary transition-colors text-left",
                      ent.id === (rule.entity_id ?? entities[0]?.id) ? "bg-selected" : "bg-white hover:bg-selected/60",
                    )}
                  >
                    <span className="w-5 h-5 shrink-0"><FileDocIcon /></span>
                    {ent.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button aria-label="Редактировать" className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full shrink-0">
            <EditIcon />
          </button>
        </div>
      </SettingsRow>

      {/* Тип изменения данных */}
      <SettingsRow label="Тип изменения данных" desc="Изменение данных в какой таблице должно вызывать это событие?">
        <div className="flex items-center gap-[10px]">
          {POSITIONS_DC.map((p) => {
            const sel = dc === p;
            return (
              <button key={p} onClick={() => handleDcChange(p)}
                className={cn(
                  "w-[100px] h-[90px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] box-border border-2 transition-colors",
                  sel ? "bg-selected border-cta" : "border-[#C2DBF8] hover:border-cta/40",
                )}
              >
                <span className="w-[36px] h-[36px]">
                  {p === "Добавить" ? <WidgetAddIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                    : p === "Удалить" ? <TrashIcon c={sel ? "#35A7FF" : "#C2DBF8"} />
                    : <DeskEditIcon c={sel ? "#35A7FF" : "#C2DBF8"} />}
                </span>
                <span className={cn("text-[12px] font-semibold", sel ? "text-cta" : "text-[#C2DBF8]")}>{p}</span>
              </button>
            );
          })}
        </div>
      </SettingsRow>

      {/* Условие */}
      <SettingsRow label="Условие" desc="Дополнительное условие, проверяемое перед запуском процесса.">
        <div className="flex items-center gap-[10px] w-full">
          <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary">=</div>
          <span className="w-8 h-8"><FilterIcon /></span>
        </div>
      </SettingsRow>

      {/* Обойти защитные фильтры */}
      <SettingsRow label="Обойти защитные фильтры?" desc="Выполните это действие и процессы, которые оно запускает, как если бы в источниках данных не было фильтров безопасности.">
        <Toggle on={bypass} onChange={() => setBypass((v) => !v)} />
      </SettingsRow>
    </div>
  );
}

/* ── Step settings in right panel ── */
function StepSettingsPanel() {
  const [activeAction, setActiveAction] = useState<ActionTypeId>("add_row");

  return (
    <div className="flex flex-col gap-[15px] px-[30px] pb-[30px]">
      {/* Action type grid */}
      <div className="grid grid-cols-3 gap-[10px]">
        {ACTION_TYPES.map(({ id, label }) => {
          const sel = activeAction === id;
          return (
            <button key={id} onClick={() => setActiveAction(id)}
              className={cn(
                "flex flex-col items-center justify-center gap-[6px] h-[80px] rounded-[5px] border-2 transition-colors px-2",
                sel ? "bg-selected border-cta" : "border-[#C2DBF8] hover:border-cta/40",
              )}
            >
              <span className="w-[28px] h-[28px]"><ActionIcon id={id} active={sel} /></span>
              <span className={cn("text-[11px] font-semibold text-center leading-[1.2]", sel ? "text-cta" : "text-[#C2DBF8]")}>{label}</span>
            </button>
          );
        })}
      </div>

      {activeAction === "add_row" && (
        <>
          <SettingsRow label="Добавьте строку в эту таблицу">
            <button className="flex items-center justify-between gap-5 h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary w-full">
              <span className="text-primary/50">Не указан</span>
              <span className="w-3 h-3 shrink-0"><Chevron /></span>
            </button>
          </SettingsRow>
          <div className="flex flex-col gap-[8px]">
            <span className="text-[18px] font-medium text-primary">Настроить эти столбцы</span>
            <div className="flex items-center gap-[8px] h-[41px]">
              <span className="w-4 h-4 opacity-40"><DragIcon /></span>
              <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary/40">Столбец</div>
              <span className="text-[18px] text-primary">=</span>
              <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary/40">Значение</div>
              <span className="w-6 h-6 opacity-40"><FilterIcon /></span>
              <span className="w-6 h-6 opacity-40"><TrashIconSm /></span>
            </div>
            <button className="w-8 h-8 flex items-center justify-center text-cta text-2xl font-light">+</button>
          </div>
        </>
      )}
      {activeAction === "del_row" && (
        <div className="flex items-center gap-[10px] px-[5px] py-[10px]">
          <span className="w-6 h-6 opacity-60"><TrashIconSm /></span>
          <span className="text-[18px] text-primary">Строка будет удалена</span>
        </div>
      )}
      {(activeAction === "set_row" || activeAction === "run_action" || activeAction === "format") && (
        <div className="flex flex-col gap-[8px]">
          <span className="text-[18px] font-medium text-primary">Настроить эти столбцы</span>
          <div className="flex items-center gap-[8px] h-[41px]">
            <span className="w-4 h-4 opacity-40"><DragIcon /></span>
            <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary/40">Имя</div>
            <span className="text-[18px] text-primary">=</span>
            <div className="flex-1 h-[41px] bg-cardbg rounded-btn px-5 flex items-center text-[18px] text-primary/40">Значение</div>
            <span className="w-6 h-6 opacity-40"><FilterIcon /></span>
            <span className="w-6 h-6 opacity-40"><TrashIconSm /></span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center text-cta text-2xl font-light">+</button>
        </div>
      )}

      {/* Дополнительно */}
      <div className="border-t-2 border-white pt-[10px]">
        <div className="flex items-center justify-between py-[7px]">
          <span className="text-[18px] font-bold text-primary">Дополнительно</span>
          <span className="w-3 h-3 rotate-180"><Chevron /></span>
        </div>
        <div className="flex flex-col gap-[8px] mt-[5px]">
          <span className="text-[18px] font-medium text-primary">Входные</span>
          <span className="text-[13px] text-primary/60">Список входных данных, которые могут быть использованы в этой задаче.</span>
          <div className="flex items-center gap-[8px] h-[36px]">
            <span className="w-4 h-4 opacity-40"><DragIcon /></span>
            <div className="flex-1 h-[36px] bg-cardbg rounded-btn px-4 flex items-center text-[16px] text-primary/40">Имя</div>
            <div className="flex items-center gap-[5px] h-[36px] px-4 bg-cardbg rounded-btn">
              <span className="text-[16px] text-primary/40">Тип</span>
              <span className="w-3 h-3 shrink-0"><Chevron /></span>
            </div>
            <span className="w-5 h-5 opacity-40"><EditIcon /></span>
            <span className="w-5 h-5 opacity-40"><TrashIconSm /></span>
          </div>
          <div className="flex items-center gap-[8px] h-[36px]">
            <span className="w-4 h-4 opacity-40"><DragIcon /></span>
            <div className="flex-1 h-[36px] bg-cardbg rounded-btn px-4 flex items-center text-[16px] text-primary/40">=</div>
            <span className="w-5 h-5 opacity-40"><FilterIcon /></span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center text-cta text-2xl font-light">+</button>
        </div>
      </div>
    </div>
  );
}

/* ── Row helper for settings panels ── */
function SettingsRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="text-[18px] font-medium text-primary">{label}</div>
      {desc && <div className="text-[13px] text-primary/70 leading-[1.4]">{desc}</div>}
      <div className="mt-[2px]">{children}</div>
    </div>
  );
}

/* ── Бот tab (center) ── */
function BotFlow({
  rule, selectedCard, onToggle, onSelectCard,
}: {
  rule: Rule | null;
  selectedCard: SelectedCard;
  onToggle: () => void;
  onSelectCard: (c: SelectedCard) => void;
}) {
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
          <button onClick={onToggle}
            className={cn(
              "px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta transition-colors",
              rule.is_active ? "bg-white text-cta" : "bg-cta text-white",
            )}>
            {rule.is_active ? "Отключить" : "Включить"}
          </button>
          <button disabled title="В разработке" className="px-5 h-[34px] rounded-[20px] text-[14px] font-semibold border-2 border-cta/40 text-cta/40 cursor-not-allowed">Монитор</button>
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
        {/* Clickable event card */}
        <div
          onClick={() => onSelectCard(selectedCard === "event" ? null : "event")}
          className={cn(
            "w-[356px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[20px_30px_30px] flex flex-col items-end cursor-pointer transition-all",
            selectedCard === "event" && "ring-2 ring-cta",
          )}
        >
          <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mb-[10px]">
            {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
          </button>
          <div className="w-full flex items-start justify-center gap-5">
            <span className="w-[30px] h-[30px] mt-[2px] shrink-0"><ShuffleIcon /></span>
            <div className="w-[209px] flex flex-col items-center">
              <span className="text-[20px] font-medium text-primary">{eventLabel}</span>
              <span className="text-[16px] text-primary">Позиция предприятия</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-[40px] pt-[25px] flex flex-col items-start">
        <p className="text-[18px] font-medium text-primary mb-[20px]">
          Запустите этот <span className="font-bold">ПРОЦЕСС</span>
        </p>
        {/* Clickable step card */}
        <div
          onClick={() => onSelectCard(selectedCard === "step" ? null : "step")}
          className={cn(
            "w-[356px] bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] pt-5 pb-[30px] flex flex-col items-end cursor-pointer transition-all",
            selectedCard === "step" && "ring-2 ring-cta",
          )}
        >
          <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mr-[30px] mb-[10px]">
            {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
          </button>
          <div className="w-full px-[100px] mb-[10px]">
            <div className="flex items-center justify-center h-[30px] rounded-[30px]">
              <span className="text-[20px] font-medium text-primary text-center">New step</span>
            </div>
          </div>
          <div className="relative w-full mb-[10px]">
            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-selected" />
            <div className="flex justify-center">
              <button onClick={(e) => e.stopPropagation()} className="relative flex items-center gap-[5px] px-[18px] py-[5px] bg-white border-2 border-cta rounded-[30px]">
                <SortListIcon />
                <span className="text-[16px] font-medium text-cta">Выполнить действие с данными</span>
              </button>
            </div>
          </div>
          <div className="w-full px-[30px]">
            <button onClick={(e) => e.stopPropagation()} className="w-full flex items-center justify-between px-5 py-[7px] bg-selected rounded-[30px]">
              <span className="text-[18px] text-primary">Пользовательская задача</span>
              <span className="w-3 h-3 rotate-180"><Chevron /></span>
            </button>
          </div>
        </div>
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

/* ── События tab (center) ── */
function EventEditor({
  rule, appId, onSave, onOpenEventSources,
}: {
  rule: Rule | null;
  appId: string | undefined;
  onSave: (ruleId: string, body: Record<string, unknown>) => void;
  onOpenEventSources: () => void;
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
      <div className="flex items-center justify-between px-[40px] h-[60px] shrink-0">
        <h1 className="text-[20px] font-semibold text-primary">{rule.name}</h1>
        <div className="flex items-center gap-[7px]">
          <span className="w-6 h-6"><LinkIcon /></span>
          <span className="text-[20px] font-semibold text-cta">1</span>
          <span className="w-3 h-3"><Chevron /></span>
        </div>
      </div>

      <div className="px-[40px] flex flex-col gap-[20px] pb-[30px]">
        <Row label="Название">
          <div className="w-[580px] h-[41px] bg-cardbg rounded-btn px-5 flex items-center">
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full bg-transparent text-[18px] text-primary outline-none"
            />
          </div>
        </Row>

        <Row label="Источник события" desc="Выберите продукт или расписание, по которому проводится событие." labelW={247}>
          <div className="flex items-center gap-[8px] w-[580px]">
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setShowSrc((v) => !v); setShowEntityDd(false); }}
                className="flex items-center justify-between gap-5 w-full h-[41px] px-5 bg-cardbg rounded-btn text-[18px] text-primary"
              >
                <span className="truncate">{src}</span>
                <span className={cn("w-3 h-3 shrink-0 transition-transform", showSrc && "rotate-180")}><Chevron /></span>
              </button>
              {showSrc && <SourceDropdown value={src} onChange={(v) => { setSrc(v); setShowSrc(false); }} />}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenEventSources(); }}
              className="shrink-0 h-[41px] px-4 border-2 border-cta text-cta text-[13px] font-medium rounded-btn hover:bg-cta/10 transition-colors"
            >
              Источники
            </button>
          </div>
        </Row>

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
                    <button key={ent.id}
                      onClick={() => { onSave(rule.id, { entity_id: ent.id }); setShowEntityDd(false); }}
                      className={cn(
                        "flex items-center gap-[15px] px-[20px] py-[10px] rounded-[20px] text-[16px] font-medium text-primary transition-colors text-left",
                        ent.id === (rule.entity_id ?? entities[0]?.id) ? "bg-selected" : "bg-white hover:bg-selected/60",
                      )}
                    >
                      <span className="w-5 h-5 shrink-0"><FileDocIcon /></span>
                      {ent.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button aria-label="Редактировать" className="w-10 h-10 flex items-center justify-center hover:bg-cardbg/40 rounded-full shrink-0 transition-colors">
              <EditIcon />
            </button>
          </div>
        </Row>

        <Row label="Тип изменения данных" desc="Изменение данных в какой таблице должно вызывать это событие?" labelW={236}>
          <div className="flex items-center gap-[30px] py-[7px]">
            {POSITIONS_DC.map((p) => {
              const sel = dc === p;
              return (
                <button key={p} onClick={() => handleDcChange(p)}
                  className={cn(
                    "w-[106px] h-[95px] flex flex-col items-center justify-center gap-[5px] rounded-[5px] box-border border-2 transition-colors",
                    sel ? "bg-selected border-cta" : "border-[#C2DBF8] hover:border-cta/40",
                  )}>
                  <span className="w-[39px] h-[39px]">
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

/* ── Процесс tab (center) ── */
/* ── Real, persisted process-steps editor (Процесс tab) ── */
interface StepFieldSpec { k: string; label: string; def?: string; textarea?: boolean }
const STEP_TYPES: { type: string; label: string; fields: StepFieldSpec[] }[] = [
  { type: "set_field",         label: "Задать поле",            fields: [{ k: "field", label: "Поле" }, { k: "value", label: "Значение" }] },
  { type: "create_record",     label: "Создать запись",         fields: [{ k: "entity_id", label: "ID таблицы" }] },
  { type: "update_record",     label: "Обновить запись",        fields: [{ k: "record_id_field", label: "Поле-идентификатор", def: "id" }] },
  { type: "delete_record",     label: "Удалить запись",         fields: [{ k: "record_id_field", label: "Поле-идентификатор", def: "id" }] },
  { type: "send_notification", label: "Отправить уведомление",  fields: [{ k: "to", label: "Кому" }, { k: "subject", label: "Тема" }, { k: "template", label: "Текст", textarea: true }] },
  { type: "call_webhook",      label: "Вызвать webhook",        fields: [{ k: "url", label: "URL" }, { k: "method", label: "Метод (GET/POST)", def: "POST" }] },
  { type: "stop",              label: "Остановить процесс",     fields: [] },
];
const STEP_LABEL: Record<string, string> = Object.fromEntries(STEP_TYPES.map((t) => [t.type, t.label]));

function defaultsFor(type: string): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};
  STEP_TYPES.find((t) => t.type === type)?.fields.forEach((f) => {
    if (f.def !== undefined) cfg[f.k] = f.def;
  });
  return cfg;
}

function ProcessStepsEditor({ rule, appId }: { rule: Rule | null; appId: string | undefined }) {
  if (!rule || !appId) {
    return (
      <div className="px-[40px] py-[30px] text-primary/60 text-[16px]">
        Выберите событие из списка, чтобы настроить шаги процесса.
      </div>
    );
  }
  return <StepsEditorInner appId={appId} ruleId={rule.id} />;
}

type ConfigModal =
  | { kind: "run_task"; stepId?: string; config?: Record<string, unknown> }
  | { kind: "wait"; stepId?: string; config?: Record<string, unknown> }
  | { kind: "data_action"; stepId?: string; config?: Record<string, unknown> }
  | { kind: "branch"; stepId?: string; config?: Record<string, unknown> }
  | { kind: "call"; stepId?: string; config?: Record<string, unknown> }
  | { kind: "set_value"; stepId?: string; config?: Record<string, unknown> };

function StepsEditorInner({ appId, ruleId }: { appId: string; ruleId: string }) {
  const { data: steps = [], isLoading } = useSteps(appId, ruleId);
  const addStep = useAddStep(appId, ruleId);
  const delStep = useDeleteStep(appId, ruleId);
  const reorder = useReorderSteps(appId, ruleId);
  const [addOpen, setAddOpen] = useState(false);
  const [showNewStepModal, setShowNewStepModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState(steps);
  const [configModal, setConfigModal] = useState<ConfigModal | null>(null);

  useEffect(() => { setLocalSteps(steps); }, [steps]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localSteps.findIndex((s) => s.id === active.id);
    const newIdx = localSteps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(localSteps, oldIdx, newIdx);
    setLocalSteps(reordered);
    reorder.mutate(reordered.map((s) => s.id));
  }

  return (
    <div className="px-[40px] pt-[20px] pb-[10px] flex flex-col gap-[12px]">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[20px] font-bold text-primary">Шаги процесса</h2>
        <p className="text-[13px] text-primary/60">
          Действия выполняются по порядку при срабатывании события. Перетащите шаг за ручку ⠿ для изменения порядка.
        </p>
      </div>

      {isLoading && <span className="text-[14px] text-primary/50">Загрузка…</span>}
      {!isLoading && steps.length === 0 && (
        <span className="text-[14px] text-primary/40">Шагов пока нет — добавьте первый.</span>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-[8px]">
            {localSteps.map((s, i) => (
              <StepRow
                key={s.id}
                appId={appId}
                ruleId={ruleId}
                step={s}
                index={i}
                expanded={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                onDelete={() => delStep.mutate(s.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => setShowNewStepModal(true)}
          className="flex items-center gap-2 h-[38px] px-5 bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active transition-colors"
        >
          + Добавить шаг
        </button>
        <div className="relative">
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="flex items-center gap-2 h-[38px] px-3 border-2 border-cta text-cta text-[14px] font-medium rounded-btn hover:bg-cta/10 transition-colors"
            title="Быстрое добавление"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {addOpen && (
            <div className="absolute left-0 top-[42px] z-30 bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] p-[5px] flex flex-col min-w-[230px]">
              {STEP_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => { addStep.mutate({ type: t.type, config: defaultsFor(t.type) }); setAddOpen(false); }}
                  className="text-left px-4 py-2 rounded-[8px] text-[14px] text-primary hover:bg-mainbg transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNewStepModal && (
        <NewStepModal
          onClose={() => setShowNewStepModal(false)}
          onAdd={(type) => {
            setShowNewStepModal(false);
            if (type === "run_task") { setConfigModal({ kind: "run_task" }); return; }
            if (type === "wait") { setConfigModal({ kind: "wait" }); return; }
            if (type === "data_action") { setConfigModal({ kind: "data_action" }); return; }
            if (type === "branch") { setConfigModal({ kind: "branch" }); return; }
            if (type === "call") { setConfigModal({ kind: "call" }); return; }
            if (type === "set_value") { setConfigModal({ kind: "set_value" }); return; }
            const stepType = STEP_TYPES.find((t) => t.type === type) ? type
              : type === "add_row" ? "create_record"
              : type === "delete_row" ? "delete_record"
              : type === "notify" ? "send_notification"
              : type;
            addStep.mutate({ type: stepType, config: defaultsFor(stepType) });
          }}
        />
      )}

      {configModal?.kind === "run_task" && (
        <RunTaskModal
          initialData={configModal.config as { process?: string; inputData?: string; sync?: boolean } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
      {configModal?.kind === "wait" && (
        <WaitModal
          initialData={configModal.config as { amount?: number; unit?: string } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
      {configModal?.kind === "data_action" && (
        <DataActionModal
          initialData={configModal.config as { table?: string; operation?: string; condition?: string; values?: string } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
      {configModal?.kind === "branch" && (
        <BranchModal
          initialData={configModal.config as { conditions?: Array<{ field: string; operator: string; value: string }> } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
      {configModal?.kind === "call" && (
        <CallProcessModal
          initialData={configModal.config as { process?: string; wait?: boolean; passData?: boolean } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
      {configModal?.kind === "set_value" && (
        <ReturnValueModal
          initialData={configModal.config as { value?: string; type?: string } | undefined}
          onClose={() => setConfigModal(null)}
          onConfirm={() => setConfigModal(null)}
        />
      )}
    </div>
  );
}

function StepRow({ appId, ruleId, step, index, expanded, onToggle, onDelete }: {
  appId: string; ruleId: string; step: ProcessStep; index: number;
  expanded: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const spec = STEP_TYPES.find((t) => t.type === step.type);
  const updateStep = useUpdateStep(appId, ruleId);
  const seed = () => {
    const f: Record<string, string> = {};
    spec?.fields.forEach((fl) => { f[fl.k] = String(step.config[fl.k] ?? fl.def ?? ""); });
    return f;
  };
  const [form, setForm] = useState<Record<string, string>>(seed);
  useEffect(() => { setForm(seed()); }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    updateStep.mutate({ stepId: step.id, body: { config: { ...form } } });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
      className="bg-white rounded-[10px] border border-cardbg"
    >
      <div className="flex items-center gap-[12px] h-[48px] px-4">
        <button
          {...attributes} {...listeners}
          className="w-5 h-5 shrink-0 cursor-grab active:cursor-grabbing text-primary/30 hover:text-primary/60 touch-none"
          title="Перетащить"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-full h-full">
            <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
            <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
            <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
          </svg>
        </button>
        <span className="w-5 text-[13px] text-primary/40 font-medium shrink-0">{index + 1}</span>
        <span className="flex-1 text-[15px] font-medium text-primary">{STEP_LABEL[step.type] ?? step.type}</span>
        {spec && spec.fields.length > 0 && (
          <button onClick={onToggle} className="text-[13px] text-cta hover:underline">{expanded ? "Свернуть" : "Настроить"}</button>
        )}
        <button onClick={onDelete} title="Удалить шаг" className="w-7 h-7 rounded hover:bg-red-50 text-mistake">✕</button>
      </div>
      {expanded && spec && spec.fields.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-[10px]">
          {spec.fields.map((fl) => (
            <label key={fl.k} className="flex flex-col gap-[4px] text-[13px] text-primary/70">
              {fl.label}
              {fl.textarea ? (
                <textarea
                  value={form[fl.k] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [fl.k]: e.target.value }))}
                  onBlur={save}
                  rows={2}
                  className="bg-mainbg rounded-btn px-3 py-2 text-[14px] text-primary outline-none resize-none"
                />
              ) : (
                <input
                  value={form[fl.k] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [fl.k]: e.target.value }))}
                  onBlur={save}
                  className="bg-mainbg rounded-btn h-[38px] px-3 text-[14px] text-primary outline-none"
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessGraph({
  rule,
  appId,
  selectedNode,
  onSelectNode,
}: {
  rule: Rule | null;
  appId: string | undefined;
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
}) {
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
          <span className="w-3 h-3"><Chevron /></span>
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
        <ProcCard
          icon={<ShuffleIcon />}
          title={`Запуск ${eventLabel}`}
          selected={selectedNode === "trigger"}
          onClick={() => onSelectNode(selectedNode === "trigger" ? null : "trigger")}
        />
        <svg viewBox="0 0 520 70" className="w-[520px] h-[70px]" fill="none">
          <path d="M260 0 L260 20 M260 20 L120 20 L120 50 M260 20 L400 20 L400 50" stroke="#35A7FF" strokeWidth="2" />
          <path d="M114 44 L120 50 L126 44 M394 44 L400 50 L406 44" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Да</text>
          <text x="350" y="16" fill="#35A7FF" fontSize="14" fontWeight="700">Нет</text>
        </svg>
        <div className="flex gap-[78px] items-start">
          <div className="flex flex-col items-center gap-[15px]">
            {selectedNode === "send_telegram" ? (
              <ProcCardCondition
                icon={<SendIcon />}
                title="Send_telegram"
                w={357}
                onClick={() => onSelectNode(null)}
              />
            ) : (
              <ProcCard
                icon={<SendIcon />}
                title="Send_telegram"
                w={357}
                selected={false}
                onClick={() => onSelectNode("send_telegram")}
              />
            )}
            <span className="w-[43px] h-[43px]"><AddDashedIcon /></span>
          </div>
          <div className="flex flex-col items-center gap-[15px]">
            <ProcCard
              icon={<StatusIcon />}
              title={`Установить статус\n"Отправлен"`}
              w={356}
              selected={selectedNode === "set_status"}
              onClick={() => onSelectNode(selectedNode === "set_status" ? null : "set_status")}
            />
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

/* ── Shared blocks ── */
function ProcCard({
  icon, title, w = 356, selected, onClick,
}: {
  icon: ReactNode; title: string; w?: number;
  selected?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[20px_30px_30px] flex flex-col items-end transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        selected && "ring-2 ring-cta",
      )}
      style={{ width: w }}
    >
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

function ProcCardCondition({
  icon, title, w = 356, onClick,
}: {
  icon: ReactNode; title: string; w?: number; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] ring-2 ring-cta p-[20px_30px_20px] flex flex-col items-end cursor-pointer"
      style={{ width: w }}
    >
      <button aria-label="Меню" className="flex flex-col items-center gap-[2.67px] w-[5px] h-5 justify-center mb-[10px]">
        {[0, 1, 2].map((i) => <span key={i} className="w-1 h-1 rounded-full bg-primary" />)}
      </button>
      <div className="w-full flex items-start justify-center gap-5 mb-[15px]">
        <span className="w-[30px] h-[30px] mt-[2px] shrink-0">{icon}</span>
        <span className="w-[209px] text-center text-[20px] font-medium text-primary">{title}</span>
      </div>
      {/* Condition branching row */}
      <div className="w-full flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="px-3 py-1 rounded-[20px] text-[12px] font-semibold bg-primary text-white shrink-0">
            Ответвление по условию
          </span>
        </div>
        <div className="flex items-center gap-[8px] w-full">
          <div className="flex-1 h-[36px] bg-mainbg rounded-btn px-4 flex items-center text-[14px] text-primary/50">
            Условие
          </div>
          <span className="w-6 h-6 shrink-0 text-primary/40">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <path d="M5 7 L27 7 L18 16 L18 26 L14 23 L14 16 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, desc, labelW = 250, children }: { label: string; desc?: string; labelW?: number; children: ReactNode }) {
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

/* ── Icon library ── */
type IconCat = "normal" | "thin" | "filled";
interface IconDef { name: string; cat: IconCat; d: string | string[]; fill?: boolean }

const ICON_LIB: IconDef[] = [
  // normal (strokeWidth 1.4)
  { name: "дом",         cat:"normal", d:"M2 8.5L9 2L16 8.5V16H12V11H6V16H2V8.5Z" },
  { name: "пользователь",cat:"normal", d:["M9 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z","M2.5 16c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5"] },
  { name: "настройки",   cat:"normal", d:["M9 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5Z","M9 1v2M9 15v2M1 9h2M15 9h2M3.34 3.34l1.41 1.41M13.25 13.25l1.41 1.41M3.34 14.66l1.41-1.41M13.25 4.75l1.41-1.41"] },
  { name: "колокол",     cat:"normal", d:["M9 1.5a5.5 5.5 0 00-5.5 5.5v4l-1.5 2h14l-1.5-2V7A5.5 5.5 0 009 1.5Z","M7 15.5a2 2 0 004 0"] },
  { name: "поиск",       cat:"normal", d:["M8 2a6 6 0 100 12A6 6 0 008 2Z","M12.5 12.5L16 16"] },
  { name: "звезда",      cat:"normal", d:"M9 1.5L11 6.5H16.5L12 10L14 15.5L9 12.5L4 15.5L6 10L1.5 6.5H7Z" },
  { name: "сердце",      cat:"normal", d:"M9 15.5S1.5 11.5 1.5 6a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0116.5 6c0 5.5-7.5 9.5-7.5 9.5Z" },
  { name: "плюс",        cat:"normal", d:"M9 2V16M2 9H16" },
  { name: "минус",       cat:"normal", d:"M2 9H16" },
  { name: "галочка",     cat:"normal", d:"M2 9L7 14L16 4" },
  { name: "закрыть",     cat:"normal", d:"M3 3L15 15M15 3L3 15" },
  { name: "карандаш",    cat:"normal", d:"M12.5 2.5L15.5 5.5L6 15L2 16L3 12L12.5 2.5Z" },
  { name: "корзина",     cat:"normal", d:["M3 5H15","M6 5V3H12V5","M5 5L6 16H12L13 5"] },
  { name: "письмо",      cat:"normal", d:["M2 4H16V14H2V4Z","M2 4L9 10L16 4"] },
  { name: "телефон",     cat:"normal", d:"M4 2S6 4 6 6L4.5 7.5C5.5 9.5 8.5 12.5 10.5 13.5L12 12C14 12 16 14 16 14L14 16C10 17 1 8 2 4Z" },
  { name: "календарь",   cat:"normal", d:["M3 4H15V15H3V4Z","M3 8H15","M7 2V4","M11 2V4"] },
  { name: "часы",        cat:"normal", d:["M9 2a7 7 0 100 14A7 7 0 009 2Z","M9 5V9L12 11"] },
  { name: "файл",        cat:"normal", d:["M4 2H11L14 5V16H4V2Z","M11 2V5H14"] },
  { name: "папка",       cat:"normal", d:"M2 5H7L9 3H16V14H2V5Z" },
  { name: "диаграмма",   cat:"normal", d:"M2 14H16M4 14V9H7V14M8 14V6H11V14M12 14V11H15V14" },
  { name: "линия тренда",cat:"normal", d:["M2 13L6 9L9 11L13 6L16 8","M2 14H16"] },
  { name: "замок",       cat:"normal", d:["M5 8V6a4 4 0 018 0V8","M3 8H15V16H3V8Z","M9 11V13"] },
  { name: "стрелка вверх",cat:"normal",d:"M9 15V3M3 9L9 3L15 9" },
  { name: "стрелка вниз",cat:"normal", d:"M9 3V15M3 9L9 15L15 9" },
  { name: "меню",        cat:"normal", d:"M2 5H16M2 9H16M2 13H16" },
  { name: "список",      cat:"normal", d:"M6 5H16M6 9H16M6 13H16M2.5 5H3.5M2.5 9H3.5M2.5 13H3.5" },
  { name: "сетка",       cat:"normal", d:["M2 2H7V7H2V2Z","M11 2H16V7H11V2Z","M2 11H7V16H2V11Z","M11 11H16V16H11V11Z"] },
  { name: "облако",      cat:"normal", d:"M13 13H5a3.5 3.5 0 010-7h.2A4 4 0 0113 7a3 3 0 010 6Z" },
  { name: "загрузить",   cat:"normal", d:"M9 2V12M4 8L9 13L14 8M2 16H16" },
  { name: "выгрузить",   cat:"normal", d:"M9 13V3M14 7L9 2L4 7M2 16H16" },
  { name: "поделиться",  cat:"normal", d:["M13 3a2 2 0 100 4 2 2 0 000-4Z","M5 7a2 2 0 100 4 2 2 0 000-4Z","M13 11a2 2 0 100 4 2 2 0 000-4Z","M7 9.5L11 7M7 8.5L11 11"] },
  { name: "ссылка",      cat:"normal", d:["M7.5 10.5L6 12a3 3 0 004.24 4.24L13 13.24a3 3 0 000-4.24L12 8","M10.5 7.5L12 6a3 3 0 00-4.24-4.24L5 4.76a3 3 0 000 4.24L6 10"] },
  { name: "изображение", cat:"normal", d:["M2 3H16V14H2V3Z","M2 10L5 7L8 10L11 7L16 12"] },
  { name: "метка",       cat:"normal", d:["M2 2H8L16 10L10 16L2 8V2Z","M5 5H6"] },
  { name: "глаз",        cat:"normal", d:["M9 4C5 4 2 9 2 9S5 14 9 14S16 9 16 9S13 4 9 4Z","M9 7a2 2 0 100 4 2 2 0 000-4Z"] },
  { name: "отправить",   cat:"normal", d:["M16 2L2 8L8 10L10 16L16 2Z","M8 10L16 2"] },
  { name: "закладка",    cat:"normal", d:"M5 2H13V16L9 13L5 16V2Z" },
  { name: "ключ",        cat:"normal", d:["M6 6a4 4 0 100 8 4 4 0 000-8Z","M10 10H16M13 10V13"] },
  { name: "фильтр",      cat:"normal", d:"M2 3H16L11 9V15L7 13V9L2 3Z" },
  { name: "обновить",    cat:"normal", d:["M14 9a5 5 0 10-1 3","M14 12V9H11"] },
  { name: "база данных", cat:"normal", d:["M2 5C2 3.3 5.1 2 9 2S16 3.3 16 5v2c0 1.7-3.1 3-7 3S2 8.7 2 7V5Z","M2 7v4c0 1.7 3.1 3 7 3s7-1.3 7-3V7","M2 11v2c0 1.7 3.1 3 7 3s7-1.3 7-3V11"] },
  { name: "глобус",      cat:"normal", d:["M9 2a7 7 0 100 14A7 7 0 009 2Z","M9 2C7 2 5.5 5.1 5.5 9S7 16 9 16s3.5-3.1 3.5-7S11 2 9 2Z","M2 9H16"] },
  { name: "карта",       cat:"normal", d:["M9 2a5 5 0 00-5 5c0 3.5 5 9 5 9S14 10.5 14 7a5 5 0 00-5-5Z","M9 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z"] },
  { name: "предупреждение",cat:"normal",d:["M9 2L16 14H2L9 2Z","M9 8V11","M9 12.5V13.5"] },
  { name: "информация",  cat:"normal", d:["M9 2a7 7 0 100 14A7 7 0 009 2Z","M9 8V12","M9 6V7"] },
  { name: "копировать",  cat:"normal", d:["M6 4H14V14H6V4Z","M4 6H4V16H12V14"] },
  { name: "солнце",      cat:"normal", d:["M9 6a3 3 0 100 6 3 3 0 000-6Z","M9 1V3M9 15V17M1 9H3M15 9H17M3.34 3.34l1.41 1.41M13.25 13.25l1.41 1.41M3.34 14.66l1.41-1.41M13.25 4.75l1.41-1.41"] },
  { name: "луна",        cat:"normal", d:"M10 2a7 7 0 100 14A5 5 0 0110 2Z" },
  { name: "кружок",      cat:"normal", d:"M9 9m-6 0a6 6 0 1012 0a6 6 0 01-12 0Z" },
  { name: "флаг",        cat:"normal", d:"M3 2V16M3 2L15 5L3 10" },
  // thin (strokeWidth 1.0)
  { name: "дом",          cat:"thin", d:"M2 8.5L9 2L16 8.5V16H12V11H6V16H2V8.5Z" },
  { name: "пользователь", cat:"thin", d:["M9 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z","M2.5 16c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5"] },
  { name: "настройки",    cat:"thin", d:["M9 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5Z","M9 1v2M9 15v2M1 9h2M15 9h2M3.34 3.34l1.41 1.41M13.25 13.25l1.41 1.41M3.34 14.66l1.41-1.41M13.25 4.75l1.41-1.41"] },
  { name: "колокол",      cat:"thin", d:["M9 1.5a5.5 5.5 0 00-5.5 5.5v4l-1.5 2h14l-1.5-2V7A5.5 5.5 0 009 1.5Z","M7 15.5a2 2 0 004 0"] },
  { name: "поиск",        cat:"thin", d:["M8 2a6 6 0 100 12A6 6 0 008 2Z","M12.5 12.5L16 16"] },
  { name: "звезда",       cat:"thin", d:"M9 1.5L11 6.5H16.5L12 10L14 15.5L9 12.5L4 15.5L6 10L1.5 6.5H7Z" },
  { name: "сердце",       cat:"thin", d:"M9 15.5S1.5 11.5 1.5 6a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0116.5 6c0 5.5-7.5 9.5-7.5 9.5Z" },
  { name: "плюс",         cat:"thin", d:"M9 2V16M2 9H16" },
  { name: "галочка",      cat:"thin", d:"M2 9L7 14L16 4" },
  { name: "закрыть",      cat:"thin", d:"M3 3L15 15M15 3L3 15" },
  { name: "карандаш",     cat:"thin", d:"M12.5 2.5L15.5 5.5L6 15L2 16L3 12L12.5 2.5Z" },
  { name: "письмо",       cat:"thin", d:["M2 4H16V14H2V4Z","M2 4L9 10L16 4"] },
  { name: "файл",         cat:"thin", d:["M4 2H11L14 5V16H4V2Z","M11 2V5H14"] },
  { name: "диаграмма",    cat:"thin", d:"M2 14H16M4 14V9H7V14M8 14V6H11V14M12 14V11H15V14" },
  { name: "замок",        cat:"thin", d:["M5 8V6a4 4 0 018 0V8","M3 8H15V16H3V8Z","M9 11V13"] },
  { name: "меню",         cat:"thin", d:"M2 5H16M2 9H16M2 13H16" },
  { name: "сетка",        cat:"thin", d:["M2 2H7V7H2V2Z","M11 2H16V7H11V2Z","M2 11H7V16H2V11Z","M11 11H16V16H11V11Z"] },
  { name: "облако",       cat:"thin", d:"M13 13H5a3.5 3.5 0 010-7h.2A4 4 0 0113 7a3 3 0 010 6Z" },
  { name: "загрузить",    cat:"thin", d:"M9 2V12M4 8L9 13L14 8M2 16H16" },
  { name: "глаз",         cat:"thin", d:["M9 4C5 4 2 9 2 9S5 14 9 14S16 9 16 9S13 4 9 4Z","M9 7a2 2 0 100 4 2 2 0 000-4Z"] },
  { name: "фильтр",       cat:"thin", d:"M2 3H16L11 9V15L7 13V9L2 3Z" },
  { name: "база данных",  cat:"thin", d:["M2 5C2 3.3 5.1 2 9 2S16 3.3 16 5v2c0 1.7-3.1 3-7 3S2 8.7 2 7V5Z","M2 7v4c0 1.7 3.1 3 7 3s7-1.3 7-3V7","M2 11v2c0 1.7 3.1 3 7 3s7-1.3 7-3V11"] },
  { name: "карта",        cat:"thin", d:["M9 2a5 5 0 00-5 5c0 3.5 5 9 5 9S14 10.5 14 7a5 5 0 00-5-5Z","M9 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z"] },
  { name: "информация",   cat:"thin", d:["M9 2a7 7 0 100 14A7 7 0 009 2Z","M9 8V12","M9 6V7"] },
  { name: "копировать",   cat:"thin", d:["M6 4H14V14H6V4Z","M4 6H4V16H12V14"] },
  { name: "флаг",         cat:"thin", d:"M3 2V16M3 2L15 5L3 10" },
  // filled
  { name: "дом",          cat:"filled", d:"M2 8.5L9 2L16 8.5V16H12V11H6V16H2V8.5Z", fill:true },
  { name: "пользователь", cat:"filled", d:["M9 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z","M2.5 16c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5"], fill:true },
  { name: "звезда",       cat:"filled", d:"M9 1.5L11 6.5H16.5L12 10L14 15.5L9 12.5L4 15.5L6 10L1.5 6.5H7Z", fill:true },
  { name: "сердце",       cat:"filled", d:"M9 15.5S1.5 11.5 1.5 6a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0116.5 6c0 5.5-7.5 9.5-7.5 9.5Z", fill:true },
  { name: "колокол",      cat:"filled", d:"M9 1.5a5.5 5.5 0 00-5.5 5.5v4l-1.5 2h14l-1.5-2V7A5.5 5.5 0 009 1.5Z", fill:true },
  { name: "карандаш",     cat:"filled", d:"M12.5 2.5L15.5 5.5L6 15L2 16L3 12L12.5 2.5Z", fill:true },
  { name: "папка",        cat:"filled", d:"M2 5H7L9 3H16V14H2V5Z", fill:true },
  { name: "диаграмма",    cat:"filled", d:["M4 9H7V14H4V9Z","M8 6H11V14H8V6Z","M12 11H15V14H12V11Z"], fill:true },
  { name: "замок",        cat:"filled", d:"M3 8H15V16H3V8Z", fill:true },
  { name: "метка",        cat:"filled", d:"M2 2H8L16 10L10 16L2 8V2Z", fill:true },
  { name: "закладка",     cat:"filled", d:"M5 2H13V16L9 13L5 16V2Z", fill:true },
  { name: "глобус",       cat:"filled", d:"M9 2a7 7 0 100 14A7 7 0 009 2Z", fill:true },
  { name: "предупреждение",cat:"filled", d:"M9 2L16 14H2L9 2Z", fill:true },
  { name: "фильтр",       cat:"filled", d:"M2 3H16L11 9V15L7 13V9L2 3Z", fill:true },
  { name: "флаг",         cat:"filled", d:"M3 2V10L15 5Z", fill:true },
];

function IconGlyph({ icon }: { icon: IconDef }) {
  const sw = icon.cat === "thin" ? "1" : "1.4";
  const paths = Array.isArray(icon.d) ? icon.d : [icon.d];
  return (
    <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
      {paths.map((d, i) => (
        <path key={i} d={d}
          stroke={icon.fill ? "none" : "currentColor"}
          fill={icon.fill ? "currentColor" : "none"}
          strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function IconPicker() {
  const TABS = ["Все", "Заполненные", "Тонкие", "Обычные"] as const;
  const CAT_MAP: Record<string, IconCat | "all"> = { "Все":"all", "Заполненные":"filled", "Тонкие":"thin", "Обычные":"normal" };
  const [tab, setTab] = useState<typeof TABS[number]>("Все");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const visible = ICON_LIB.filter((icon) => {
    const catOk = CAT_MAP[tab] === "all" || icon.cat === CAT_MAP[tab];
    const searchOk = !query || icon.name.includes(query.toLowerCase());
    return catOk && searchOk;
  });

  const selectedIcon = selected !== null ? ICON_LIB[selected] : null;

  return (
    <div className="w-[538px] bg-white rounded-[10px] p-[3px_10px_10px] flex flex-col gap-[5px]">
      <div className="flex items-center gap-[15px] h-[45px]">
        <span className="w-[41px] h-[41px] flex items-center justify-center bg-selected rounded-full shrink-0 text-cta">
          {selectedIcon ? <span className="w-[21px] h-[21px]"><IconGlyph icon={selectedIcon} /></span> : <span className="w-[21px] h-[21px]"><BookIcon /></span>}
        </span>
        <div className="flex-1 flex items-center gap-[10px] h-[31px] px-5 bg-selected rounded-btn">
          <span className="w-[15px] h-[15px]"><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="flex-1 text-[14px] text-primary bg-transparent outline-none placeholder-primary/40"
          />
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
          {visible.length === 0
            ? <span className="col-span-13 text-[11px] text-primary/40 py-4">Ничего не найдено</span>
            : ICON_LIB.map((icon, idx) => {
                if (!visible.includes(icon)) return null;
                const isSel = selected === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelected(isSel ? null : idx)}
                    title={icon.name}
                    className={cn(
                      "w-[18px] h-[18px] rounded-[3px] text-primary flex items-center justify-center transition-colors hover:bg-cta/15 hover:text-cta",
                      isSel && "bg-cta text-white",
                    )}
                  >
                    <IconGlyph icon={icon} />
                  </button>
                );
              })
          }
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
        <button key={opt.label} onClick={() => onChange(opt.label)}
          className={cn(
            "flex items-center gap-[30px] px-[30px] py-[11px] rounded-[30px] text-[16px] font-medium text-primary transition-colors",
            value === opt.label ? "bg-selected" : "bg-mainbg hover:bg-selected/60",
          )}>
          <span className="w-6 h-6 shrink-0"><SourceIcon type={opt.icon} /></span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SourceIcon({ type }: { type: string }) {
  if (type === "phone") return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M9 2 L15 2 C15.6 2 16 2.4 16 3 L16 21 C16 21.6 15.6 22 15 22 L9 22 C8.4 22 8 21.6 8 21 L8 3 C8 2.4 8.4 2 9 2 Z" stroke="#00205F" strokeWidth="1.8" /><circle cx="12" cy="19" r="1" fill="#00205F" /></svg>;
  if (type === "db") return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><ellipse cx="12" cy="7" rx="7" ry="3" stroke="#00205F" strokeWidth="1.8" /><path d="M5 7 L5 17 C5 18.65 8.13 20 12 20 C15.87 20 19 18.65 19 17 L19 7" stroke="#00205F" strokeWidth="1.8" /><path d="M5 12 C5 13.65 8.13 15 12 15 C15.87 15 19 13.65 19 12" stroke="#00205F" strokeWidth="1.8" /></svg>;
  if (type === "clock") return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="9" stroke="#00205F" strokeWidth="1.8" /><path d="M12 7 L12 12 L16 14" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === "chat") return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M4 4 L20 4 C20.6 4 21 4.4 21 5 L21 15 C21 15.6 20.6 16 20 16 L8 16 L4 20 L4 5 C4 4.4 4.4 4 4 4 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /><line x1="8" y1="9" x2="16" y2="9" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" /><line x1="8" y1="12" x2="13" y2="12" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" /></svg>;
  if (type === "form") return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M6 2 L15 2 L19 6 L19 22 L6 22 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /><path d="M15 2 L15 6 L19 6" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /><line x1="9" y1="11" x2="16" y2="11" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" /><line x1="9" y1="15" x2="16" y2="15" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" /><line x1="9" y1="19" x2="13" y2="19" stroke="#00205F" strokeWidth="1.6" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><rect x="2" y="5" width="20" height="14" rx="1" stroke="#00205F" strokeWidth="1.8" /><path d="M2 6 L12 13 L22 6" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
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
function TrashIconSm() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M6 7 L18 7" stroke="#00205F" strokeWidth="2" strokeLinecap="round" /><path d="M9 7 L9 5 L15 5 L15 7" stroke="#00205F" strokeWidth="2" /><path d="M7.5 7 L8 19 L16 19 L16.5 7" stroke="#00205F" strokeWidth="2" strokeLinejoin="round" /></svg>;
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
function SortListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><line x1="5" y1="7" x2="11" y2="7" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><line x1="5" y1="12" x2="11" y2="12" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><line x1="5" y1="17" x2="11" y2="17" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" /><rect x="14" y="5" width="5" height="5" rx="1" stroke="#35A7FF" strokeWidth="2" transform="rotate(90 16 8.5)" /><path d="M17 13 L17 19 L20 16" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function GearIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="3" stroke="#00205F" strokeWidth="1.8" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#00205F" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function ExpandIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M3 7 L10 3 L17 7 L17 13 L10 17 L3 13 Z" stroke="#00205F" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}
function DragIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="6" cy="4" r="1.2" fill="#00205F" /><circle cx="10" cy="4" r="1.2" fill="#00205F" /><circle cx="6" cy="8" r="1.2" fill="#00205F" /><circle cx="10" cy="8" r="1.2" fill="#00205F" /><circle cx="6" cy="12" r="1.2" fill="#00205F" /><circle cx="10" cy="12" r="1.2" fill="#00205F" /></svg>;
}
function ActionIcon({ id, active }: { id: ActionTypeId; active: boolean }) {
  const c = active ? "#35A7FF" : "#C2DBF8";
  if (id === "add_row") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><rect x="3" y="3" width="9" height="9" rx="1" stroke={c} strokeWidth="2" /><rect x="16" y="3" width="9" height="9" rx="1" stroke={c} strokeWidth="2" /><rect x="3" y="16" width="9" height="9" rx="1" stroke={c} strokeWidth="2" /><line x1="20.5" y1="16" x2="20.5" y2="25" stroke={c} strokeWidth="2" strokeLinecap="round" /><line x1="16" y1="20.5" x2="25" y2="20.5" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (id === "del_row") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M6 8 L22 8" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M10 8 L10 6 L18 6 L18 8" stroke={c} strokeWidth="2" /><path d="M8 8 L9 23 L19 23 L20 8" stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (id === "set_row") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><rect x="4" y="5" width="15" height="18" rx="1" stroke={c} strokeWidth="2" /><path d="M20 3 L25 8 L17 16 L12 16 L12 11 Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (id === "run_action") return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M8 5 L23 14 L8 23 Z" stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 28 28" fill="none" className="w-full h-full"><path d="M5 9 L20 9 M5 14 L15 14 M5 19 L12 19" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M22 12 L25 9 L22 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
