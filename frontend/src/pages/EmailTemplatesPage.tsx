import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import type { EmailTemplateRead, EmailTemplateUpdate, TemplateVariable } from "@/shared/api/emailTemplates";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  usePreviewEmailTemplate,
} from "@/shared/hooks/useEmailTemplates";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";

type EditorTab = "subject" | "html" | "text" | "preview" | "variables";

interface Draft {
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  description: string;
}

function draftFrom(t: EmailTemplateRead): Draft {
  return {
    name: t.name,
    subject: t.subject,
    body_html: t.body_html,
    body_text: t.body_text ?? "",
    description: t.description ?? "",
  };
}

function isDirty(draft: Draft, t: EmailTemplateRead): boolean {
  return (
    draft.name !== t.name ||
    draft.subject !== t.subject ||
    draft.body_html !== t.body_html ||
    draft.body_text !== (t.body_text ?? "") ||
    draft.description !== (t.description ?? "")
  );
}

/* ── New template form ── */
function NewTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const invalid = !code.match(/^[a-z0-9_]+$/) || !name.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[12px] shadow-xl p-6 w-[400px]">
        <h2 className="text-[17px] font-semibold text-primary mb-4">Новый шаблон</h2>
        <label className="block text-[12px] text-primary/60 mb-1">Код (slug)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
          placeholder="my_template"
          className="w-full h-[38px] border border-cardbg rounded-[8px] px-3 text-[14px] font-mono mb-3 focus:outline-none focus:border-cta"
        />
        <label className="block text-[12px] text-primary/60 mb-1">Название</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название шаблона"
          className="w-full h-[38px] border border-cardbg rounded-[8px] px-3 text-[14px] mb-4 focus:outline-none focus:border-cta"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-[36px] px-4 rounded-[8px] text-[13px] border border-cardbg text-primary/60 hover:border-primary/30"
          >
            Отмена
          </button>
          <button
            disabled={invalid}
            onClick={() => onCreate(code, name)}
            className="h-[36px] px-4 rounded-[8px] text-[13px] bg-cta text-white hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Variable chip ── */
function VarChip({ v }: { v: TemplateVariable }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-cardbg last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code className="text-[12px] font-mono text-cta bg-cta/8 px-1.5 py-0.5 rounded">
            {"{{ " + v.name + " }}"}
          </code>
          <span className="text-[11px] text-primary/40">{v.type}</span>
        </div>
        {v.description && (
          <p className="text-[12px] text-primary/55 mt-0.5">{v.description}</p>
        )}
        {v.example && (
          <p className="text-[11px] text-primary/35 mt-0.5">пример: {v.example}</p>
        )}
      </div>
    </div>
  );
}

