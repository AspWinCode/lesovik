import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────
   LOCAL PRIMITIVES (mirrored from Modals.tsx)
───────────────────────────────────────────────── */

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 32, 95, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-mainbg rounded-[10px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-7 h-7 shrink-0 hover:opacity-70 transition-opacity">
      <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
        <line x1="7" y1="7" x2="21" y2="21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="7" x2="7" y2="21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function BlueField({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full h-[41px] bg-cardbg rounded-btn flex items-center px-5 relative", className)}>
      {children}
    </div>
  );
}

function ModalButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-[10px]">
      <button
        onClick={onCancel}
        className="px-5 py-[3px] h-[34px] border-2 border-cta rounded-btn text-cta text-meta hover:bg-cta/10 transition-colors"
      >
        Отмена
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="px-5 py-[3px] h-[34px] bg-cta border-2 border-cta rounded-btn text-white text-meta hover:bg-active transition-colors disabled:opacity-60 disabled:cursor-default"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-[38px] h-[21px] rounded-full transition-colors shrink-0",
        checked ? "bg-cta" : "bg-cardbg border border-primary/20"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] w-[17px] h-[17px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

/* ── Field Label ── */
function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[14px] font-medium text-primary">{children}</label>;
}

/* ── Simple Select ── */
function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <BlueField>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] text-primary cursor-pointer appearance-none"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="absolute right-4 text-primary/50 text-xs pointer-events-none">▾</span>
    </BlueField>
  );
}

/* ─────────────────────────────────────────────────
   1. NewStepModal
───────────────────────────────────────────────── */

const STEP_TYPES = [
  { key: "add_row",    icon: "➕", label: "Добавить строку" },
  { key: "delete_row", icon: "🗑️", label: "Удалить строку" },
  { key: "set_value",  icon: "📝", label: "Установить значение" },
  { key: "notify",     icon: "✉️", label: "Отправить уведомление" },
  { key: "branch",     icon: "🔀", label: "Разветвление с условием" },
  { key: "call",       icon: "🔄", label: "Вызвать другой процесс" },
];

export function NewStepModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (type: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 480 }} className="px-10 py-[30px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-primary">Добавить шаг процесса</h2>
          <CloseBtn onClick={onClose} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STEP_TYPES.map((step) => (
            <button
              key={step.key}
              onClick={() => setSelected(step.key)}
              className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-[10px] border-2 transition-colors text-left",
                selected === step.key
                  ? "border-cta bg-cta/10"
                  : "border-cardbg bg-mainbg hover:border-cta/40"
              )}
            >
              <span className="text-2xl shrink-0 leading-none">{step.icon}</span>
              <span
                className={cn(
                  "text-[14px] font-semibold",
                  selected === step.key ? "text-cta" : "text-primary"
                )}
              >
                {step.label}
              </span>
            </button>
          ))}
        </div>

        <ModalButtons
          onCancel={onClose}
          onConfirm={() => selected && onAdd(selected)}
          confirmLabel="Добавить"
          disabled={!selected}
        />
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   2. CustomTaskModal
───────────────────────────────────────────────── */

const EXECUTOR_OPTIONS = ["Текущий пользователь", "Email", "Роль"];

export function CustomTaskModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (data: {
    title: string;
    description: string;
    executor: string;
    deadline: string;
    message: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [executor, setExecutor] = useState(EXECUTOR_OPTIONS[0]);
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 500 }} className="px-10 py-[30px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-primary">Пользовательская задача</h2>
          <CloseBtn onClick={onClose} />
        </div>

        <div className="flex flex-col gap-[8px]">
          <FieldLabel>Название задачи</FieldLabel>
          <BlueField>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название задачи..."
              className="w-full bg-transparent outline-none text-[16px] text-primary placeholder-primary/40"
            />
          </BlueField>
        </div>

        <div className="flex flex-col gap-[8px]">
          <FieldLabel>Описание</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание задачи..."
            rows={3}
            className="w-full bg-cardbg rounded-btn px-5 py-3 text-[16px] text-primary outline-none resize-none placeholder-primary/40"
          />
        </div>

        <div className="flex flex-col gap-[8px]">
          <FieldLabel>Исполнитель</FieldLabel>
          <SimpleSelect value={executor} onChange={setExecutor} options={EXECUTOR_OPTIONS} />
        </div>

        <div className="flex flex-col gap-[8px]">
          <FieldLabel>Срок выполнения</FieldLabel>
          <BlueField>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-transparent outline-none text-[16px] text-primary"
            />
          </BlueField>
        </div>

        <div className="flex flex-col gap-[8px]">
          <FieldLabel>Сообщение пользователю</FieldLabel>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сообщение для исполнителя..."
            rows={3}
            className="w-full bg-cardbg rounded-btn px-5 py-3 text-[16px] text-primary outline-none resize-none placeholder-primary/40"
          />
        </div>

        <ModalButtons
          onCancel={onClose}
          onConfirm={() => onConfirm({ title, description, executor, deadline, message })}
          confirmLabel="Сохранить"
          disabled={!title.trim()}
        />
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   3. EventSourcesModal
───────────────────────────────────────────────── */

const SCHEDULE_PRESETS = ["Ежедневно", "Еженедельно", "Ежемесячно", "Своё расписание"];

