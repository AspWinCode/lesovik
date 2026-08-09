import { useState, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useEntities } from "@/shared/hooks/useEntities";
import {
  useRecords,
  useTrashRecords,
  useCreateRecord,
  useDeleteRecord,
  useRestoreRecord,
  useHardDeleteRecord,
  useExportRecords,
} from "@/shared/hooks/useRecords";
import {
  useWorkflows,
  useWorkflowInstances,
  useWorkflowStates,
  useStartInstance,
  useCancelInstance,
  useAvailableTransitions,
  useExecuteTransition,
  useTransitionLog,
  useChainInstances,
  useDecideChainLevel,
  useAssignInstance,
} from "@/shared/hooks/useWorkflows";
import { useUsers } from "@/shared/hooks/useUsers";
import { previewImport, importRecords } from "@/shared/api/records";
import type { EntityRead, FieldRead } from "@/shared/api/entities";
import type { RecordRead, ImportPreview } from "@/shared/api/records";
import type {
  WorkflowDefRead,
  WorkflowInstanceRead,
  StateDefRead,
} from "@/shared/api/workflows";

// ── helpers ──────────────────────────────────────────────────────────

function visibleFields(entity: EntityRead): FieldRead[] {
  return entity.fields
    .filter((f) => !f.is_system && f.field_type !== "formula")
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 5);
}

