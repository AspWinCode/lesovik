import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  useWorkflows,
  useWorkflowInstances,
  useStartInstance,
  useAvailableTransitions,
  useExecuteTransition,
  useCancelInstance,
  useChainInstances,
  useDecideChainLevel,
  useTransitionLog,
} from "@/shared/hooks/useWorkflows";
import type { TransitionLogRead } from "@/shared/api/workflows";

interface Props {
  appId: string;
  entityId: string;
  recordId: string;
  isAdmin?: boolean;
}

export function WorkflowStatusPanel({ appId, entityId, recordId, isAdmin = false }: Props) {
  const workflowsQuery = useWorkflows(appId, entityId);
  const workflows = workflowsQuery.data ?? [];

  if (workflows.length === 0) return null;

  return (
    <div className="flex flex-col gap-[10px]">
      {workflows
        .filter((wf) => wf.is_active)
        .map((wf) => (
          <WorkflowPanel
            key={wf.id}
            appId={appId}
            workflowId={wf.id}
            workflowName={wf.name}
            recordId={recordId}
            isAdmin={isAdmin}
          />
        ))}
    </div>
  );
}

function WorkflowPanel({
  appId,
  workflowId,
  workflowName,
  recordId,
  isAdmin,
}: {
  appId: string;
  workflowId: string;
  workflowName: string;
  recordId: string;
  isAdmin: boolean;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [decisionComment, setDecisionComment] = useState("");

  const instancesQuery = useWorkflowInstances(appId, workflowId, recordId);
  const instances = instancesQuery.data ?? [];
  const activeInstance = instances.find(
    (i) => i.current_state !== "__cancelled__" && !i.completed_at,
  ) ?? instances[0];

  const startMutation = useStartInstance(appId, workflowId);
  const cancelMutation = useCancelInstance(appId, workflowId);

  const availableQuery = useAvailableTransitions(
    appId,
    workflowId,
    activeInstance?.id,
  );
  const available = availableQuery.data ?? [];

  const executeMutation = useExecuteTransition(
    appId,
    workflowId,
    activeInstance?.id ?? "",
  );

  const chainInstancesQuery = useChainInstances(
    appId,
    workflowId,
    activeInstance?.id,
  );
  const chainInstances = chainInstancesQuery.data ?? [];
  const pendingChain = chainInstances.find((c) => c.status === "pending");

  const decideMutation = useDecideChainLevel(
    appId,
    workflowId,
    activeInstance?.id ?? "",
  );

  const logQuery = useTransitionLog(
    logOpen ? appId : undefined,
    logOpen ? workflowId : undefined,
    logOpen ? activeInstance?.id : undefined,
  );

  const isRunning =
    activeInstance && !activeInstance.completed_at && activeInstance.current_state !== "__cancelled__";
  const isCancelled = activeInstance?.current_state === "__cancelled__";
  const isCompleted = !!activeInstance?.completed_at && !isCancelled;

  return (
    <div className="bg-white border border-primary/10 rounded-[12px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-primary/8 bg-mainbg/50">
        <div className="flex items-center gap-[8px]">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-cta">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[14px] font-semibold text-primary">{workflowName}</span>
          {activeInstance && <StateChip state={activeInstance.current_state} />}
        </div>

        {isRunning && isAdmin && !showCancelForm && (
          <button
            onClick={() => setShowCancelForm(true)}
            className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
          >
            Отменить процесс
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-[16px] py-[12px] flex flex-col gap-[12px]">
        {/* No instance yet */}
        {!activeInstance && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-primary/50">Процесс не запущен</span>
            <button
              onClick={() =>
                startMutation.mutate({ record_id: recordId, record_payload: {} })
              }
              disabled={startMutation.isPending}
              className="h-[32px] px-[14px] bg-cta text-white text-[13px] rounded-btn hover:bg-cta/90 transition-colors disabled:opacity-60"
            >
              Запустить
            </button>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <div className="flex items-center gap-[8px]">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[13px] text-green-700 font-medium">Процесс завершён</span>
            <span className="text-[11px] text-primary/40">
              {activeInstance?.completed_at ? new Date(activeInstance.completed_at).toLocaleString("ru") : ""}
            </span>
          </div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <div className="flex items-center gap-[8px]">
            <span className="text-[13px] text-red-500 font-medium">Процесс отменён</span>
          </div>
        )}

        {/* Cancel form */}
        {showCancelForm && (
          <div className="flex flex-col gap-[8px] p-[12px] bg-red-50 rounded-[8px]">
            <span className="text-[13px] font-medium text-red-700">Отменить процесс?</span>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Причина отмены (опционально)"
              className="h-[32px] px-[10px] bg-white rounded-btn text-[13px] text-primary outline-none border border-red-200 focus:border-red-400"
            />
            <div className="flex gap-[8px] justify-end">
              <button
                onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                className="h-[28px] px-[12px] bg-white border border-primary/20 text-primary text-[12px] rounded-btn hover:bg-primary/5 transition-colors"
              >
                Нет
              </button>
              <button
                onClick={() => {
                  if (!activeInstance) return;
                  cancelMutation.mutate(
                    { instanceId: activeInstance.id, reason: cancelReason || undefined },
                    { onSuccess: () => { setShowCancelForm(false); setCancelReason(""); } }
                  );
                }}
                disabled={cancelMutation.isPending}
                className="h-[28px] px-[12px] bg-red-500 text-white text-[12px] rounded-btn hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                Да, отменить
              </button>
            </div>
          </div>
        )}

        {/* Pending approval chain */}
        {isRunning && pendingChain && (
          <div className="flex flex-col gap-[10px]">
            <ApprovalChainProgress
              chainInstance={pendingChain}
              onDecide={(chainInstanceId, decision) =>
                decideMutation.mutate({
                  chainInstanceId,
                  body: { decision, comment: decisionComment || null },
                })
              }
              comment={decisionComment}
              onCommentChange={setDecisionComment}
              isPending={decideMutation.isPending}
            />
          </div>
        )}

        {/* Available transitions (non-approval) */}
        {isRunning && available.length > 0 && (
          <div className="flex items-center gap-[8px] flex-wrap">
            {available.map((tr) => {
              const isApprove = tr.name.toLowerCase().includes("approv") || tr.name.toLowerCase().includes("одоб");
              const isReject = tr.name.toLowerCase().includes("reject") || tr.name.toLowerCase().includes("отклон");
              return (
                <button
                  key={tr.name}
                  onClick={() =>
                    executeMutation.mutate({ transition_name: tr.name, record_payload: {} })
                  }
                  disabled={executeMutation.isPending}
                  className={cn(
                    "h-[34px] px-[14px] rounded-btn text-[13px] font-medium transition-colors disabled:opacity-60",
                    isApprove
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : isReject
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-cta text-white hover:bg-cta/90"
                  )}
                >
                  {tr.display_name}
                </button>
              );
            })}
          </div>
        )}

        {/* SLA deadline */}
        {isRunning && activeInstance?.sla_deadline && (
          <SlaIndicator deadline={activeInstance.sla_deadline} />
        )}

        {/* Transition log toggle */}
        {activeInstance && (
          <button
            onClick={() => setLogOpen((v) => !v)}
            className="flex items-center gap-[6px] text-[12px] text-primary/50 hover:text-primary/80 transition-colors self-start"
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              className={cn("w-3 h-3 transition-transform", logOpen && "rotate-180")}
            >
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            История
          </button>
        )}

        {logOpen && (
          <TransitionLogList log={logQuery.data ?? []} />
        )}
      </div>
    </div>
  );
}

/* ── Approval chain progress ── */

function ApprovalChainProgress({
  chainInstance,
  onDecide,
  comment,
  onCommentChange,
  isPending,
}: {
  chainInstance: { id: string; current_level: number; responses: { level_order: number; decision: string; actor_id: string | null; decided_at: string }[] };
  onDecide: (id: string, decision: "approved" | "rejected") => void;
  comment: string;
  onCommentChange: (v: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-[8px] p-[12px] bg-blue-50 rounded-[8px]">
      <div className="flex items-center gap-[6px]">
        <span className="text-[12px] font-semibold text-blue-700">Согласование — уровень {chainInstance.current_level}</span>
      </div>

      {/* Previous responses */}
      {chainInstance.responses.map((r) => (
        <div key={r.level_order} className="flex items-center gap-[6px] text-[12px]">
          <span
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
              r.decision === "approved" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
            )}
          >
            {r.level_order}
          </span>
          <span className={r.decision === "approved" ? "text-green-600" : "text-red-500"}>
            {r.decision === "approved" ? "Одобрено" : "Отклонено"}
          </span>
          <span className="text-primary/40">
            {new Date(r.decided_at).toLocaleString("ru")}
          </span>
        </div>
      ))}

      <input
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Комментарий (опционально)"
        className="h-[30px] px-[10px] bg-white rounded-btn text-[12px] text-primary outline-none border border-blue-200 focus:border-blue-400"
      />

      <div className="flex gap-[8px]">
        <button
          onClick={() => onDecide(chainInstance.id, "approved")}
          disabled={isPending}
          className="flex-1 h-[32px] bg-green-500 text-white text-[13px] rounded-btn hover:bg-green-600 transition-colors disabled:opacity-60 font-medium"
        >
          Одобрить
        </button>
        <button
          onClick={() => onDecide(chainInstance.id, "rejected")}
          disabled={isPending}
          className="flex-1 h-[32px] bg-red-100 text-red-600 text-[13px] rounded-btn hover:bg-red-200 transition-colors disabled:opacity-60 font-medium"
        >
          Отклонить
        </button>
      </div>
    </div>
  );
}

/* ── State chip ── */

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  __cancelled__: { bg: "#fee2e2", text: "#dc2626" },
};

