import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useEntities } from "@/shared/hooks/useEntities";
import { useEntityRules, useCreateRule, useUpdateRule, useDeleteRule } from "@/shared/hooks/useRules";
import type { FieldRead } from "@/shared/api/entities";
import type { Rule } from "@/shared/api/rules";

function uid() { return Math.random().toString(36).slice(2); }

/* ── Condition / Action row types (UI only) ── */
interface CondRow { id: string; field: string; op: string; value: string; }
interface ActionRow { id: string; type: string; field: string; value: string; message: string; url: string; }

const TRIGGER_EVENTS = [
  { value: "record.created",  label: "При создании записи" },
  { value: "record.updated",  label: "При обновлении записи" },
  { value: "record.deleted",  label: "При удалении записи" },
  { value: "field.changed",   label: "При изменении поля" },
];

const COMPARE_OPS = [
  { value: "eq",          label: "=" },
  { value: "ne",          label: "≠" },
  { value: "gt",          label: ">" },
  { value: "gte",         label: "≥" },
  { value: "lt",          label: "<" },
  { value: "lte",         label: "≤" },
  { value: "contains",    label: "содержит" },
  { value: "icontains",   label: "содержит (без рег.)" },
  { value: "is_null",     label: "пустое" },
  { value: "is_not_null", label: "не пустое" },
];

const ACTION_TYPES = [
  { value: "set_field",          label: "Установить значение поля" },
  { value: "send_notification",  label: "Отправить уведомление" },
  { value: "stop",               label: "Запретить сохранение" },
  { value: "call_webhook",       label: "Вызвать Webhook" },
];

/* ── Serialize conditions rows → API dict ── */
function buildConditions(rows: CondRow[]): Record<string, unknown> {
  if (!rows.length) return {};
  const items = rows.map((r) => ({ type: "compare", field: r.field, op: r.op, value: r.value || null }));
  return items.length === 1 ? items[0] : { type: "logical", op: "and", conditions: items };
}

/* ── Parse API conditions dict → rows ── */
function parseConditions(raw: Record<string, unknown>): CondRow[] {
  if (!raw || !Object.keys(raw).length) return [];
  if (raw.type === "logical") {
    return ((raw.conditions as unknown[]) ?? []).map((c: unknown) => {
      const cc = c as Record<string, unknown>;
      return { id: uid(), field: String(cc.field ?? ""), op: String(cc.op ?? "eq"), value: String(cc.value ?? "") };
    });
  }
  if (raw.type === "compare") {
    return [{ id: uid(), field: String(raw.field ?? ""), op: String(raw.op ?? "eq"), value: String(raw.value ?? "") }];
  }
  return [];
}

/* ── Serialize action rows → API list ── */
function buildActions(rows: ActionRow[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r.type === "set_field")         return { type: "set_field", field_name: r.field, value: r.value };
    if (r.type === "send_notification") return { type: "send_notification", message: r.message };
    if (r.type === "call_webhook")      return { type: "call_webhook", url: r.url, method: "POST" };
    return { type: r.type };
  });
}

/* ── Parse API actions list → rows ── */
function parseActions(acts: Record<string, unknown>[]): ActionRow[] {
  return (acts ?? []).map((a) => ({
    id:      uid(),
    type:    String(a.type ?? "set_field"),
    field:   String((a.field_name as string) ?? ""),
    value:   String(a.value ?? ""),
    message: String(a.message ?? ""),
    url:     String(a.url ?? ""),
  }));
}

/* ── Blank form state ── */
function blankForm(entityId: string) {
  return {
    name: "",
    description: "",
    priority: 100,
    triggerEvent: "record.created",
    watchFields: [] as string[],
    conditions: [] as CondRow[],
    actions: [] as ActionRow[],
    entityId,
  };
}

/* ════════════════════════════════════════════════════════════════
   Rule editor modal
   ════════════════════════════════════════════════════════════════ */