export function EventSourcesModal({
  tables,
  onClose,
  onSave,
}: {
  tables: string[];
  onClose: () => void;
  onSave: (settings: {
    appEnabled: boolean;
    appTable: string;
    appTriggers: { add: boolean; delete: boolean; update: boolean };
    scheduleEnabled: boolean;
    schedulePreset: string;
    scheduleCron: string;
    webhookEnabled: boolean;
    manualEnabled: boolean;
  }) => void;
}) {
  const [appEnabled, setAppEnabled] = useState(false);
  const [appTable, setAppTable] = useState(tables[0] ?? "");
  const [appTriggers, setAppTriggers] = useState({ add: true, delete: false, update: false });

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState(SCHEDULE_PRESETS[0]);
  const [scheduleCron, setScheduleCron] = useState("");

  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [manualEnabled, setManualEnabled] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/trigger`
    : "https://example.com/api/webhooks/trigger";

  const [webhookCopied, setWebhookCopied] = useState(false);
  function copyWebhook() {
    void navigator.clipboard?.writeText(webhookUrl).then(() => {
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 1500);
    });
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 540 }} className="px-10 py-[30px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-primary">Источники событий</h2>
          <CloseBtn onClick={onClose} />
        </div>

        {/* App source */}
        <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-mainbg">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-primary">Приложение</span>
            <Toggle checked={appEnabled} onChange={setAppEnabled} />
          </div>
          {appEnabled && (
            <div className="flex flex-col gap-3">
              <SimpleSelect value={appTable} onChange={setAppTable} options={tables.length ? tables : ["(нет таблиц)"]} />
              <div className="flex gap-5">
                {(["add", "delete", "update"] as const).map((t) => {
                  const labels = { add: "Добавление", delete: "Удаление", update: "Обновление" };
                  return (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-[14px] text-primary">
                      <input
                        type="checkbox"
                        checked={appTriggers[t]}
                        onChange={(e) => setAppTriggers((prev) => ({ ...prev, [t]: e.target.checked }))}
                        className="accent-cta"
                      />
                      {labels[t]}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Schedule source */}
        <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-mainbg">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-primary">Расписание</span>
            <Toggle checked={scheduleEnabled} onChange={setScheduleEnabled} />
          </div>
          {scheduleEnabled && (
            <div className="flex flex-col gap-3">
              <SimpleSelect value={schedulePreset} onChange={setSchedulePreset} options={SCHEDULE_PRESETS} />
              {schedulePreset === "Своё расписание" && (
                <BlueField>
                  <input
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    className="w-full bg-transparent outline-none text-[15px] text-primary placeholder-primary/40 font-mono"
                  />
                </BlueField>
              )}
            </div>
          )}
        </div>

        {/* Webhook source */}
        <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-mainbg">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-primary">Webhook</span>
            <Toggle checked={webhookEnabled} onChange={setWebhookEnabled} />
          </div>
          {webhookEnabled && (
            <div className="flex items-center gap-2">
              <BlueField className="flex-1">
                <span className="text-[13px] text-primary/70 truncate font-mono">{webhookUrl}</span>
              </BlueField>
              <button
                onClick={copyWebhook}
                title={webhookCopied ? "Скопировано" : "Копировать URL"}
                className="shrink-0 h-[41px] px-4 border-2 border-cta rounded-btn text-cta text-[13px] hover:bg-cta/10 transition-colors"
              >
                {webhookCopied ? "✓" : "Копировать"}
              </button>
            </div>
          )}
        </div>

        {/* Manual source */}
        <div className="flex items-center justify-between p-4 rounded-[10px] bg-mainbg">
          <span className="text-[15px] font-semibold text-primary">Вручную</span>
          <Toggle checked={manualEnabled} onChange={setManualEnabled} />
        </div>

        <ModalButtons
          onCancel={onClose}
          onConfirm={() =>
            onSave({
              appEnabled,
              appTable,
              appTriggers,
              scheduleEnabled,
              schedulePreset,
              scheduleCron,
              webhookEnabled,
              manualEnabled,
            })
          }
          confirmLabel="Сохранить"
        />
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   4. TableExtensionModal
───────────────────────────────────────────────── */

const TABLE_EXTENSIONS = [
  { key: "triggers",   icon: "⚡", label: "Триггеры",               desc: "Автоматические действия" },
  { key: "aggcols",    icon: "📊", label: "Агрегированные столбцы",  desc: "Вычисляемые агрегаты" },
  { key: "related",    icon: "🔗", label: "Связанные данные",        desc: "Отношения между таблицами" },
  { key: "rls",        icon: "🔒", label: "Строчная безопасность",   desc: "Ограничение доступа к строкам" },
  { key: "audit",      icon: "📝", label: "Аудит изменений",         desc: "Журнал всех изменений" },
  { key: "versions",   icon: "🔄", label: "История версий",          desc: "Откат к предыдущим версиям" },
];

export function TableExtensionModal({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 480 }} className="px-10 py-[30px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-primary">Расширение таблицы</h2>
          <CloseBtn onClick={onClose} />
        </div>

        <div className="flex flex-col gap-3">
          {TABLE_EXTENSIONS.map((ext) => (
            <div
              key={ext.key}
              className="flex items-center gap-4 px-4 py-3 rounded-[10px] bg-mainbg"
            >
              <span className="text-2xl shrink-0">{ext.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-primary">{ext.label}</p>
                <p className="text-[13px] text-primary/60">{ext.desc}</p>
              </div>
              <Toggle checked={!!enabled[ext.key]} onChange={() => toggle(ext.key)} />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-[3px] h-[34px] bg-cta border-2 border-cta rounded-btn text-white text-meta hover:bg-active transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </Overlay>
  );
}