function StateChip({ state }: { state: string }) {
  const colors = STATE_COLORS[state] ?? { bg: "#e0f2fe", text: "#0369a1" };
  return (
    <span
      className="h-[20px] px-[8px] flex items-center rounded-[10px] text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {state === "__cancelled__" ? "Отменён" : state}
    </span>
  );
}

/* ── SLA indicator ── */

function SlaIndicator({ deadline }: { deadline: string }) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const diffH = Math.abs(Math.round(diffMs / 3600000));

  return (
    <div className={cn(
      "flex items-center gap-[6px] text-[12px]",
      overdue ? "text-red-500" : "text-amber-600"
    )}>
      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 3v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {overdue
        ? `SLA просрочен на ${diffH} ч`
        : `SLA: осталось ${diffH} ч`
      }
    </div>
  );
}

/* ── Transition log ── */

function TransitionLogList({ log }: { log: TransitionLogRead[] }) {
  if (log.length === 0) return <p className="text-[12px] text-primary/40">История пуста</p>;

  return (
    <div className="flex flex-col gap-[4px]">
      {log.map((entry) => (
        <div key={entry.id} className="flex items-center gap-[8px] text-[12px] text-primary/60">
          <span className="text-[10px] tabular-nums shrink-0">
            {new Date(entry.executed_at).toLocaleString("ru", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          {entry.from_state ? (
            <>
              <span className="text-primary/40">{entry.from_state}</span>
              <svg viewBox="0 0 8 6" fill="none" className="w-2 h-1.5 shrink-0">
                <path d="M0 3h6M4 1l2 2-2 2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          ) : (
            <span className="text-cta/60 shrink-0">Запуск</span>
          )}
          <span className="font-medium text-primary/80">{entry.to_state}</span>
          {entry.error && (
            <span className="text-red-400 truncate ml-auto">{entry.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}