function RuleModal({
  rule,
  entityId,
  fields,
  appId,
  onClose,
}: {
  rule: Rule | null;
  entityId: string;
  fields: FieldRead[];
  appId: string;
  onClose: () => void;
}) {
  const isEdit = !!rule;
  const createMut = useCreateRule(appId);
  const updateMut = useUpdateRule(appId);

  const [form, setForm] = useState(() => {
    if (rule) {
      return {
        name:        rule.name,
        description: rule.description ?? "",
        priority:    rule.priority,
        triggerEvent: rule.trigger.event,
        watchFields:  rule.trigger.watch_fields ?? [],
        conditions:  parseConditions(rule.conditions),
        actions:     parseActions(rule.actions),
        entityId,
      };
    }
    return blankForm(entityId);
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userFields = fields.filter((f) => !f.is_system);

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /* ── Condition helpers ── */
  function addCond() {
    setForm((p) => ({ ...p, conditions: [...p.conditions, { id: uid(), field: userFields[0]?.name ?? "", op: "eq", value: "" }] }));
  }
  function patchCond(id: string, patch: Partial<CondRow>) {
    setForm((p) => ({ ...p, conditions: p.conditions.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  }
  function removeCond(id: string) {
    setForm((p) => ({ ...p, conditions: p.conditions.filter((c) => c.id !== id) }));
  }

  /* ── Action helpers ── */
  function addAction() {
    setForm((p) => ({ ...p, actions: [...p.actions, { id: uid(), type: "set_field", field: userFields[0]?.name ?? "", value: "", message: "", url: "" }] }));
  }
  function patchAction(id: string, patch: Partial<ActionRow>) {
    setForm((p) => ({ ...p, actions: p.actions.map((a) => a.id === id ? { ...a, ...patch } : a) }));
  }
  function removeAction(id: string) {
    setForm((p) => ({ ...p, actions: p.actions.filter((a) => a.id !== id) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Введите название правила"); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      priority:    form.priority,
      trigger:     { event: form.triggerEvent, watch_fields: form.triggerEvent === "field.changed" ? form.watchFields : undefined },
      conditions:  buildConditions(form.conditions),
      actions:     buildActions(form.actions),
    };
    try {
      if (isEdit && rule) {
        await updateMut.mutateAsync({ ruleId: rule.id, body: payload });
      } else {
        await createMut.mutateAsync({ ...payload, entity_id: entityId });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const opsWithoutValue = ["is_null", "is_not_null"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[16px] shadow-2xl w-[820px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-cardbg">
          <h2 className="text-[20px] font-bold text-primary">{isEdit ? "Редактировать правило" : "Новое правило"}</h2>
          <button onClick={onClose} className="text-primary/40 hover:text-primary text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-6 flex flex-col gap-6">
          {error && <div className="px-4 py-2 bg-[#FDECEC] text-mistake text-[14px] rounded-[8px]">{error}</div>}

          {/* ── Basic info ── */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[13px] text-primary/60 mb-1">Название *</label>
              <input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="Например: Уведомление при создании"
                className="w-full h-[38px] border border-cardbg rounded-[8px] px-3 text-[14px] text-primary focus:outline-none focus:border-cta"
              />
            </div>
            <div className="w-[120px]">
              <label className="block text-[13px] text-primary/60 mb-1">Приоритет</label>
              <input
                type="number" min={1} max={9999}
                value={form.priority}
                onChange={(e) => setF("priority", Number(e.target.value))}
                className="w-full h-[38px] border border-cardbg rounded-[8px] px-3 text-[14px] text-primary focus:outline-none focus:border-cta"
              />
            </div>
          </div>

          {/* ── Trigger ── */}
          <div>
            <p className="text-[15px] font-semibold text-primary mb-3">Триггер</p>
            <select
              value={form.triggerEvent}
              onChange={(e) => setF("triggerEvent", e.target.value)}
              className="h-[38px] border border-cardbg rounded-[8px] px-3 text-[14px] text-primary focus:outline-none focus:border-cta bg-white"
            >
              {TRIGGER_EVENTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {form.triggerEvent === "field.changed" && userFields.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {userFields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const wf = form.watchFields;
                      setF("watchFields", wf.includes(f.name) ? wf.filter((x) => x !== f.name) : [...wf, f.name]);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full border text-[13px] transition-colors",
                      form.watchFields.includes(f.name)
                        ? "bg-cta text-white border-cta"
                        : "border-cardbg text-primary hover:border-cta"
                    )}
                  >
                    {f.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Conditions ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-semibold text-primary">ЕСЛИ (условия)</p>
              <button onClick={addCond} className="text-[13px] text-cta hover:underline">+ Добавить условие</button>
            </div>
            {form.conditions.length === 0 && (
              <p className="text-[13px] text-primary/40 italic">Нет условий — правило срабатывает всегда</p>
            )}
            <div className="flex flex-col gap-2">
              {form.conditions.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[11px] font-semibold text-primary/40 w-8 text-right shrink-0">И</span>}
                  {i === 0 && <span className="w-8 shrink-0" />}
                  <select
                    value={c.field}
                    onChange={(e) => patchCond(c.id, { field: e.target.value })}
                    className="h-[34px] flex-1 border border-cardbg rounded-[8px] px-2 text-[13px] bg-white focus:outline-none focus:border-cta"
                  >
                    {userFields.map((f) => <option key={f.id} value={f.name}>{f.display_name}</option>)}
                  </select>
                  <select
                    value={c.op}
                    onChange={(e) => patchCond(c.id, { op: e.target.value })}
                    className="h-[34px] w-[150px] border border-cardbg rounded-[8px] px-2 text-[13px] bg-white focus:outline-none focus:border-cta"
                  >
                    {COMPARE_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!opsWithoutValue.includes(c.op) && (
                    <input
                      value={c.value}
                      onChange={(e) => patchCond(c.id, { value: e.target.value })}
                      placeholder="Значение"
                      className="h-[34px] w-[180px] border border-cardbg rounded-[8px] px-2 text-[13px] focus:outline-none focus:border-cta"
                    />
                  )}
                  <button onClick={() => removeCond(c.id)} className="text-primary/30 hover:text-mistake text-lg leading-none w-6 shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-semibold text-primary">ТО (действия)</p>
              <button onClick={addAction} className="text-[13px] text-cta hover:underline">+ Добавить действие</button>
            </div>
            {form.actions.length === 0 && (
              <p className="text-[13px] text-primary/40 italic">Нет действий — добавьте хотя бы одно</p>
            )}
            <div className="flex flex-col gap-3">
              {form.actions.map((a) => (
                <div key={a.id} className="flex items-start gap-2 bg-mainbg rounded-[10px] p-3">
                  <select
                    value={a.type}
                    onChange={(e) => patchAction(a.id, { type: e.target.value })}
                    className="h-[34px] w-[230px] border border-cardbg rounded-[8px] px-2 text-[13px] bg-white focus:outline-none focus:border-cta shrink-0"
                  >
                    {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex-1 flex flex-col gap-2">
                    {a.type === "set_field" && (
                      <div className="flex gap-2">
                        <select
                          value={a.field}
                          onChange={(e) => patchAction(a.id, { field: e.target.value })}
                          className="h-[34px] flex-1 border border-cardbg rounded-[8px] px-2 text-[13px] bg-white focus:outline-none focus:border-cta"
                        >
                          {userFields.map((f) => <option key={f.id} value={f.name}>{f.display_name}</option>)}
                        </select>
                        <input
                          value={a.value}
                          onChange={(e) => patchAction(a.id, { value: e.target.value })}
                          placeholder="Новое значение"
                          className="h-[34px] flex-1 border border-cardbg rounded-[8px] px-2 text-[13px] focus:outline-none focus:border-cta"
                        />
                      </div>
                    )}
                    {a.type === "send_notification" && (
                      <input
                        value={a.message}
                        onChange={(e) => patchAction(a.id, { message: e.target.value })}
                        placeholder="Текст уведомления"
                        className="h-[34px] flex-1 border border-cardbg rounded-[8px] px-2 text-[13px] focus:outline-none focus:border-cta"
                      />
                    )}
                    {a.type === "call_webhook" && (
                      <input
                        value={a.url}
                        onChange={(e) => patchAction(a.id, { url: e.target.value })}
                        placeholder="https://example.com/hook"
                        className="h-[34px] flex-1 border border-cardbg rounded-[8px] px-2 text-[13px] focus:outline-none focus:border-cta"
                      />
                    )}
                    {a.type === "stop" && (
                      <span className="text-[13px] text-mistake/70 leading-[34px]">Сохранение будет заблокировано</span>
                    )}
                  </div>
                  <button onClick={() => removeAction(a.id)} className="text-primary/30 hover:text-mistake text-lg leading-none w-6 mt-[7px] shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-cardbg">
          <button onClick={onClose} className="h-[38px] px-5 rounded-[8px] border border-cardbg text-[14px] text-primary hover:bg-mainbg">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[38px] px-6 rounded-[8px] bg-cta text-white text-[14px] font-medium hover:bg-cta/90 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить правило"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Rule card
   ════════════════════════════════════════════════════════════════ */
function RuleCard({ rule, appId, onEdit }: { rule: Rule; appId: string; onEdit: () => void; }) {
  const updateMut = useUpdateRule(appId);
  const deleteMut = useDeleteRule(appId);

  const triggerLabel = TRIGGER_EVENTS.find((t) => t.value === rule.trigger.event)?.label ?? rule.trigger.event;

  return (
    <div className={cn("bg-white rounded-[12px] border px-5 py-4 flex items-start gap-4", rule.is_active ? "border-cardbg" : "border-cardbg opacity-60")}>
      {/* Active toggle */}
      <button
        onClick={() => updateMut.mutate({ ruleId: rule.id, body: { is_active: !rule.is_active } })}
        className={cn("mt-1 w-[38px] h-[22px] rounded-full shrink-0 transition-colors relative", rule.is_active ? "bg-cta" : "bg-cardbg")}
      >
        <span className={cn("absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full shadow transition-transform", rule.is_active ? "translate-x-[18px]" : "translate-x-[3px]")} />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-semibold text-primary truncate">{rule.name}</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EBF4FF] text-cta shrink-0">{triggerLabel}</span>
          <span className="text-[11px] text-primary/40 shrink-0">пр. {rule.priority}</span>
        </div>
        {rule.description && (
          <p className="text-[13px] text-primary/60 truncate">{rule.description}</p>
        )}
        <p className="text-[12px] text-primary/40 mt-0.5">
          {rule.actions.length} действий · v{rule.version}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="h-[32px] px-3 rounded-[8px] border border-cardbg text-[13px] text-primary hover:bg-mainbg">
          Изменить
        </button>
        <button
          onClick={() => { if (confirm(`Удалить правило "${rule.name}"?`)) deleteMut.mutate(rule.id); }}
          className="h-[32px] px-3 rounded-[8px] border border-[#FDECEC] text-[13px] text-mistake hover:bg-[#FDECEC]"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════════════════════════ */
export function RulesPage() {
  const [railModule, setRailModule] = useState<RailModule>("automation");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; rule: Rule | null }>({ open: false, rule: null });

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const appId = app?.id ?? "";

  const entitiesQuery = useEntities(appId || undefined);
  const entities = entitiesQuery.data ?? [];

  const activeEntityId = selectedEntityId ?? entities[0]?.id ?? "";
  const activeEntity = entities.find((e) => e.id === activeEntityId) ?? null;
  const fields = activeEntity?.fields ?? [];

  const rulesQuery = useEntityRules(appId || undefined, activeEntityId || undefined);
  const rules = rulesQuery.data ?? [];

  function openCreate() { setModal({ open: true, rule: null }); }
  function openEdit(rule: Rule) { setModal({ open: true, rule }); }
  function closeModal() { setModal({ open: false, rule: null }); }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Entity sidebar ── */}
      <aside
        className="absolute bg-white overflow-y-auto border-r border-cardbg"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="flex items-center px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Правила</span>
        </div>
        {entities.length === 0 && (
          <p className="px-5 py-4 text-[13px] text-primary/40">Нет таблиц — создайте их в разделе «База данных»</p>
        )}
        <nav className="py-2">
          {entities.map((ent) => (
            <button
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              className={cn(
                "w-full text-left px-5 py-[10px] text-[15px] transition-colors",
                ent.id === activeEntityId
                  ? "bg-[#EBF4FF] text-cta font-medium"
                  : "text-primary hover:bg-mainbg"
              )}
            >
              {ent.display_name}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Rules list ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 380, top: 70, width: 1130, height: 1010 }}
      >
        <div className="px-[40px] py-[28px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-bold text-primary">
                {activeEntity ? activeEntity.display_name : "Выберите таблицу"}
              </h2>
              {activeEntity && (
                <p className="text-[14px] text-primary/50 mt-1">
                  {rules.length === 0 ? "Нет правил" : `${rules.length} ${rules.length === 1 ? "правило" : rules.length < 5 ? "правила" : "правил"}`}
                </p>
              )}
            </div>
            {activeEntity && (
              <button
                onClick={openCreate}
                className="h-[38px] px-5 rounded-[10px] bg-cta text-white text-[14px] font-medium hover:bg-cta/90 flex items-center gap-2"
              >
                <span className="text-xl leading-none">+</span>
                Добавить правило
              </button>
            )}
          </div>

          {rulesQuery.isLoading && <p className="text-[14px] text-primary/40">Загрузка…</p>}

          {!rulesQuery.isLoading && rules.length === 0 && activeEntity && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-[48px] mb-4">⚡</div>
              <p className="text-[18px] font-semibold text-primary mb-2">Правил пока нет</p>
              <p className="text-[14px] text-primary/50 mb-6 max-w-[400px]">
                Создайте правило, чтобы автоматически реагировать на события в таблице: отправлять уведомления, менять поля или блокировать сохранение.
              </p>
              <button
                onClick={openCreate}
                className="h-[40px] px-6 rounded-[10px] bg-cta text-white text-[15px] font-medium hover:bg-cta/90"
              >
                Создать первое правило
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} appId={appId} onEdit={() => openEdit(rule)} />
            ))}
          </div>
        </div>
      </main>

      <PreviewPanel projectName={app?.name ?? "Lesovik"} />

      {modal.open && activeEntity && (
        <RuleModal
          rule={modal.rule}
          entityId={activeEntity.id}
          fields={fields}
          appId={appId}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
