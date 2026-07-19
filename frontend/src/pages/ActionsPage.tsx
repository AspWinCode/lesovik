import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { ActionOrderModal } from "@/components/modals/Modals";
import { EditActionModal } from "@/components/modals/MiscModals";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities } from "@/shared/hooks/useEntities";
import {
  useWorkflows, useCreateWorkflow, useDeleteWorkflow, useActivateWorkflow, useDeactivateWorkflow,
  useWorkflowStates, useCreateState, useDeleteState, useUpdateState,
  useWorkflowTransitions, useCreateTransition, useDeleteTransition,
  useApprovalChains, useCreateApprovalChain, useUpdateApprovalChain, useDeleteApprovalChain,
} from "@/shared/hooks/useWorkflows";
import type {
  StateDefRead, TransitionDefRead, ApprovalChainDefRead,
  ApprovalLevelDefCreate, EscalationLevelDef,
} from "@/shared/api/workflows";

const POSITIONS = ["основной", "выделенный", "встроенный", "скрыть"];
const ICON_TABS = ["Все", "Заполненные", "Тонкие", "Обычные"];

export function ActionsPage() {
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState("");
  const [navCollapsed, setNavCollapsed] = useState(false);
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
  const createWfMutation = useCreateWorkflow(appId ?? "");
  const deleteWfMutation = useDeleteWorkflow(appId ?? "");
  const activateWfMutation = useActivateWorkflow(appId ?? "");
  const deactivateWfMutation = useDeactivateWorkflow(appId ?? "");

  // Create-workflow inline form
  const [createWfEntity, setCreateWfEntity] = useState<string | null>(null);
  const [newWfName, setNewWfName] = useState("");
  const [newWfInitial, setNewWfInitial] = useState("новый");

  const statesQuery = useWorkflowStates(appId, activeAction || undefined);
  const states = statesQuery.data ?? [];
  const createStateMutation = useCreateState(appId ?? "", activeAction);
  const deleteStateMutation = useDeleteState(appId ?? "", activeAction);
  const updateStateMutation = useUpdateState(appId ?? "", activeAction);

  const transitionsQuery = useWorkflowTransitions(appId, activeAction || undefined);
  const transitions = transitionsQuery.data ?? [];
  const createTransitionMutation = useCreateTransition(appId ?? "", activeAction);
  const deleteTransitionMutation = useDeleteTransition(appId ?? "", activeAction);

  const chainsQuery = useApprovalChains(appId, activeAction || undefined);
  const chains = chainsQuery.data ?? [];
  const createChainMutation = useCreateApprovalChain(appId ?? "", activeAction);
  const updateChainMutation = useUpdateApprovalChain(appId ?? "", activeAction);
  const deleteChainMutation = useDeleteApprovalChain(appId ?? "", activeAction);

  const activeWorkflow = workflows.find((w) => w.id === activeAction);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />

      {/* ── Actions list panel ── */}
      {!navCollapsed && <aside
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
                      <span
                        className="w-5 h-5"
                        onClick={(e) => { e.stopPropagation(); setCreateWfEntity(entity.id); setNewWfName(""); setNewWfInitial("новый"); }}
                        title="Создать процесс"
                      ><PlusIcon /></span>
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
                      "text-[18px] leading-[150%] font-medium flex-1 truncate",
                      wf.id === activeAction ? "text-cta" : "text-primary"
                    )}>{wf.name}</span>
                    {wf.is_active && (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Активен" />
                    )}
                  </button>
                ))}

                {/* Inline create-workflow form */}
                {open && createWfEntity === entity.id && (
                  <div className="mx-[15px] mb-[8px] bg-cardbg rounded-[10px] p-[12px] flex flex-col gap-[8px]">
                    <input
                      autoFocus
                      value={newWfName}
                      onChange={(e) => setNewWfName(e.target.value)}
                      placeholder="Название процесса"
                      className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                    />
                    <input
                      value={newWfInitial}
                      onChange={(e) => setNewWfInitial(e.target.value)}
                      placeholder="Начальное состояние (slug)"
                      className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                    />
                    <div className="flex gap-[6px] justify-end">
                      <button
                        onClick={() => { setCreateWfEntity(null); setNewWfName(""); setNewWfInitial("новый"); }}
                        className="h-[28px] px-[10px] text-[12px] text-primary bg-white border border-primary/20 rounded-btn hover:bg-primary/5 transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        disabled={!newWfName.trim() || !newWfInitial.trim()}
                        onClick={() => {
                          createWfMutation.mutate(
                            { entity_id: entity.id, name: newWfName.trim(), initial_state: newWfInitial.trim() },
                            { onSuccess: () => { setCreateWfEntity(null); setNewWfName(""); setNewWfInitial("новый"); } }
                          );
                        }}
                        className="h-[28px] px-[10px] text-[12px] text-white bg-cta rounded-btn hover:bg-cta/90 transition-colors disabled:opacity-50"
                      >
                        Создать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>}

      {/* ── Center: action editor ── */}
      <div
        className="absolute bg-mainbg rounded-[5px] overflow-hidden flex flex-col"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1235 : 945, height: 1000, transition: "left 0.2s, width 0.2s" }}
      >
        {/* Title bar */}
        <div className="h-[60px] flex items-center justify-between px-[41px] shrink-0">
          <div className="flex items-center gap-[10px]">
            <h1 className="text-nav font-bold text-primary">
              {activeWorkflow?.name ?? activeAction}
            </h1>
            {activeWorkflow && (
              <span className={cn(
                "h-[22px] px-[8px] rounded-[11px] text-[11px] font-medium",
                activeWorkflow.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {activeWorkflow.is_active ? "Активен" : "Черновик"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeWorkflow && (
              activeWorkflow.is_active ? (
                <button
                  onClick={() => deactivateWfMutation.mutate(activeAction)}
                  className="flex items-center gap-1.5 px-3 h-[32px] border border-amber-400/60 rounded-btn text-amber-600 text-[13px] hover:bg-amber-50 transition-colors"
                >
                  Деактивировать
                </button>
              ) : (
                <button
                  onClick={() => activateWfMutation.mutate(activeAction)}
                  className="flex items-center gap-1.5 px-3 h-[32px] border border-green-400/60 rounded-btn text-green-700 text-[13px] hover:bg-green-50 transition-colors"
                >
                  Активировать
                </button>
              )
            )}
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
          {activeWorkflow && (
            <button
              onClick={() => {
                if (confirm(`Удалить процесс «${activeWorkflow.name}»?`)) {
                  deleteWfMutation.mutate(activeAction, { onSuccess: () => setActiveAction("") });
                }
              }}
              className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Удалить процесс"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
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

          {/* Состояния */}
          <StatesSection
            states={states}
            workflowId={activeAction}
            onCreate={(body) => createStateMutation.mutate(body)}
            onDelete={(stateId) => deleteStateMutation.mutate(stateId)}
          />

          {/* Переходы */}
          <TransitionsSection
            transitions={transitions}
            states={states}
            workflowId={activeAction}
            onCreate={(body) => createTransitionMutation.mutate(body)}
            onDelete={(id) => deleteTransitionMutation.mutate(id)}
          />

          {/* Ответственные по состояниям */}
          <AssigneesSection
            states={states}
            appId={appId ?? ""}
            workflowId={activeAction}
            onSave={(stateId, body) =>
              updateStateMutation.mutate({ stateId, body })
            }
          />

          {/* Эскалация SLA */}
          <EscalationSection
            states={states}
            workflowId={activeAction}
            onSave={(stateId, escalation_levels) =>
              updateStateMutation.mutate({ stateId, body: { escalation_levels } })
            }
          />

          {/* Цепочки согласования */}
          <ApprovalChainsSection
            chains={chains}
            workflowId={activeAction}
            onCreate={(body) => createChainMutation.mutate(body)}
            onUpdate={(chainId, body) => updateChainMutation.mutate({ chainId, body })}
            onDelete={(chainId) => deleteChainMutation.mutate(chainId)}
          />

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

/* ── States section ── */

const STATE_COLORS = [
  { label: "Синий",    value: "#35A7FF" },
  { label: "Зелёный",  value: "#22c55e" },
  { label: "Жёлтый",  value: "#f59e0b" },
  { label: "Красный",  value: "#ef4444" },
  { label: "Фиолетовый", value: "#8b5cf6" },
  { label: "Серый",   value: "#6b7280" },
];

interface StateDraft {
  name: string;
  display_name: string;
  color: string;
  is_terminal: boolean;
  sla_seconds: string;
}

function emptyStateDraft(): StateDraft {
  return { name: "", display_name: "", color: "#35A7FF", is_terminal: false, sla_seconds: "" };
}

function StatesSection({
  states,
  workflowId,
  onCreate,
  onDelete,
}: {
  states: StateDefRead[];
  workflowId: string;
  onCreate: (body: { name: string; display_name: string; color?: string | null; is_terminal?: boolean; sla_seconds?: number | null }) => void;
  onDelete: (stateId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<StateDraft>(emptyStateDraft());

  if (!workflowId) return null;

  const saveNew = () => {
    if (!draft.name.trim() || !draft.display_name.trim()) return;
    onCreate({
      name: draft.name.trim(),
      display_name: draft.display_name.trim(),
      color: draft.color || null,
      is_terminal: draft.is_terminal,
      sla_seconds: draft.sla_seconds ? parseInt(draft.sla_seconds, 10) : null,
    });
    setCreating(false);
    setDraft(emptyStateDraft());
  };

  return (
    <div className="border-t-2 border-white py-[10px] pb-[30px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-[40px] py-[7px]"
      >
        <span className="text-[20px] font-bold text-primary">Состояния</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>

      {open && (
        <div className="flex flex-col gap-[10px] mt-[10px]">
          {/* Existing states */}
          {states.length === 0 && !creating && (
            <p className="text-[14px] text-primary/60 px-[40px]">
              Нет состояний. Нажмите «+», чтобы добавить первое.
            </p>
          )}

          <div className="flex flex-wrap gap-[10px] px-[40px]">
            {states.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-[8px] h-[36px] px-[12px] rounded-[18px] border"
                style={{ borderColor: s.color ?? "#35A7FF", backgroundColor: (s.color ?? "#35A7FF") + "1a" }}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color ?? "#35A7FF" }} />
                <span className="text-[13px] font-medium" style={{ color: s.color ?? "#00205F" }}>
                  {s.display_name}
                </span>
                <span className="text-[11px] text-primary/40">({s.name})</span>
                {s.is_terminal && (
                  <span className="text-[10px] px-[5px] h-[16px] flex items-center rounded-[8px] bg-green-100 text-green-700 font-medium">
                    Финал
                  </span>
                )}
                {s.sla_seconds && (
                  <span className="text-[10px] px-[5px] h-[16px] flex items-center rounded-[8px] bg-amber-100 text-amber-700">
                    SLA {s.sla_seconds >= 3600 ? `${s.sla_seconds / 3600}ч` : `${s.sla_seconds / 60}м`}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Удалить состояние «${s.display_name}»?`)) onDelete(s.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors"
                  title="Удалить"
                >
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Create form */}
          {creating && (
            <div className="mx-[40px] bg-cardbg rounded-[12px] p-[16px] flex flex-col gap-[12px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Slug (напр. в_работе)"
                  className="h-[34px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
                <input
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  placeholder="Отображаемое имя"
                  className="h-[34px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
              </div>

              <div className="flex items-center gap-[14px]">
                <span className="text-[12px] text-primary/60">Цвет:</span>
                <div className="flex items-center gap-[6px]">
                  {STATE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setDraft({ ...draft, color: c.value })}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform",
                        draft.color === c.value ? "scale-125 border-white shadow" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>

                <label className="flex items-center gap-[6px] cursor-pointer ml-[10px]">
                  <input
                    type="checkbox"
                    checked={draft.is_terminal}
                    onChange={(e) => setDraft({ ...draft, is_terminal: e.target.checked })}
                    className="w-4 h-4 rounded accent-cta"
                  />
                  <span className="text-[12px] text-primary/70">Финальное</span>
                </label>

                <div className="flex items-center gap-[6px] ml-[6px]">
                  <span className="text-[12px] text-primary/60">SLA (сек):</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.sla_seconds}
                    onChange={(e) => setDraft({ ...draft, sla_seconds: e.target.value })}
                    placeholder="0"
                    className="w-[80px] h-[30px] px-[8px] bg-white rounded-btn text-[12px] text-primary outline-none border border-transparent focus:border-cta/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-[8px]">
                <button
                  onClick={() => { setCreating(false); setDraft(emptyStateDraft()); }}
                  className="h-[30px] px-[12px] bg-white border border-primary/20 text-primary text-[12px] rounded-btn hover:bg-primary/5 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveNew}
                  disabled={!draft.name.trim() || !draft.display_name.trim()}
                  className="h-[30px] px-[12px] bg-cta text-white text-[12px] rounded-btn hover:bg-cta/90 transition-colors disabled:opacity-50"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="self-start mx-[40px] flex items-center gap-[6px] h-[30px] px-[12px] bg-cta/10 rounded-btn text-cta text-[12px] hover:bg-cta/20 transition-colors"
            >
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Добавить состояние
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Transitions section ── */

interface TransitionDraft {
  name: string;
  display_name: string;
  from_state: string;
  to_state: string;
  required_roles: string;
}

function emptyTransitionDraft(states: StateDefRead[]): TransitionDraft {
  return {
    name: "",
    display_name: "",
    from_state: states[0]?.name ?? "",
    to_state: states[1]?.name ?? states[0]?.name ?? "",
    required_roles: "",
  };
}

function TransitionsSection({
  transitions,
  states,
  workflowId,
  onCreate,
  onDelete,
}: {
  transitions: TransitionDefRead[];
  states: StateDefRead[];
  workflowId: string;
  onCreate: (body: { name: string; display_name: string; from_state: string; to_state: string; required_roles: string[] }) => void;
  onDelete: (transitionId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TransitionDraft>(() => emptyTransitionDraft(states));

  if (!workflowId) return null;

  const stateLabel = (slug: string) =>
    states.find((s) => s.name === slug)?.display_name ?? slug;

  const saveNew = () => {
    if (!draft.name.trim() || !draft.from_state || !draft.to_state) return;
    const roles = draft.required_roles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    onCreate({
      name: draft.name.trim(),
      display_name: draft.display_name.trim() || draft.name.trim(),
      from_state: draft.from_state,
      to_state: draft.to_state,
      required_roles: roles,
    });
    setCreating(false);
    setDraft(emptyTransitionDraft(states));
  };

  return (
    <div className="border-t-2 border-white py-[10px] pb-[30px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-[40px] py-[7px]"
      >
        <span className="text-[20px] font-bold text-primary">Переходы</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>

      {open && (
        <div className="flex flex-col gap-[8px] mt-[10px]">
          {transitions.length === 0 && !creating && (
            <p className="text-[14px] text-primary/60 px-[40px]">
              Нет переходов. Добавьте хотя бы один переход между состояниями.
            </p>
          )}

          {transitions.map((tr) => (
            <div key={tr.id} className="flex items-center gap-[10px] px-[40px]">
              {/* From → To */}
              <div className="flex items-center gap-[6px] min-w-0">
                <span
                  className="h-[26px] px-[10px] flex items-center rounded-[13px] text-[12px] font-medium shrink-0"
                  style={{
                    backgroundColor: (states.find((s) => s.name === tr.from_state)?.color ?? "#6b7280") + "22",
                    color: states.find((s) => s.name === tr.from_state)?.color ?? "#6b7280",
                  }}
                >
                  {stateLabel(tr.from_state)}
                </span>
                <svg viewBox="0 0 16 8" fill="none" className="w-4 h-2 shrink-0">
                  <path d="M0 4h14M10 1l4 3-4 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                  className="h-[26px] px-[10px] flex items-center rounded-[13px] text-[12px] font-medium shrink-0"
                  style={{
                    backgroundColor: (states.find((s) => s.name === tr.to_state)?.color ?? "#6b7280") + "22",
                    color: states.find((s) => s.name === tr.to_state)?.color ?? "#6b7280",
                  }}
                >
                  {stateLabel(tr.to_state)}
                </span>
              </div>

              <span className="text-[13px] text-primary/70 truncate flex-1">{tr.display_name}</span>
              <span className="text-[11px] text-primary/40 font-mono shrink-0">{tr.name}</span>

              {tr.required_roles.length > 0 && (
                <span className="text-[11px] px-[6px] h-[20px] flex items-center rounded bg-purple-50 text-purple-600 shrink-0">
                  {tr.required_roles.join(", ")}
                </span>
              )}

              <button
                onClick={() => {
                  if (confirm(`Удалить переход «${tr.display_name}»?`)) onDelete(tr.id);
                }}
                className="w-6 h-6 flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors shrink-0"
              >
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}

          {/* Create form */}
          {creating && (
            <div className="mx-[40px] bg-cardbg rounded-[12px] p-[16px] flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Slug (напр. submit)"
                  className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
                <input
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  placeholder="Отображаемое имя"
                  className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-[8px] items-center">
                <select
                  value={draft.from_state}
                  onChange={(e) => setDraft({ ...draft, from_state: e.target.value })}
                  className="h-[32px] px-[8px] bg-white rounded-btn text-[13px] text-primary outline-none cursor-pointer"
                >
                  <option value="">— из состояния —</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.name}>{s.display_name}</option>
                  ))}
                </select>
                <svg viewBox="0 0 16 8" fill="none" className="w-4 h-2">
                  <path d="M0 4h14M10 1l4 3-4 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <select
                  value={draft.to_state}
                  onChange={(e) => setDraft({ ...draft, to_state: e.target.value })}
                  className="h-[32px] px-[8px] bg-white rounded-btn text-[13px] text-primary outline-none cursor-pointer"
                >
                  <option value="">— в состояние —</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.name}>{s.display_name}</option>
                  ))}
                </select>
              </div>

              <input
                value={draft.required_roles}
                onChange={(e) => setDraft({ ...draft, required_roles: e.target.value })}
                placeholder="Роли (через запятую, опционально)"
                className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
              />

              <div className="flex justify-end gap-[8px]">
                <button
                  onClick={() => { setCreating(false); setDraft(emptyTransitionDraft(states)); }}
                  className="h-[30px] px-[12px] bg-white border border-primary/20 text-primary text-[12px] rounded-btn hover:bg-primary/5 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveNew}
                  disabled={!draft.name.trim() || !draft.from_state || !draft.to_state}
                  className="h-[30px] px-[12px] bg-cta text-white text-[12px] rounded-btn hover:bg-cta/90 transition-colors disabled:opacity-50"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {!creating && (
            <button
              onClick={() => { setCreating(true); setDraft(emptyTransitionDraft(states)); }}
              className="self-start mx-[40px] flex items-center gap-[6px] h-[30px] px-[12px] bg-cta/10 rounded-btn text-cta text-[12px] hover:bg-cta/20 transition-colors"
            >
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Добавить переход
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Assignees section ── */
type AssigneeType = "user" | "group" | "role" | "";

function AssigneesSection({
  states,
  workflowId,
  onSave,
}: {
  states: StateDefRead[];
  appId: string;
  workflowId: string;
  onSave: (stateId: string, body: { assignee_type: "user" | "group" | "role" | null; assignee_id: string | null }) => void;
}) {
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { type: AssigneeType; id: string }>>({});

  if (!workflowId) return null;

  const getDraft = (s: StateDefRead) =>
    drafts[s.id] ?? {
      type: (s.assignee_type as AssigneeType) ?? "",
      id: s.assignee_id ?? "",
    };

  const setDraft = (stateId: string, patch: Partial<{ type: AssigneeType; id: string }>) =>
    setDrafts((prev) => ({ ...prev, [stateId]: { ...getDraft({ id: stateId } as StateDefRead), ...patch } }));

  return (
    <div className="border-t-2 border-white py-[10px] pb-[30px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-[40px] py-[7px]"
      >
        <span className="text-[20px] font-bold text-primary">Ответственные по состояниям</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>

      {open && (
        <div className="flex flex-col gap-[12px] mt-[10px]">
          {states.length === 0 && (
            <p className="text-[14px] text-primary/60 px-[40px]">Нет состояний — сначала добавьте состояния в workflow.</p>
          )}
          {states.map((s) => {
            const draft = getDraft(s);
            const dirty =
              draft.type !== ((s.assignee_type ?? "") as AssigneeType) ||
              draft.id !== (s.assignee_id ?? "");
            return (
              <div key={s.id} className="px-[40px] flex items-center gap-[16px]">
                {/* State chip */}
                <div
                  className="h-[32px] px-[12px] flex items-center rounded-[16px] text-[14px] font-medium shrink-0"
                  style={{
                    backgroundColor: s.color ? s.color + "33" : "#e8edf7",
                    color: s.color ?? "#00205F",
                    minWidth: 120,
                  }}
                >
                  {s.display_name}
                </div>

                {/* Type selector */}
                <select
                  value={draft.type}
                  onChange={(e) => setDraft(s.id, { type: e.target.value as AssigneeType, id: "" })}
                  className="h-[36px] px-[10px] bg-cardbg rounded-btn text-[14px] text-primary outline-none border border-transparent focus:border-cta/40 cursor-pointer"
                >
                  <option value="">— не задано —</option>
                  <option value="user">Пользователь</option>
                  <option value="group">Группа</option>
                  <option value="role">Роль</option>
                </select>

                {/* ID input */}
                {draft.type !== "" && (
                  <input
                    value={draft.id}
                    onChange={(e) => setDraft(s.id, { id: e.target.value })}
                    placeholder={draft.type === "role" ? "Название роли" : "UUID"}
                    className="flex-1 h-[36px] px-[12px] bg-cardbg rounded-btn text-[14px] text-primary outline-none border border-transparent focus:border-cta/40"
                  />
                )}

                {/* Save button */}
                {dirty && (
                  <button
                    onClick={() =>
                      onSave(s.id, {
                        assignee_type: (draft.type || null) as "user" | "group" | "role" | null,
                        assignee_id: draft.id || null,
                      })
                    }
                    className="h-[32px] px-[14px] bg-cta text-white text-[13px] rounded-btn hover:bg-cta/90 transition-colors shrink-0"
                  >
                    Сохранить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── SLA Escalation section ── */

type EscLevelDraft = { delay_seconds: string; assignee_type: "user" | "group" | ""; assignee_id: string; message: string };
type EscDraft = { level1: EscLevelDraft; level2: EscLevelDraft };

function emptyEscLevel(): EscLevelDraft {
  return { delay_seconds: "", assignee_type: "", assignee_id: "", message: "" };
}

function stateToEscDraft(s: StateDefRead): EscDraft {
  const lvl = (n: 1 | 2): EscLevelDraft => {
    const e = s.escalation_levels?.find((l) => l.level === n);
    if (!e) return emptyEscLevel();
    return {
      delay_seconds: String(e.delay_seconds ?? ""),
      assignee_type: (e.assignee_type ?? "") as EscLevelDraft["assignee_type"],
      assignee_id: e.assignee_id ?? "",
      message: e.message ?? "",
    };
  };
  return { level1: lvl(1), level2: lvl(2) };
}

function draftToLevels(d: EscDraft): EscalationLevelDef[] {
  const levels: EscalationLevelDef[] = [];
  for (const [n, lvl] of [[1, d.level1], [2, d.level2]] as [1 | 2, EscLevelDraft][]) {
    const delay = parseInt(lvl.delay_seconds, 10);
    if (!isNaN(delay) && delay > 0) {
      levels.push({
        level: n,
        delay_seconds: delay,
        assignee_type: lvl.assignee_type || null,
        assignee_id: lvl.assignee_id || null,
        message: lvl.message || null,
      });
    }
  }
  return levels;
}

function escDirty(s: StateDefRead, d: EscDraft): boolean {
  return JSON.stringify(draftToLevels(d)) !== JSON.stringify(s.escalation_levels ?? []);
}

function EscalationSection({
  states,
  workflowId,
  onSave,
}: {
  states: StateDefRead[];
  workflowId: string;
  onSave: (stateId: string, levels: EscalationLevelDef[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, EscDraft>>({});

  if (!workflowId) return null;

  const slaStates = states.filter((s) => !s.is_terminal);

  const getDraft = (s: StateDefRead): EscDraft => drafts[s.id] ?? stateToEscDraft(s);
  const setLvl = (stateId: string, lvlKey: "level1" | "level2", patch: Partial<EscLevelDraft>) =>
    setDrafts((prev) => {
      const cur = prev[stateId] ?? stateToEscDraft(states.find((s) => s.id === stateId)!);
      return { ...prev, [stateId]: { ...cur, [lvlKey]: { ...cur[lvlKey], ...patch } } };
    });

  return (
    <div className="border-t-2 border-white py-[10px] pb-[30px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-[40px] py-[7px]"
      >
        <span className="text-[20px] font-bold text-primary">Эскалация SLA</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>

      {open && (
        <div className="flex flex-col gap-[16px] mt-[10px] px-[40px]">
          {slaStates.length === 0 && (
            <p className="text-[14px] text-primary/60">Нет не-терминальных состояний с SLA.</p>
          )}
          {slaStates.map((s) => {
            if (!s.sla_seconds) return null;
            const draft = getDraft(s);
            const dirty = escDirty(s, draft);

            return (
              <div key={s.id} className="bg-cardbg rounded-xl p-[16px] flex flex-col gap-[12px]">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[10px]">
                    <div
                      className="h-[28px] px-[10px] flex items-center rounded-[14px] text-[13px] font-medium shrink-0"
                      style={{ backgroundColor: (s.color ?? "#35A7FF") + "33", color: s.color ?? "#00205F" }}
                    >
                      {s.display_name}
                    </div>
                    <span className="text-[12px] text-primary/50">
                      SLA: {s.sla_seconds >= 3600 ? `${s.sla_seconds / 3600} ч` : `${s.sla_seconds / 60} мин`}
                    </span>
                  </div>
                  {dirty && (
                    <button
                      onClick={() => onSave(s.id, draftToLevels(draft))}
                      className="h-[28px] px-[12px] bg-cta text-white text-[12px] rounded-btn hover:bg-cta/90 transition-colors"
                    >
                      Сохранить
                    </button>
                  )}
                </div>

                {/* Levels */}
                {(["level1", "level2"] as const).map((lvlKey, idx) => {
                  const lvl = draft[lvlKey];
                  const label = idx === 0 ? "Уровень 1 — Ответственный" : "Уровень 2 — Руководитель";
                  return (
                    <div key={lvlKey} className="flex flex-col gap-[8px] pl-[4px]">
                      <div className="flex items-center gap-[8px]">
                        <span className="w-[6px] h-[6px] rounded-full bg-cta/60 shrink-0" />
                        <span className="text-[13px] font-semibold text-primary">{label}</span>
                      </div>
                      <div className="grid grid-cols-[auto_auto_1fr_1fr] gap-[8px] items-center pl-[14px]">
                        <span className="text-[12px] text-primary/60 whitespace-nowrap">Задержка (сек)</span>
                        <input
                          type="number"
                          min={1}
                          value={lvl.delay_seconds}
                          onChange={(e) => setLvl(s.id, lvlKey, { delay_seconds: e.target.value })}
                          placeholder="3600"
                          className="w-[90px] h-[32px] px-[10px] bg-white/60 rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                        />
                        <select
                          value={lvl.assignee_type}
                          onChange={(e) => setLvl(s.id, lvlKey, { assignee_type: e.target.value as EscLevelDraft["assignee_type"], assignee_id: "" })}
                          className="h-[32px] px-[8px] bg-white/60 rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40 cursor-pointer"
                        >
                          <option value="">— тип —</option>
                          <option value="user">Пользователь</option>
                          <option value="group">Группа</option>
                        </select>
                        {lvl.assignee_type !== "" && (
                          <input
                            value={lvl.assignee_id}
                            onChange={(e) => setLvl(s.id, lvlKey, { assignee_id: e.target.value })}
                            placeholder="UUID"
                            className="h-[32px] px-[10px] bg-white/60 rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                          />
                        )}
                      </div>
                      <div className="pl-[14px]">
                        <input
                          value={lvl.message}
                          onChange={(e) => setLvl(s.id, lvlKey, { message: e.target.value })}
                          placeholder="Сообщение уведомления (опционально)"
                          className="w-full h-[32px] px-[10px] bg-white/60 rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Approval chains section ── */
type LevelDraft = { level_order: number; display_name: string; assignee_type: string; assignee_id: string };
type ChainDraft = { name: string; on_approve_transition: string; on_reject_transition: string; levels: LevelDraft[] };

function emptyChainDraft(): ChainDraft {
  return { name: "", on_approve_transition: "", on_reject_transition: "", levels: [{ level_order: 1, display_name: "Менеджер", assignee_type: "", assignee_id: "" }] };
}

function chainToRead(chain: ApprovalChainDefRead): ChainDraft {
  return {
    name: chain.name,
    on_approve_transition: chain.on_approve_transition ?? "",
    on_reject_transition: chain.on_reject_transition ?? "",
    levels: chain.levels.map((l) => ({ level_order: l.level_order, display_name: l.display_name, assignee_type: l.assignee_type ?? "", assignee_id: l.assignee_id ?? "" })),
  };
}

function ApprovalChainsSection({
  chains,
  workflowId,
  onCreate,
  onUpdate,
  onDelete,
}: {
  chains: ApprovalChainDefRead[];
  workflowId: string;
  onCreate: (body: { name: string; on_approve_transition?: string | null; on_reject_transition?: string | null; levels: ApprovalLevelDefCreate[] }) => void;
  onUpdate: (chainId: string, body: { name?: string; on_approve_transition?: string | null; on_reject_transition?: string | null; levels?: ApprovalLevelDefCreate[] }) => void;
  onDelete: (chainId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, ChainDraft>>({});
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<ChainDraft>(emptyChainDraft());

  if (!workflowId) return null;

  const getDraft = (chain: ApprovalChainDefRead) => drafts[chain.id] ?? chainToRead(chain);
  const setDraft = (chainId: string, patch: Partial<ChainDraft>) =>
    setDrafts((prev) => ({ ...prev, [chainId]: { ...(prev[chainId] ?? chainToRead(chains.find((c) => c.id === chainId)!)), ...patch } }));

  const patchLevel = (draft: ChainDraft, setFn: (d: ChainDraft) => void, idx: number, patch: Partial<LevelDraft>) =>
    setFn({ ...draft, levels: draft.levels.map((l, i) => i === idx ? { ...l, ...patch } : l) });

  const addLevel = (draft: ChainDraft, setFn: (d: ChainDraft) => void) => {
    const nextOrder = (draft.levels[draft.levels.length - 1]?.level_order ?? 0) + 1;
    setFn({ ...draft, levels: [...draft.levels, { level_order: nextOrder, display_name: "", assignee_type: "", assignee_id: "" }] });
  };

  const removeLevel = (draft: ChainDraft, setFn: (d: ChainDraft) => void, idx: number) =>
    setFn({ ...draft, levels: draft.levels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, level_order: i + 1 })) });

  const saveDraft = (chain: ApprovalChainDefRead, draft: ChainDraft) => {
    onUpdate(chain.id, {
      name: draft.name,
      on_approve_transition: draft.on_approve_transition || null,
      on_reject_transition: draft.on_reject_transition || null,
      levels: draft.levels.map((l) => ({ level_order: l.level_order, display_name: l.display_name, assignee_type: (l.assignee_type || null) as "user" | "group" | "role" | null, assignee_id: l.assignee_id || null })),
    });
    setDrafts((prev) => { const n = { ...prev }; delete n[chain.id]; return n; });
  };

  const saveNew = () => {
    onCreate({
      name: newDraft.name,
      on_approve_transition: newDraft.on_approve_transition || null,
      on_reject_transition: newDraft.on_reject_transition || null,
      levels: newDraft.levels.map((l) => ({ level_order: l.level_order, display_name: l.display_name, assignee_type: (l.assignee_type || null) as "user" | "group" | "role" | null, assignee_id: l.assignee_id || null })),
    });
    setCreating(false);
    setNewDraft(emptyChainDraft());
  };

  const isDirty = (chain: ApprovalChainDefRead) => !!drafts[chain.id];

  return (
    <div className="border-t-2 border-white py-[10px] pb-[30px]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-[40px] py-[7px]">
        <span className="text-[20px] font-bold text-primary">Цепочки согласования</span>
        <span className="w-3 h-3"><Chevron open={open} /></span>
      </button>

      {open && (
        <div className="flex flex-col gap-[16px] mt-[10px]">
          {chains.length === 0 && !creating && (
            <p className="text-[14px] text-primary/60 px-[40px]">Нет цепочек. Нажмите «+», чтобы создать.</p>
          )}

          {chains.map((chain) => {
            const draft = getDraft(chain);
            const setFn = (d: ChainDraft) => setDraft(chain.id, d);
            return (
              <div key={chain.id} className="mx-[40px] bg-cardbg rounded-[12px] p-[16px] flex flex-col gap-[12px]">
                {/* Header row */}
                <div className="flex items-center gap-[10px]">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft(chain.id, { name: e.target.value })}
                    placeholder="Название цепочки"
                    className="flex-1 h-[36px] px-[12px] bg-white rounded-btn text-[14px] text-primary outline-none border border-transparent focus:border-cta/40"
                  />
                  <button onClick={() => onDelete(chain.id)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors" title="Удалить цепочку">
                    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4"><path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>

                {/* Transition refs */}
                <div className="grid grid-cols-2 gap-[10px]">
                  <input
                    value={draft.on_approve_transition}
                    onChange={(e) => setDraft(chain.id, { on_approve_transition: e.target.value })}
                    placeholder="Переход при одобрении"
                    className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                  />
                  <input
                    value={draft.on_reject_transition}
                    onChange={(e) => setDraft(chain.id, { on_reject_transition: e.target.value })}
                    placeholder="Переход при отклонении"
                    className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                  />
                </div>

                {/* Levels */}
                <div className="flex flex-col gap-[8px]">
                  {draft.levels.map((level, idx) => (
                    <div key={idx} className="flex items-center gap-[8px]">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-cta/20 text-cta text-[11px] font-bold shrink-0">{level.level_order}</span>
                      <input
                        value={level.display_name}
                        onChange={(e) => patchLevel(draft, setFn, idx, { display_name: e.target.value })}
                        placeholder="Название уровня"
                        className="flex-1 h-[30px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                      />
                      <select
                        value={level.assignee_type}
                        onChange={(e) => patchLevel(draft, setFn, idx, { assignee_type: e.target.value, assignee_id: "" })}
                        className="h-[30px] px-[8px] bg-white rounded-btn text-[13px] text-primary outline-none cursor-pointer"
                      >
                        <option value="">— тип —</option>
                        <option value="user">Пользователь</option>
                        <option value="group">Группа</option>
                        <option value="role">Роль</option>
                      </select>
                      {level.assignee_type && (
                        <input
                          value={level.assignee_id}
                          onChange={(e) => patchLevel(draft, setFn, idx, { assignee_id: e.target.value })}
                          placeholder={level.assignee_type === "role" ? "Роль" : "UUID"}
                          className="w-[140px] h-[30px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                        />
                      )}
                      {draft.levels.length > 1 && (
                        <button onClick={() => removeLevel(draft, setFn, idx)} className="w-6 h-6 flex items-center justify-center text-primary/40 hover:text-red-400 transition-colors" title="Удалить уровень">
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => addLevel(draft, setFn)}
                    className="self-start flex items-center gap-[6px] h-[28px] px-[10px] bg-cta/10 rounded-btn text-cta text-[12px] hover:bg-cta/20 transition-colors"
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Добавить уровень
                  </button>
                </div>

                {/* Save row */}
                {isDirty(chain) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveDraft(chain, draft)}
                      className="h-[32px] px-[14px] bg-cta text-white text-[13px] rounded-btn hover:bg-cta/90 transition-colors"
                    >
                      Сохранить
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* New chain form */}
          {creating && (
            <div className="mx-[40px] bg-cardbg rounded-[12px] p-[16px] flex flex-col gap-[12px]">
              <input
                value={newDraft.name}
                onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                placeholder="Название цепочки"
                className="h-[36px] px-[12px] bg-white rounded-btn text-[14px] text-primary outline-none border border-transparent focus:border-cta/40"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-[10px]">
                <input
                  value={newDraft.on_approve_transition}
                  onChange={(e) => setNewDraft({ ...newDraft, on_approve_transition: e.target.value })}
                  placeholder="Переход при одобрении"
                  className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
                <input
                  value={newDraft.on_reject_transition}
                  onChange={(e) => setNewDraft({ ...newDraft, on_reject_transition: e.target.value })}
                  placeholder="Переход при отклонении"
                  className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                {newDraft.levels.map((level, idx) => (
                  <div key={idx} className="flex items-center gap-[8px]">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-cta/20 text-cta text-[11px] font-bold shrink-0">{level.level_order}</span>
                    <input
                      value={level.display_name}
                      onChange={(e) => patchLevel(newDraft, setNewDraft, idx, { display_name: e.target.value })}
                      placeholder="Название уровня"
                      className="flex-1 h-[30px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                    />
                    <select
                      value={level.assignee_type}
                      onChange={(e) => patchLevel(newDraft, setNewDraft, idx, { assignee_type: e.target.value, assignee_id: "" })}
                      className="h-[30px] px-[8px] bg-white rounded-btn text-[13px] text-primary outline-none cursor-pointer"
                    >
                      <option value="">— тип —</option>
                      <option value="user">Пользователь</option>
                      <option value="group">Группа</option>
                      <option value="role">Роль</option>
                    </select>
                    {level.assignee_type && (
                      <input
                        value={level.assignee_id}
                        onChange={(e) => patchLevel(newDraft, setNewDraft, idx, { assignee_id: e.target.value })}
                        placeholder={level.assignee_type === "role" ? "Роль" : "UUID"}
                        className="w-[140px] h-[30px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-transparent focus:border-cta/40"
                      />
                    )}
                    {newDraft.levels.length > 1 && (
                      <button onClick={() => removeLevel(newDraft, setNewDraft, idx)} className="w-6 h-6 flex items-center justify-center text-primary/40 hover:text-red-400 transition-colors">
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addLevel(newDraft, setNewDraft)}
                  className="self-start flex items-center gap-[6px] h-[28px] px-[10px] bg-cta/10 rounded-btn text-cta text-[12px] hover:bg-cta/20 transition-colors"
                >
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Добавить уровень
                </button>
              </div>
              <div className="flex justify-end gap-[8px]">
                <button onClick={() => { setCreating(false); setNewDraft(emptyChainDraft()); }} className="h-[32px] px-[14px] bg-cardbg border border-primary/20 text-primary text-[13px] rounded-btn hover:bg-primary/10 transition-colors">
                  Отмена
                </button>
                <button
                  onClick={saveNew}
                  disabled={!newDraft.name.trim()}
                  className="h-[32px] px-[14px] bg-cta text-white text-[13px] rounded-btn hover:bg-cta/90 transition-colors disabled:opacity-50"
                >
                  Создать
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="self-start mx-[40px] flex items-center gap-[6px] h-[32px] px-[14px] bg-cta/10 rounded-btn text-cta text-[13px] hover:bg-cta/20 transition-colors"
            >
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Добавить цепочку
            </button>
          )}
        </div>
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