/* ── Editor panel ── */
function TemplateEditor({
  template,
  onSaved,
  onDeleted,
}: {
  template: EmailTemplateRead;
  onSaved: (msg: string) => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<EditorTab>("html");
  const [draft, setDraft] = useState<Draft>(draftFrom(template));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();
  const previewMutation = usePreviewEmailTemplate();

  // Reset draft when a different template is selected
  useEffect(() => {
    setDraft(draftFrom(template));
    setPreviewHtml(null);
    setPreviewSubject(null);
    setPreviewErr(null);
    setTab("html");
  }, [template.id]);

  const dirty = isDirty(draft, template);

  async function save() {
    const body: EmailTemplateUpdate = {
      name: draft.name,
      subject: draft.subject,
      body_html: draft.body_html,
      body_text: draft.body_text || null,
      description: draft.description || null,
    };
    await updateMutation.mutateAsync({ id: template.id, body });
    onSaved("Шаблон сохранён");
  }

  async function doDelete() {
    if (!confirm(`Удалить шаблон «${template.name}»?`)) return;
    await deleteMutation.mutateAsync(template.id);
    onDeleted();
  }

  async function loadPreview() {
    setPreviewErr(null);
    // Build sample context from variables
    const ctx: Record<string, unknown> = {};
    for (const v of template.variables) {
      ctx[v.name] = v.example ?? `{{${v.name}}}`;
    }
    try {
      const r = await previewMutation.mutateAsync({ id: template.id, context: ctx });
      setPreviewHtml(r.body_html);
      setPreviewSubject(r.subject);
    } catch {
      setPreviewErr("Ошибка рендеринга — проверьте синтаксис Jinja2");
    }
  }

  function handleTabChange(t: EditorTab) {
    setTab(t);
    if (t === "preview") void loadPreview();
  }

  const TABS: { id: EditorTab; label: string }[] = [
    { id: "html", label: "HTML тело" },
    { id: "subject", label: "Тема" },
    { id: "text", label: "Текст" },
    { id: "preview", label: "Предпросмотр" },
    { id: "variables", label: "Переменные" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cardbg shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="text-[18px] font-semibold text-primary bg-transparent border-0 outline-none focus:underline focus:decoration-cta w-auto max-w-[340px]"
          />
          <span className="text-[12px] font-mono text-primary/35 shrink-0">{template.code}</span>
          {template.is_system && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/50 shrink-0">system</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!template.is_system && (
            <button
              onClick={() => void doDelete()}
              disabled={deleteMutation.isPending}
              className="h-[34px] px-3 rounded-[8px] text-[13px] border border-cardbg text-mistake hover:border-mistake disabled:opacity-40"
            >
              Удалить
            </button>
          )}
          <button
            onClick={() => void save()}
            disabled={!dirty || updateMutation.isPending}
            className="h-[34px] px-4 rounded-[8px] text-[13px] bg-cta text-white hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-6 py-2 border-b border-cardbg shrink-0">
        <input
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="Описание шаблона (опционально)"
          className="w-full text-[13px] text-primary/55 bg-transparent border-0 outline-none placeholder:text-primary/30"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cardbg px-6 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={cn(
              "h-[42px] px-4 text-[13px] font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-cta text-cta"
                : "border-transparent text-primary/50 hover:text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "subject" && (
          <div className="p-6">
            <label className="block text-[12px] text-primary/55 mb-2 font-medium">
              Тема письма (поддерживает Jinja2)
            </label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              className="w-full h-[42px] border border-cardbg rounded-[8px] px-3 text-[14px] font-mono focus:outline-none focus:border-cta"
            />
            <p className="text-[12px] text-primary/40 mt-2">
              Используйте <code className="text-cta">{"{{ variable }}"}</code> для подстановки переменных
            </p>
          </div>
        )}

        {tab === "html" && (
          <textarea
            value={draft.body_html}
            onChange={(e) => setDraft((d) => ({ ...d, body_html: e.target.value }))}
            className="w-full h-full p-6 text-[13px] font-mono resize-none focus:outline-none leading-relaxed bg-transparent"
            placeholder="<p>HTML тело письма с Jinja2 тегами</p>"
            spellCheck={false}
          />
        )}

        {tab === "text" && (
          <div className="flex flex-col h-full">
            <div className="px-6 pt-4 pb-2 shrink-0">
              <p className="text-[12px] text-primary/40">
                Текстовая версия для почтовых клиентов без HTML. Если пусто — отправляется только HTML.
              </p>
            </div>
            <textarea
              value={draft.body_text}
              onChange={(e) => setDraft((d) => ({ ...d, body_text: e.target.value }))}
              className="flex-1 px-6 pb-6 text-[13px] font-mono resize-none focus:outline-none leading-relaxed bg-transparent"
              placeholder="Текстовая версия письма..."
              spellCheck={false}
            />
          </div>
        )}

        {tab === "preview" && (
          <div className="h-full overflow-auto p-6">
            {previewMutation.isPending && (
              <div className="text-[13px] text-primary/50">Рендеринг...</div>
            )}
            {previewErr && (
              <div className="bg-mistake/10 border border-mistake/20 rounded-[8px] p-3 text-[13px] text-mistake">
                {previewErr}
              </div>
            )}
            {previewHtml && !previewErr && (
              <div>
                <div className="mb-3 text-[12px] text-primary/40 font-medium">
                  Тема: <span className="text-primary">{previewSubject ?? draft.subject}</span>
                </div>
                <div className="border border-cardbg rounded-[8px] bg-white overflow-hidden">
                  <div className="bg-mainbg px-4 py-2 text-[11px] text-primary/40 border-b border-cardbg">
                    Предпросмотр HTML
                  </div>
                  <div
                    className="p-6 text-[14px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
                <button
                  onClick={() => void loadPreview()}
                  className="mt-3 text-[12px] text-cta hover:underline"
                >
                  Обновить
                </button>
              </div>
            )}
            {!previewHtml && !previewMutation.isPending && !previewErr && (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-[15px] font-semibold text-primary mb-2">Предпросмотр</p>
                <p className="text-[13px] text-primary/40 mb-4">
                  Переменные заполняются примерами из вкладки «Переменные»
                </p>
                <button
                  onClick={() => void loadPreview()}
                  className="h-[36px] px-4 rounded-[8px] text-[13px] bg-cta text-white hover:bg-cta/90"
                >
                  Показать предпросмотр
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "variables" && (
          <div className="p-6 overflow-auto h-full">
            <p className="text-[12px] text-primary/50 mb-4">
              Переменные доступны в теме, HTML и текстовом теле через синтаксис{" "}
              <code className="text-cta bg-cta/8 px-1 rounded">{"{{ variable }}"}</code>.
              Jinja2 поддерживает фильтры:{" "}
              <code className="text-primary/60 text-[11px]">{"{{ var | default('N/A') | upper }}"}</code>
            </p>
            {template.variables.length === 0 ? (
              <p className="text-[13px] text-primary/40">Переменные не заданы</p>
            ) : (
              <div>
                {template.variables.map((v, i) => (
                  <VarChip key={i} v={v} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared content (used by both the standalone page and AdminPage) ── */
export function EmailTemplatesContent({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const templatesQuery = useEmailTemplates();
  const createMutation = useCreateEmailTemplate();

  const templates = templatesQuery.data ?? [];
  const selected = templates.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleCreate(code: string, name: string) {
    const t = await createMutation.mutateAsync({
      code,
      name,
      subject: `Тема: ${name}`,
      body_html: `<p>Здравствуйте, {{ display_name | default("пользователь") }}!</p>\n<p>Текст письма...</p>`,
    });
    setSelectedId(t.id);
    setShowNew(false);
    showToast(`Шаблон «${name}» создан`);
  }

  return (
    <div className={cn("flex overflow-hidden bg-white rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]", className)}>
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 border-r border-cardbg flex flex-col h-full">
        <div className="px-4 py-4 border-b border-cardbg">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[16px] font-semibold text-primary">Email-шаблоны</h2>
            <button
              onClick={() => setShowNew(true)}
              title="Новый шаблон"
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] bg-cta text-white text-[18px] leading-none hover:bg-cta/90"
            >
              +
            </button>
          </div>
          <p className="text-[12px] text-primary/40">{templates.length} шаблонов</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {templatesQuery.isLoading && (
            <p className="px-4 py-3 text-[13px] text-primary/40">Загрузка...</p>
          )}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "w-full text-left px-4 py-3 transition-colors border-l-2",
                selectedId === t.id
                  ? "bg-cta/6 border-cta"
                  : "border-transparent hover:bg-mainbg",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-primary leading-tight truncate">
                  {t.name}
                </span>
                {t.is_system && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary/40 shrink-0">
                    sys
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-primary/35">{t.code}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <TemplateEditor
            key={selected.id}
            template={selected}
            onSaved={showToast}
            onDeleted={() => {
              setSelectedId(templates.find((t) => t.id !== selected.id)?.id ?? null);
              showToast("Шаблон удалён");
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-cta/10 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M4 4h16v16H4z" stroke="#35A7FF" strokeWidth="1.5" rx="2" />
                <path d="M4 8l8 5 8-5" stroke="#35A7FF" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-[16px] font-semibold text-primary mb-1">Выберите шаблон</p>
            <p className="text-[13px] text-primary/40">или создайте новый</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 h-[36px] px-4 rounded-[8px] text-[13px] bg-cta text-white hover:bg-cta/90"
            >
              Новый шаблон
            </button>
          </div>
        )}
      </div>

      {showNew && (
        <NewTemplateModal
          onClose={() => setShowNew(false)}
          onCreate={(code, name) => void handleCreate(code, name)}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[14px] px-5 py-3 rounded-[8px] shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export function EmailTemplatesPage() {
  const [railModule, setRailModule] = useState<RailModule>("notifications");

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      <main
        className="absolute bg-mainbg"
        style={{ left: 85, top: 70, width: 1425, height: 1010 }}
      >
        <EmailTemplatesContent className="h-full" />
      </main>

      <PreviewPanel projectName={app?.name ?? "Lesovik"} />
    </div>
  );
}