function formatCellValue(value: unknown, field: FieldRead): string {
  if (value === null || value === undefined) return "—";
  if (field.field_type === "boolean") return value ? "Да" : "Нет";
  if (field.field_type === "datetime" || field.field_type === "date") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ru");
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// ── main page ─────────────────────────────────────────────────────────

export function DataPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [trashView, setTrashView] = useState(false);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<RecordRead | null>(null);
  const ROWS_PER_PAGE = 10;

  const appsQuery = useApps();
  const appId = appsQuery.data?.items[0]?.id;
  const entitiesQuery = useEntities(appId);
  const entities = entitiesQuery.data ?? [];
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) ?? null;

  const recordsQuery = useRecords(appId, selectedEntityId ?? undefined);
  const trashQuery = useTrashRecords(appId, selectedEntityId ?? undefined);

  const allRecords = trashView
    ? (trashQuery.data?.items ?? [])
    : (recordsQuery.data?.items ?? []);

  const filtered = allRecords.filter((r) =>
    !search || JSON.stringify(r.payload).toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const deleteMutation = useDeleteRecord(appId ?? "", selectedEntityId ?? "");
  const restoreMutation = useRestoreRecord(appId ?? "", selectedEntityId ?? "");
  const hardDeleteMutation = useHardDeleteRecord(appId ?? "", selectedEntityId ?? "");
  const exportMutation = useExportRecords(appId ?? "", selectedEntityId ?? "");

  const cols = selectedEntity ? visibleFields(selectedEntity) : [];

  function handleEntitySelect(id: string) {
    setSelectedEntityId(id);
    setTrashView(false);
    setSearch("");
    setPage(1);
    setSelectedRecord(null);
  }

  function handleTrashToggle(entityId: string) {
    setSelectedEntityId(entityId);
    setTrashView(true);
    setSearch("");
    setPage(1);
    setSelectedRecord(null);
  }

  const isLoading =
    (trashView ? trashQuery.isFetching : recordsQuery.isFetching) ||
    appsQuery.isLoading ||
    entitiesQuery.isLoading;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail
        active={railModule}
        onChange={setRailModule}
        onCollapse={() => setNavCollapsed((v) => !v)}
        collapsed={navCollapsed}
      />

      {/* ── Sidebar ── */}
      {!navCollapsed && (
        <aside
          className="absolute bg-white border-r border-cardbg overflow-y-auto flex flex-col"
          style={{ left: 85, top: 70, width: 295, height: 1010 }}
        >
          <div className="px-5 py-4 border-b border-cardbg">
            <span className="text-[18px] font-semibold text-primary">Данные</span>
          </div>

          <nav className="flex-1 py-2">
            {entitiesQuery.isLoading && (
              <div className="px-5 py-3 text-[13px] text-primary/40">Загрузка…</div>
            )}
            {entities.map((entity) => (
              <div key={entity.id}>
                <button
                  onClick={() => handleEntitySelect(entity.id)}
                  className={cn(
                    "w-full flex items-center gap-[8px] text-left text-[14px] px-5 py-2.5 transition-colors",
                    selectedEntityId === entity.id && !trashView
                      ? "bg-[#EBF4FF] text-cta font-medium"
                      : "text-primary hover:bg-mainbg",
                  )}
                >
                  {entity.icon ? (
                    <span className="text-[15px] leading-none">{entity.icon}</span>
                  ) : (
                    <TableIcon className="w-4 h-4 shrink-0 text-primary/40" />
                  )}
                  <span className="flex-1 truncate">{entity.display_name}</span>
                  <span className="text-[11px] text-primary/30">
                    {recordsQuery.data?.total ?? ""}
                  </span>
                </button>
                {selectedEntityId === entity.id && (
                  <button
                    onClick={() => handleTrashToggle(entity.id)}
                    className={cn(
                      "w-full flex items-center gap-[8px] text-left text-[13px] pl-[44px] pr-5 py-2 transition-colors",
                      trashView
                        ? "text-red-500 font-medium bg-red-50"
                        : "text-primary/50 hover:bg-mainbg",
                    )}
                  >
                    <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                    Корзина
                    {(trashQuery.data?.items.length ?? 0) > 0 && (
                      <span className="ml-auto text-[11px] text-red-400">
                        {trashQuery.data?.items.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* ── Main ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto flex flex-col"
        style={{
          left: navCollapsed ? 90 : 380,
          top: 70,
          width: navCollapsed ? 1545 : 1255,
          height: 1010,
          transition: "left 0.2s, width 0.2s",
        }}
      >
        {!selectedEntity ? (
          <EmptyState loading={appsQuery.isLoading || entitiesQuery.isLoading} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-8 py-4 bg-white border-b border-cardbg shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-[10px]">
                  {selectedEntity.icon && (
                    <span className="text-[20px] leading-none">{selectedEntity.icon}</span>
                  )}
                  <h1 className="text-[22px] font-bold text-primary">
                    {trashView ? `Корзина — ${selectedEntity.display_name}` : selectedEntity.display_name}
                  </h1>
                  {trashView && (
                    <span className="h-[22px] px-[8px] flex items-center rounded-[11px] bg-red-100 text-red-600 text-[12px] font-medium">
                      {trashQuery.data?.items.length ?? 0} записей
                    </span>
                  )}
                </div>

                {!trashView && (
                  <div className="flex items-center gap-[8px]">
                    {/* Export dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setExportOpen((v) => !v)}
                        disabled={exportMutation.isPending}
                        className="flex items-center gap-[6px] px-[14px] h-[36px] text-[14px] text-primary rounded-btn border border-cardbg bg-white hover:border-cta hover:text-cta transition-colors disabled:opacity-60"
                      >
                        <ExportIcon className="w-4 h-4" />
                        Экспорт
                        <ChevronIcon className="w-3 h-3" />
                      </button>
                      {exportOpen && (
                        <div className="absolute right-0 top-[40px] bg-white border border-cardbg rounded-[8px] shadow-lg z-20 min-w-[140px] py-1">
                          {(["xlsx", "csv", "pdf"] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => {
                                setExportOpen(false);
                                exportMutation.mutate(fmt);
                              }}
                              className="w-full flex items-center gap-[8px] px-[14px] py-[8px] text-[13px] text-primary hover:bg-mainbg transition-colors"
                            >
                              <FileIcon fmt={fmt} />
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import */}
                    <button
                      onClick={() => setShowImport(true)}
                      className="flex items-center gap-[6px] px-[14px] h-[36px] text-[14px] text-primary rounded-btn border border-cardbg bg-white hover:border-cta hover:text-cta transition-colors"
                    >
                      <ImportIcon className="w-4 h-4" />
                      Импорт
                    </button>

                    {/* Add record */}
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-[6px] px-[14px] h-[36px] bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active transition-colors"
                    >
                      <span className="text-[16px] leading-none">+</span>
                      Добавить
                    </button>
                  </div>
                )}

                {trashView && (
                  <button
                    onClick={() => { setTrashView(false); }}
                    className="flex items-center gap-[6px] px-[14px] h-[36px] text-[14px] text-primary rounded-btn border border-cardbg bg-white hover:border-cta hover:text-cta transition-colors"
                  >
                    ← Назад
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="flex items-center gap-[10px]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Поиск…"
                    className="pl-9 pr-3 py-2 text-[14px] rounded-btn border border-cardbg bg-mainbg text-primary placeholder:text-primary/40 focus:outline-none focus:border-cta w-[260px]"
                  />
                </div>
                {isLoading && (
                  <span className="text-[12px] text-primary/40">Загрузка…</span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 px-8 py-5 overflow-auto">
              <div className="bg-white rounded-[8px] border border-cardbg overflow-hidden">
                {/* Header */}
                <div
                  className="grid border-b border-cardbg bg-[#F5F6F8]"
                  style={{ gridTemplateColumns: `40px ${cols.map(() => "1fr").join(" ")} 140px 50px` }}
                >
                  <div className="px-3 py-2.5 text-[12px] font-semibold text-primary/50 border-r border-cardbg">#</div>
                  {cols.map((f) => (
                    <div
                      key={f.id}
                      className="px-4 py-2.5 text-[12px] font-semibold text-primary border-r border-cardbg truncate"
                    >
                      {f.display_name}
                    </div>
                  ))}
                  <div className="px-4 py-2.5 text-[12px] font-semibold text-primary/50 border-r border-cardbg">
                    Создана
                  </div>
                  <div className="px-2 py-2.5" />
                </div>

                {pageRows.length === 0 && !isLoading && (
                  <div className="py-12 text-center text-[14px] text-primary/40">
                    {trashView ? "Корзина пуста" : "Нет записей"}
                  </div>
                )}

                {pageRows.map((row, idx) => (
                  <RecordRow
                    key={row.id}
                    row={row}
                    idx={(page - 1) * ROWS_PER_PAGE + idx + 1}
                    cols={cols}
                    trashView={trashView}
                    isSelected={selectedRecord?.id === row.id}
                    onRowClick={() => setSelectedRecord((prev) => prev?.id === row.id ? null : row)}
                    onSoftDelete={() => deleteMutation.mutate(row.id)}
                    onRestore={() => restoreMutation.mutate(row.id)}
                    onHardDelete={() => {
                      if (confirm("Удалить запись безвозвратно?")) {
                        hardDeleteMutation.mutate(row.id);
                      }
                    }}
                    isPending={
                      deleteMutation.isPending ||
                      restoreMutation.isPending ||
                      hardDeleteMutation.isPending
                    }
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[13px] text-primary/50">
                  {filtered.length > 0
                    ? `Показано ${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, filtered.length)} из ${filtered.length}`
                    : "Нет записей"}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-[6px]">
                    <PaginationBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PaginationBtn>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                      <PaginationBtn key={n} onClick={() => setPage(n)} active={page === n}>{n}</PaginationBtn>
                    ))}
                    <PaginationBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PaginationBtn>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Record detail drawer ── */}
      {selectedRecord && selectedEntity && appId && (
        <RecordDetailDrawer
          record={selectedRecord}
          entity={selectedEntity}
          appId={appId}
          navCollapsed={navCollapsed}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* ── Modals ── */}
      {showCreate && selectedEntity && appId && (
        <CreateRecordModal
          entity={selectedEntity}
          appId={appId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showImport && selectedEntity && appId && (
        <ImportModal
          entity={selectedEntity}
          appId={appId}
          onClose={() => setShowImport(false)}
        />
      )}

      {exportOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setExportOpen(false)}
        />
      )}

      <PreviewPanel />
    </div>
  );
}

// ── RecordRow ─────────────────────────────────────────────────────────

function RecordRow({
  row,
  idx,
  cols,
  trashView,
  isSelected,
  onRowClick,
  onSoftDelete,
  onRestore,
  onHardDelete,
  isPending,
}: {
  row: RecordRead;
  idx: number;
  cols: FieldRead[];
  trashView: boolean;
  isSelected: boolean;
  onRowClick: () => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
  isPending: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onRowClick}
      className={cn(
        "grid border-b border-cardbg last:border-b-0 hover:bg-mainbg/50 transition-colors relative cursor-pointer",
        isSelected && "bg-[#EBF4FF]",
      )}
      style={{ gridTemplateColumns: `40px ${cols.map(() => "1fr").join(" ")} 140px 50px` }}
    >
      <div className="px-3 py-2.5 text-[12px] text-primary/30 border-r border-cardbg tabular-nums">{idx}</div>

      {cols.map((f) => (
        <div key={f.id} className="px-4 py-2.5 text-[13px] text-primary border-r border-cardbg truncate">
          {formatCellValue(row.payload[f.name], f)}
        </div>
      ))}

      <div className="px-4 py-2.5 text-[12px] text-primary/40 border-r border-cardbg">
        {new Date(row.created_at).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "2-digit" })}
      </div>

      <div className="px-2 py-2.5 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded text-primary/30 hover:text-primary hover:bg-cardbg transition-colors"
        >
          <DotsIcon className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-[8px] top-[32px] bg-white border border-cardbg rounded-[8px] shadow-lg z-20 py-1 min-w-[160px]">
              {trashView ? (
                <>
                  <button
                    onClick={() => { setMenuOpen(false); onRestore(); }}
                    disabled={isPending}
                    className="w-full flex items-center gap-[8px] px-[14px] py-[8px] text-[13px] text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <RestoreIcon className="w-4 h-4" />
                    Восстановить
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onHardDelete(); }}
                    disabled={isPending}
                    className="w-full flex items-center gap-[8px] px-[14px] py-[8px] text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Удалить навсегда
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); onSoftDelete(); }}
                  disabled={isPending}
                  className="w-full flex items-center gap-[8px] px-[14px] py-[8px] text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  В корзину
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── RecordDetailDrawer ────────────────────────────────────────────────

function RecordDetailDrawer({
  record,
  entity,
  appId,
  navCollapsed,
  onClose,
}: {
  record: RecordRead;
  entity: EntityRead;
  appId: string;
  navCollapsed: boolean;
  onClose: () => void;
}) {
  const fields = entity.fields
    .filter((f) => !f.is_system && f.field_type !== "formula")
    .sort((a, b) => a.display_order - b.display_order);

  const workflowsQuery = useWorkflows(appId, entity.id);
  const workflows = workflowsQuery.data ?? [];

  const leftOffset = navCollapsed ? 90 : 380;
  const drawerWidth = 460;

  return (
    <div
      className="absolute z-30"
      style={{ left: leftOffset, top: 70, width: `calc(100% - ${leftOffset}px)`, height: 1010 }}
    >
      {/* backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* panel */}
      <div
        className="absolute top-0 right-0 h-full bg-white border-l border-cardbg flex flex-col shadow-2xl"
        style={{ width: drawerWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cardbg shrink-0">
          <div className="flex items-center gap-[8px]">
            <span className="text-[15px] font-semibold text-primary">Запись</span>
            <span className="text-[12px] text-primary/40 font-mono">{record.id.slice(0, 8)}…</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-primary/40 hover:bg-mainbg hover:text-primary transition-colors text-[18px]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Field values */}
          <div className="px-5 py-4 border-b border-cardbg">
            <p className="text-[11px] font-semibold text-primary/40 uppercase tracking-wider mb-3">Поля</p>
            <div className="flex flex-col gap-[6px]">
              {fields.map((f) => {
                const val = formatCellValue(record.payload[f.name], f);
                return (
                  <div key={f.id} className="flex items-start gap-[8px] text-[13px]">
                    <span className="shrink-0 w-[140px] text-primary/50 truncate">{f.display_name}</span>
                    <span className="text-primary truncate flex-1">{val}</span>
                  </div>
                );
              })}
              <div className="flex items-start gap-[8px] text-[13px]">
                <span className="shrink-0 w-[140px] text-primary/50">Создана</span>
                <span className="text-primary/70">
                  {new Date(record.created_at).toLocaleString("ru")}
                </span>
              </div>
            </div>
          </div>

          {/* Workflows */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-primary/40 uppercase tracking-wider mb-3">
              Рабочие процессы {workflows.length > 0 && `(${workflows.length})`}
            </p>
            {workflowsQuery.isLoading && (
              <p className="text-[13px] text-primary/40">Загрузка…</p>
            )}
            {!workflowsQuery.isLoading && workflows.length === 0 && (
              <p className="text-[13px] text-primary/40">Нет рабочих процессов для этой сущности</p>
            )}
            {workflows.map((wf) => (
              <WorkflowRuntimeSection
                key={wf.id}
                appId={appId}
                workflow={wf}
                recordId={record.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WorkflowRuntimeSection ────────────────────────────────────────────

function WorkflowRuntimeSection({
  appId,
  workflow,
  recordId,
}: {
  appId: string;
  workflow: WorkflowDefRead;
  recordId: string;
}) {
  const instancesQuery = useWorkflowInstances(appId, workflow.id, recordId);
  const statesQuery = useWorkflowStates(appId, workflow.id);
  const startMutation = useStartInstance(appId, workflow.id);
  const cancelMutation = useCancelInstance(appId, workflow.id);

  const instances = instancesQuery.data ?? [];
  const states = statesQuery.data ?? [];
  const activeInstance = instances.find((i) => !i.completed_at) ?? null;
  const pastInstances = instances.filter((i) => i.completed_at);

  return (
    <div className="mb-4 border border-cardbg rounded-[8px] overflow-hidden">
      {/* workflow header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#F5F6F8]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-semibold text-primary truncate">{workflow.name}</span>
          {!workflow.is_active && (
            <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-amber-100 text-amber-700">
              Неактивен
            </span>
          )}
        </div>
        {!activeInstance && workflow.is_active && (
          <button
            onClick={() => startMutation.mutate({ record_id: recordId })}
            disabled={startMutation.isPending}
            className="text-[12px] px-[10px] h-[26px] rounded-[6px] bg-cta text-white hover:bg-active disabled:opacity-60 transition-colors"
          >
            {startMutation.isPending ? "…" : "Запустить"}
          </button>
        )}
      </div>

      {/* active instance */}
      {activeInstance && (
        <InstancePanel
          appId={appId}
          workflowId={workflow.id}
          instance={activeInstance}
          states={states}
          onCancel={(reason) => cancelMutation.mutate({ instanceId: activeInstance.id, reason })}
          cancelPending={cancelMutation.isPending}
        />
      )}

      {/* no instance message */}
      {!activeInstance && instances.length === 0 && !instancesQuery.isLoading && (
        <div className="px-3 py-3 text-[12px] text-primary/40">
          {workflow.is_active ? "Нет активных экземпляров. Нажмите «Запустить»." : "Рабочий процесс неактивен."}
        </div>
      )}

      {/* past instances summary */}
      {pastInstances.length > 0 && (
        <div className="px-3 py-2 border-t border-cardbg">
          <p className="text-[11px] text-primary/40">
            Завершённых экземпляров: {pastInstances.length}
          </p>
        </div>
      )}
    </div>
  );
}

// ── InstancePanel ─────────────────────────────────────────────────────

function InstancePanel({
  appId,
  workflowId,
  instance,
  states,
  onCancel,
  cancelPending,
}: {
  appId: string;
  workflowId: string;
  instance: WorkflowInstanceRead;
  states: StateDefRead[];
  onCancel: (reason?: string) => void;
  cancelPending: boolean;
}) {
  const [showLog, setShowLog] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const availableQuery = useAvailableTransitions(appId, workflowId, instance.id);
  const logQuery = useTransitionLog(appId, workflowId, instance.id);
  const executeMutation = useExecuteTransition(appId, workflowId, instance.id);
  const chainInstancesQuery = useChainInstances(appId, workflowId, instance.id);
  const decideMutation = useDecideChainLevel(appId, workflowId, instance.id);
  const assignMutation = useAssignInstance(appId, workflowId);
  const usersQuery = useUsers();
  const pendingChains = (chainInstancesQuery.data ?? []).filter((c) => c.status === "pending");
  const users = usersQuery.data?.items ?? [];

  const currentState = states.find((s) => s.name === instance.current_state);
  const available = availableQuery.data ?? [];

  const stateColor = currentState?.color ?? null;
  const stateDisplayName = currentState?.display_name ?? instance.current_state;

  return (
    <div className="px-3 py-3 flex flex-col gap-[10px]">
      {/* current state */}
      <div className="flex items-center gap-[8px]">
        <span className="text-[12px] text-primary/50">Состояние:</span>
        <span
          className="text-[12px] font-semibold px-[8px] py-[2px] rounded-full"
          style={
            stateColor
              ? { backgroundColor: stateColor + "22", color: stateColor }
              : undefined
          }
        >
          {stateDisplayName}
        </span>
        {currentState?.is_terminal && (
          <span className="text-[10px] text-primary/40">(завершающее)</span>
        )}
      </div>

      {/* SLA */}
      {instance.sla_deadline && (
        <div className="flex items-center gap-[8px] text-[12px]">
          <span className="text-primary/50">SLA до:</span>
          <span className={cn(
            "font-medium",
            new Date(instance.sla_deadline) < new Date() ? "text-red-500" : "text-primary/70",
          )}>
            {new Date(instance.sla_deadline).toLocaleString("ru")}
          </span>
        </div>
      )}

      {/* Assign responsible */}
      <div className="flex items-center gap-[8px]">
        {instance.assigned_user_id ? (
          <>
            <span className="text-[12px] text-primary/50">Ответственный:</span>
            <span className="text-[12px] text-primary font-medium">
              {users.find((u) => u.id === instance.assigned_user_id)?.display_name ?? instance.assigned_user_id.slice(0, 8)}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-primary/40">Не назначен</span>
        )}
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="text-[11px] text-cta hover:underline ml-auto"
        >
          {showAssign ? "Закрыть" : "Назначить"}
        </button>
      </div>
      {showAssign && (
        <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto border border-cardbg rounded-[6px] py-1">
          <button
            onClick={() => { assignMutation.mutate({ instanceId: instance.id, body: { assigned_user_id: null } }); setShowAssign(false); }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-primary/50 hover:bg-mainbg transition-colors"
          >
            — Снять назначение
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => { assignMutation.mutate({ instanceId: instance.id, body: { assigned_user_id: u.id } }); setShowAssign(false); }}
              disabled={assignMutation.isPending}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] hover:bg-mainbg transition-colors",
                instance.assigned_user_id === u.id ? "text-cta font-medium" : "text-primary",
              )}
            >
              {u.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Available transitions */}
      {availableQuery.isLoading && (
        <p className="text-[12px] text-primary/40">Загрузка переходов…</p>
      )}
      {available.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <p className="text-[11px] text-primary/50 font-medium">Выполнить переход:</p>
          <div className="flex flex-wrap gap-[6px]">
            {available.map((t) => (
              <button
                key={t.name}
                onClick={() => executeMutation.mutate({ transition_name: t.name })}
                disabled={executeMutation.isPending}
                className="text-[12px] px-[10px] h-[28px] rounded-[6px] bg-mainbg border border-cardbg text-primary hover:border-cta hover:text-cta disabled:opacity-60 transition-colors"
              >
                {t.display_name}
                <span className="ml-1 text-[10px] text-primary/30">→ {t.to_state}</span>
              </button>
            ))}
          </div>
          {executeMutation.isError && (
            <p className="text-[11px] text-red-500">Ошибка выполнения перехода</p>
          )}
        </div>
      )}
      {!availableQuery.isLoading && available.length === 0 && !currentState?.is_terminal && (
        <p className="text-[12px] text-primary/40">Нет доступных переходов</p>
      )}

      {/* Approval chains */}
      {pendingChains.length > 0 && (
        <div className="flex flex-col gap-[6px] p-[10px] rounded-[8px] bg-amber-50 border border-amber-200">
          <p className="text-[11px] font-semibold text-amber-700">Ожидает утверждения</p>
          {pendingChains.map((chain) => (
            <div key={chain.id} className="flex flex-col gap-[4px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-primary/70">
                  Уровень {chain.current_level}
                </span>
                <div className="flex gap-[6px]">
                  <button
                    onClick={() => decideMutation.mutate({ chainInstanceId: chain.id, body: { decision: "approved" } })}
                    disabled={decideMutation.isPending}
                    className="text-[11px] px-[8px] h-[24px] rounded-[5px] bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors font-medium"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => decideMutation.mutate({ chainInstanceId: chain.id, body: { decision: "rejected" } })}
                    disabled={decideMutation.isPending}
                    className="text-[11px] px-[8px] h-[24px] rounded-[5px] bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors font-medium"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
              {chain.responses.length > 0 && (
                <div className="flex flex-col gap-[2px] mt-1">
                  {chain.responses.map((r) => (
                    <div key={r.id} className="flex items-center gap-[6px] text-[11px]">
                      <span className={cn(
                        "px-[5px] rounded-[4px] font-medium",
                        r.decision === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                      )}>
                        {r.decision === "approved" ? "Одобрено" : "Отклонено"}
                      </span>
                      <span className="text-primary/40">ур.{r.level_order}</span>
                      {r.comment && <span className="text-primary/60 truncate">{r.comment}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transition log toggle */}
      <div>
        <button
          onClick={() => setShowLog((v) => !v)}
          className="text-[12px] text-cta hover:underline"
        >
          {showLog ? "Скрыть лог" : "Показать лог переходов"}
          {logQuery.data && ` (${logQuery.data.length})`}
        </button>

        {showLog && (
          <div className="mt-2 flex flex-col gap-[4px] max-h-[200px] overflow-y-auto">
            {logQuery.isLoading && <p className="text-[12px] text-primary/40">Загрузка…</p>}
            {(logQuery.data ?? []).length === 0 && !logQuery.isLoading && (
              <p className="text-[12px] text-primary/40">Лог пуст</p>
            )}
            {(logQuery.data ?? []).map((entry) => (
              <div key={entry.id} className="flex items-start gap-[8px] text-[11px]">
                <span className="text-primary/30 shrink-0 tabular-nums">
                  {new Date(entry.executed_at).toLocaleString("ru")}
                </span>
                <span className="text-primary/60">
                  {entry.from_state ? `${entry.from_state} →` : "→"} {entry.to_state}
                </span>
                {entry.error && <span className="text-red-400">{entry.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel */}
      {!currentState?.is_terminal && (
        <div className="pt-1 border-t border-cardbg">
          <button
            onClick={() => {
              if (confirm("Отменить экземпляр процесса?")) onCancel();
            }}
            disabled={cancelPending}
            className="text-[12px] text-red-500 hover:underline disabled:opacity-60"
          >
            Отменить процесс
          </button>
        </div>
      )}
    </div>
  );
}

// ── CreateRecordModal ─────────────────────────────────────────────────

function CreateRecordModal({
  entity,
  appId,
  onClose,
}: {
  entity: EntityRead;
  appId: string;
  onClose: () => void;
}) {
  const fields = entity.fields
    .filter((f) => !f.is_system && f.field_type !== "formula")
    .sort((a, b) => a.display_order - b.display_order);

  const [values, setValues] = useState<Record<string, string>>({});
  const createMutation = useCreateRecord(appId, entity.id);

  function handleSubmit() {
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (values[f.name] !== undefined && values[f.name] !== "") {
        if (f.field_type === "number" || f.field_type === "decimal" || f.field_type === "currency") {
          payload[f.name] = Number(values[f.name]);
        } else if (f.field_type === "boolean") {
          payload[f.name] = values[f.name] === "true";
        } else {
          payload[f.name] = values[f.name];
        }
      }
    });
    createMutation.mutate({ payload }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-[12px] shadow-xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cardbg">
          <h2 className="text-[16px] font-semibold text-primary">
            Новая запись — {entity.display_name}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-primary/50 hover:bg-mainbg transition-colors">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-[14px]">
          {fields.map((f) => (
            <div key={f.id} className="flex flex-col gap-[4px]">
              <label className="text-[12px] font-medium text-primary/70">
                {f.display_name}
                {f.is_required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {f.field_type === "boolean" ? (
                <select
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  className="h-[34px] px-[10px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta"
                >
                  <option value="">—</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              ) : f.field_type === "select" && Array.isArray((f.field_options as Record<string, unknown>)?.choices) ? (
                <select
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  className="h-[34px] px-[10px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta"
                >
                  <option value="">—</option>
                  {((f.field_options as Record<string, unknown>)?.choices as { value: string; label: string }[]).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : f.field_type === "long_text" || f.field_type === "rich_text" ? (
                <textarea
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  rows={3}
                  className="px-[10px] py-[6px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta resize-none"
                />
              ) : (
                <input
                  type={f.field_type === "number" || f.field_type === "decimal" || f.field_type === "currency" ? "number" : f.field_type === "date" ? "date" : f.field_type === "datetime" ? "datetime-local" : f.field_type === "email" ? "email" : f.field_type === "url" ? "url" : "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                  className="h-[34px] px-[10px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-[8px] px-6 py-4 border-t border-cardbg">
          <button
            onClick={onClose}
            className="h-[36px] px-[16px] rounded-btn border border-cardbg text-[14px] text-primary hover:bg-mainbg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="h-[36px] px-[16px] rounded-btn bg-cta text-white text-[14px] font-medium hover:bg-active transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? "Создаём…" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────

type ImportStep = "upload" | "preview" | "mapping" | "result";

function ImportModal({
  entity,
  appId,
  onClose,
}: {
  entity: EntityRead;
  appId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ total: number; created: number; skipped: number; errors: { row: number; error: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const targetFields = entity.fields.filter((f) => !f.is_system && f.field_type !== "formula");

  async function handleFileChange(f: File) {
    setFile(f);
    setError(null);
    setLoading(true);
    try {
      const p = await previewImport(appId, entity.id, f);
      setPreview(p);
      // Auto-map columns where names match field names
      const autoMap: Record<string, string> = {};
      p.headers.forEach((h) => {
        const match = targetFields.find(
          (tf) => tf.name === h || tf.display_name.toLowerCase() === h.toLowerCase(),
        );
        if (match) autoMap[h] = match.name;
      });
      setColumnMap(autoMap);
      setStep("preview");
    } catch {
      setError("Не удалось разобрать файл. Проверьте формат (CSV / XLSX).");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await importRecords(appId, entity.id, file, columnMap);
      setResult(res);
      setStep("result");
    } catch {
      setError("Ошибка при импорте. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-[12px] shadow-xl w-[620px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cardbg">
          <div className="flex items-center gap-[12px]">
            <h2 className="text-[16px] font-semibold text-primary">Импорт — {entity.display_name}</h2>
            <div className="flex items-center gap-[4px]">
              {(["upload", "preview", "mapping", "result"] as ImportStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-[4px]">
                  {i > 0 && <div className="w-[16px] h-[1px] bg-primary/20" />}
                  <span
                    className={cn(
                      "w-[20px] h-[20px] rounded-full flex items-center justify-center text-[11px] font-bold",
                      step === s
                        ? "bg-cta text-white"
                        : ["upload", "preview", "mapping", "result"].indexOf(step) > i
                        ? "bg-green-100 text-green-600"
                        : "bg-cardbg text-primary/30",
                    )}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-primary/50 hover:bg-mainbg transition-colors">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center gap-[16px] py-8">
              <div
                className="w-full border-2 border-dashed border-cardbg rounded-[10px] py-10 flex flex-col items-center gap-[8px] cursor-pointer hover:border-cta hover:bg-blue-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) void handleFileChange(f);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <ImportIcon className="w-10 h-10 text-primary/20" />
                <span className="text-[14px] text-primary/60">Перетащите файл или <span className="text-cta underline">выберите</span></span>
                <span className="text-[12px] text-primary/30">CSV, XLSX до 10 МБ</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileChange(f); }}
              />
              {loading && <span className="text-[13px] text-primary/40">Загрузка…</span>}
              {error && <span className="text-[13px] text-red-500">{error}</span>}
            </div>
          )}

          {step === "preview" && preview && (
            <div className="flex flex-col gap-[12px]">
              <div className="flex items-center gap-[8px] text-[13px] text-primary/60">
                <span className="font-medium text-primary">{file?.name}</span>
                <span>·</span>
                <span>{preview.total_rows} строк</span>
              </div>
              <div className="overflow-x-auto rounded-[8px] border border-cardbg">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#F5F6F8]">
                      {preview.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-primary border-r border-cardbg last:border-r-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, i) => (
                      <tr key={i} className="border-t border-cardbg">
                        {preview.headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-primary/70 border-r border-cardbg last:border-r-0 max-w-[120px] truncate">{row[h] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "mapping" && preview && (
            <div className="flex flex-col gap-[12px]">
              <p className="text-[13px] text-primary/60">Сопоставьте столбцы файла с полями сущности.</p>
              <div className="flex flex-col gap-[8px]">
                {preview.headers.map((h) => (
                  <div key={h} className="flex items-center gap-[12px]">
                    <span className="w-[180px] text-[13px] text-primary truncate font-medium">{h}</span>
                    <span className="text-primary/30">→</span>
                    <select
                      value={columnMap[h] ?? ""}
                      onChange={(e) => setColumnMap((p) => ({ ...p, [h]: e.target.value }))}
                      className="flex-1 h-[34px] px-[10px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta"
                    >
                      <option value="">— пропустить —</option>
                      {targetFields.map((f) => (
                        <option key={f.name} value={f.name}>{f.display_name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {error && <span className="text-[13px] text-red-500">{error}</span>}
            </div>
          )}

          {step === "result" && result && (
            <div className="flex flex-col gap-[16px]">
              <div className="grid grid-cols-3 gap-[10px]">
                {[
                  { label: "Всего строк", value: result.total, color: "text-primary" },
                  { label: "Создано", value: result.created, color: "text-green-600" },
                  { label: "Пропущено", value: result.skipped, color: "text-amber-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-mainbg rounded-[8px] p-4 border border-cardbg text-center">
                    <p className="text-[12px] text-primary/50 mb-1">{label}</p>
                    <p className={cn("text-[28px] font-bold", color)}>{value}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <div className="flex flex-col gap-[4px]">
                  <p className="text-[12px] font-semibold text-red-600">Ошибки ({result.errors.length})</p>
                  <div className="max-h-[200px] overflow-y-auto flex flex-col gap-[2px]">
                    {result.errors.map((e) => (
                      <div key={e.row} className="flex items-start gap-[6px] text-[12px]">
                        <span className="text-primary/40 shrink-0">Строка {e.row}:</span>
                        <span className="text-red-500">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-cardbg">
          <button
            onClick={() => {
              if (step === "preview") setStep("upload");
              else if (step === "mapping") setStep("preview");
              else if (step === "result") onClose();
              else onClose();
            }}
            className="h-[36px] px-[16px] rounded-btn border border-cardbg text-[14px] text-primary hover:bg-mainbg transition-colors"
          >
            {step === "result" ? "Закрыть" : step === "upload" ? "Отмена" : "Назад"}
          </button>
          <button
            disabled={loading || step === "upload"}
            onClick={() => {
              if (step === "preview") setStep("mapping");
              else if (step === "mapping") void handleImport();
            }}
            className={cn(
              "h-[36px] px-[16px] rounded-btn text-[14px] font-medium transition-colors",
              step === "result"
                ? "hidden"
                : "bg-cta text-white hover:bg-active disabled:opacity-60",
            )}
          >
            {loading ? "Обработка…" : step === "mapping" ? "Импортировать" : "Далее →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <TableIcon className="w-12 h-12 text-primary/15 mx-auto mb-3" />
        <p className="text-[16px] font-medium text-primary/50">
          {loading ? "Загрузка данных…" : "Выберите сущность в боковой панели"}
        </p>
      </div>
    </div>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-[6px] text-[14px] transition-colors",
        active
          ? "bg-cta text-white font-medium"
          : disabled
          ? "text-primary/30 cursor-not-allowed"
          : "text-primary hover:bg-white border border-cardbg",
      )}
    >
      {children}
    </button>
  );
}

function FileIcon({ fmt }: { fmt: string }) {
  const colors: Record<string, string> = { xlsx: "text-green-600", csv: "text-blue-500", pdf: "text-red-500" };
  return (
    <svg viewBox="0 0 14 16" fill="none" className={cn("w-3.5 h-4 shrink-0", colors[fmt] ?? "text-primary/50")}>
      <rect x="1" y="1" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" /><path d="M10.5 10.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" /></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M5 5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function RestoreIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M3 9a5 5 0 1 0 1-3.5L2 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ExportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function ImportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DotsIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="4" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="12" r="1.2" /></svg>;
}
function TableIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M1 6h14M5.5 6v8" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
