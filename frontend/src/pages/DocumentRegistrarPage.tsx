import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import {
  useDocTypeConfigs, useUpdateDocTypeConfig,
  useFilingCases, useCreateFilingCase, useUpdateFilingCase, useDeleteFilingCase,
  useRegisterDocument, useRegistrations, useExportFilingCases,
} from "@/shared/hooks/useDocuments";
import type { DocType, DocTypeConfig, FilingCase } from "@/shared/api/documents";

type Section = "numbering" | "cases" | "registry";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  incoming: "Входящие",
  outgoing: "Исходящие",
  internal: "Внутренние",
};

export function DocumentRegistrarPage() {
  const [active, setActive] = useState<Section>("numbering");
  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const appId = app?.id ?? "";

  const NAV: { id: Section; label: string }[] = [
    { id: "numbering", label: "Нумерация документов" },
    { id: "cases", label: "Номенклатура дел" },
    { id: "registry", label: "Реестр документов" },
  ];

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />

      <aside className="absolute bg-white border-r border-cardbg overflow-y-auto" style={{ left: 0, top: 70, width: 280, height: 1010 }}>
        <div className="px-6 py-5 border-b border-cardbg">
          <h1 className="text-[18px] font-semibold text-primary">Регистратор документов</h1>
        </div>
        <nav className="py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                "w-full text-left px-6 py-3 text-[14px] transition-colors",
                active === item.id ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="absolute bg-mainbg overflow-y-auto" style={{ left: 280, top: 70, width: 1360, height: 1010 }}>
        {active === "numbering" && <NumberingSection appId={appId} />}
        {active === "cases" && <CasesSection appId={appId} />}
        {active === "registry" && <RegistrySection appId={appId} />}
      </main>

      <PreviewPanel projectName={app?.name ?? "Приложение"} />
    </div>
  );
}

/* ── Numbering config ── */
function NumberingSection({ appId }: { appId: string }) {
  const configsQ = useDocTypeConfigs(appId);
  const updateMut = useUpdateDocTypeConfig(appId);

  return (
    <div className="px-10 py-8 max-w-[820px]">
      <h2 className="text-[22px] font-bold text-primary mb-2">Нумерация документов</h2>
      <p className="text-[14px] text-primary/55 mb-6">
        Формат номера: <code className="bg-white px-1.5 py-0.5 rounded border border-cardbg">префикс[код отдела-][год[/месяц]]-порядковый№</code>. Пример по умолчанию: <b>ВХ-2026/04-0001</b>.
      </p>

      {configsQ.isLoading && <p className="text-[14px] text-primary/40">Загрузка…</p>}

      <div className="flex flex-col gap-4">
        {(configsQ.data ?? []).map((config) => (
          <DocTypeConfigCard
            key={config.doc_type}
            config={config}
            onSave={(body) => updateMut.mutate({ docType: config.doc_type, body })}
            saving={updateMut.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function DocTypeConfigCard({ config, onSave, saving }: {
  config: DocTypeConfig; onSave: (body: Partial<DocTypeConfig>) => void; saving: boolean;
}) {
  const [prefix, setPrefix] = useState(config.prefix);
  const [suffix, setSuffix] = useState(config.suffix);
  const [padding, setPadding] = useState(config.seq_padding);
  const [resetPeriod, setResetPeriod] = useState(config.reset_period);
  const [includeDept, setIncludeDept] = useState(config.include_department);

  const preview = (() => {
    const dept = includeDept ? "ОТД-" : "";
    const date = resetPeriod === "never" ? "" : resetPeriod === "monthly" ? "2026/04-" : "2026-";
    return `${prefix}${dept}${date}${"1".padStart(padding, "0")}${suffix}`;
  })();

  return (
    <div className="bg-white border border-cardbg rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-primary">{DOC_TYPE_LABELS[config.doc_type]}</p>
        <span className="text-[13px] font-mono text-cta bg-[#EBF4FF] px-2 py-1 rounded-[6px]">{preview}</span>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Префикс</label>
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Суффикс</label>
          <input value={suffix} onChange={(e) => setSuffix(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Разрядность №</label>
          <input type="number" min={1} max={10} value={padding} onChange={(e) => setPadding(Number(e.target.value) || 1)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Сброс счётчика</label>
          <select value={resetPeriod} onChange={(e) => setResetPeriod(e.target.value as DocTypeConfig["reset_period"])} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] bg-white">
            <option value="never">Никогда</option>
            <option value="yearly">Ежегодно</option>
            <option value="monthly">Ежемесячно</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={includeDept} onChange={(e) => setIncludeDept(e.target.checked)} className="w-[16px] h-[16px] accent-cta" />
          <span className="text-[13px] text-primary">Отдельный счётчик по коду подразделения</span>
        </label>
        <button
          onClick={() => onSave({ prefix, suffix, seq_padding: padding, reset_period: resetPeriod, include_department: includeDept })}
          disabled={saving}
          className="h-[32px] px-4 rounded-[8px] bg-cta text-white text-[13px] font-medium hover:bg-cta/90 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

/* ── Filing cases (номенклатура дел) ── */
function CasesSection({ appId }: { appId: string }) {
  const casesQ = useFilingCases(appId);
  const createMut = useCreateFilingCase(appId);
  const updateMut = useUpdateFilingCase(appId);
  const deleteMut = useDeleteFilingCase(appId);
  const exportMut = useExportFilingCases(appId);
  const [showCreate, setShowCreate] = useState(false);

  const cases = casesQ.data ?? [];
  const byId = new Map(cases.map((c) => [c.id, c]));

  function handleClose(c: FilingCase) {
    updateMut.mutate({ caseId: c.id, body: { status: "closed" } });
  }
  function handleDelete(c: FilingCase) {
    if (confirm(`Удалить дело «${c.index_code} — ${c.title}»?`)) deleteMut.mutate(c.id);
  }

  return (
    <div className="px-10 py-8 max-w-[900px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-primary mb-1">Номенклатура дел</h2>
          <p className="text-[14px] text-primary/55">Иерархический классификатор документов, сроки хранения и статус.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["csv", "xlsx", "pdf"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => exportMut.mutate(fmt)}
              className="h-[34px] px-3 rounded-[8px] border border-cardbg text-[13px] text-primary hover:bg-mainbg uppercase"
            >
              {fmt}
            </button>
          ))}
          <button onClick={() => setShowCreate(true)} className="h-[34px] px-4 rounded-[8px] bg-cta text-white text-[13px] font-medium hover:bg-cta/90">
            + Новое дело
          </button>
        </div>
      </div>

      {showCreate && (
        <CaseCreateForm
          cases={cases}
          onCancel={() => setShowCreate(false)}
          onCreate={(body) => { createMut.mutate(body, { onSuccess: () => setShowCreate(false) }); }}
          saving={createMut.isPending}
        />
      )}

      <div className="bg-white border border-cardbg rounded-[12px] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-primary/50 text-left border-b border-cardbg bg-mainbg">
              <th className="py-2 px-4 font-medium">Индекс</th>
              <th className="py-2 px-4 font-medium">Заголовок</th>
              <th className="py-2 px-4 font-medium">Родитель</th>
              <th className="py-2 px-4 font-medium">Срок хранения</th>
              <th className="py-2 px-4 font-medium">Закрыть до</th>
              <th className="py-2 px-4 font-medium">Статус</th>
              <th className="py-2 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-primary/40">Дел пока нет</td></tr>
            )}
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-cardbg/50 hover:bg-mainbg">
                <td className="py-2 px-4 font-mono text-primary">{c.index_code}</td>
                <td className="py-2 px-4 text-primary">{c.title}</td>
                <td className="py-2 px-4 text-primary/60">{c.parent_id ? byId.get(c.parent_id)?.index_code ?? "—" : "—"}</td>
                <td className="py-2 px-4 text-primary/60">{c.retention_years ? `${c.retention_years} лет` : "—"}</td>
                <td className="py-2 px-4 text-primary/60">{c.close_by ?? "—"}</td>
                <td className="py-2 px-4">
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-full",
                    c.status === "open" ? "bg-[#EBF9F0] text-[#2E7D32]" : c.status === "closed" ? "bg-mainbg text-primary/50" : "bg-[#FFF8E1] text-[#E65100]",
                  )}>
                    {c.status === "open" ? "Открыто" : c.status === "closed" ? "Закрыто" : "В архиве"}
                  </span>
                </td>
                <td className="py-2 px-4 text-right whitespace-nowrap">
                  {c.status === "open" && (
                    <button onClick={() => handleClose(c)} className="text-[12px] text-primary/60 hover:text-cta mr-3">Закрыть</button>
                  )}
                  <button onClick={() => handleDelete(c)} className="text-[12px] text-mistake hover:underline">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CaseCreateForm({ cases, onCancel, onCreate, saving }: {
  cases: FilingCase[]; onCancel: () => void; onCreate: (body: { index_code: string; title: string; parent_id?: string | null; retention_years?: number | null; close_by?: string | null }) => void; saving: boolean;
}) {
  const [indexCode, setIndexCode] = useState("");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState("");
  const [retentionYears, setRetentionYears] = useState("");
  const [closeBy, setCloseBy] = useState("");

  return (
    <div className="bg-white border border-cardbg rounded-[12px] p-5 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Индекс дела</label>
          <input value={indexCode} onChange={(e) => setIndexCode(e.target.value)} placeholder="01-05" className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Заголовок</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Родительское дело</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] bg-white">
            <option value="">— нет —</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.index_code} — {c.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Срок хранения (лет)</label>
          <input type="number" min={1} value={retentionYears} onChange={(e) => setRetentionYears(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
        <div>
          <label className="text-[12px] text-primary/50 block mb-1">Автозакрытие после (дата)</label>
          <input type="date" value={closeBy} onChange={(e) => setCloseBy(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCreate({
            index_code: indexCode, title,
            parent_id: parentId || null,
            retention_years: retentionYears ? Number(retentionYears) : null,
            close_by: closeBy || null,
          })}
          disabled={saving || !indexCode || !title}
          className="h-[34px] px-4 rounded-[8px] bg-cta text-white text-[13px] font-medium hover:bg-cta/90 disabled:opacity-50"
        >
          {saving ? "Создание…" : "Создать"}
        </button>
        <button onClick={onCancel} className="h-[34px] px-4 rounded-[8px] border border-cardbg text-[13px] text-primary hover:bg-mainbg">Отмена</button>
      </div>
    </div>
  );
}

/* ── Document registry ── */
function RegistrySection({ appId }: { appId: string }) {
  const registrationsQ = useRegistrations(appId);
  const registerMut = useRegisterDocument(appId);
  const casesQ = useFilingCases(appId);
  const [showForm, setShowForm] = useState(false);

  const [entityId, setEntityId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [docType, setDocType] = useState<DocType>("incoming");
  const [department, setDepartment] = useState("");
  const [filingCaseId, setFilingCaseId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    setResult(null);
    try {
      const reg = await registerMut.mutateAsync({
        entity_id: entityId, record_id: recordId, doc_type: docType,
        department_code: department || null, filing_case_id: filingCaseId || null,
      });
      setResult(reg.registration_no);
      setEntityId(""); setRecordId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось зарегистрировать документ");
    }
  }

  return (
    <div className="px-10 py-8 max-w-[1000px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-primary mb-1">Реестр документов</h2>
          <p className="text-[14px] text-primary/55">Присвоенные регистрационные номера по всем таблицам приложения.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="h-[34px] px-4 rounded-[8px] bg-cta text-white text-[13px] font-medium hover:bg-cta/90">
          {showForm ? "Скрыть форму" : "+ Зарегистрировать документ"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-cardbg rounded-[12px] p-5 mb-5">
          <p className="text-[12px] text-primary/50 mb-3">
            ID таблицы и записи можно скопировать из адресной строки конструктора данных (basic-режим — без визуального выбора записи).
          </p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[12px] text-primary/50 block mb-1">ID таблицы (entity_id)</label>
              <input value={entityId} onChange={(e) => setEntityId(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] font-mono" />
            </div>
            <div>
              <label className="text-[12px] text-primary/50 block mb-1">ID записи (record_id)</label>
              <input value={recordId} onChange={(e) => setRecordId(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] font-mono" />
            </div>
            <div>
              <label className="text-[12px] text-primary/50 block mb-1">Тип документа</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] bg-white">
                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((dt) => <option key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-primary/50 block mb-1">Код подразделения (опц.)</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px]" />
            </div>
            <div>
              <label className="text-[12px] text-primary/50 block mb-1">Дело (опц.)</label>
              <select value={filingCaseId} onChange={(e) => setFilingCaseId(e.target.value)} className="w-full h-[34px] px-2 rounded-[6px] border border-cardbg text-[13px] bg-white">
                <option value="">— нет —</option>
                {(casesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.index_code} — {c.title}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleRegister}
            disabled={registerMut.isPending || !entityId || !recordId}
            className="h-[34px] px-4 rounded-[8px] bg-cta text-white text-[13px] font-medium hover:bg-cta/90 disabled:opacity-50"
          >
            {registerMut.isPending ? "Регистрация…" : "Присвоить номер"}
          </button>
          {result && <span className="ml-3 text-[13px] text-[#2E7D32] font-mono">Присвоен номер: {result}</span>}
          {error && <div className="mt-2 px-3 py-2 bg-[#FDECEC] text-mistake text-[13px] rounded-[8px]">{error}</div>}
        </div>
      )}

      <div className="bg-white border border-cardbg rounded-[12px] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-primary/50 text-left border-b border-cardbg bg-mainbg">
              <th className="py-2 px-4 font-medium">№</th>
              <th className="py-2 px-4 font-medium">Тип</th>
              <th className="py-2 px-4 font-medium">Отдел</th>
              <th className="py-2 px-4 font-medium">Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {(registrationsQ.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-primary/40">Документов пока не зарегистрировано</td></tr>
            )}
            {(registrationsQ.data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-cardbg/50 hover:bg-mainbg">
                <td className="py-2 px-4 font-mono text-primary">{r.registration_no}</td>
                <td className="py-2 px-4 text-primary/70">{DOC_TYPE_LABELS[r.doc_type]}</td>
                <td className="py-2 px-4 text-primary/60">{r.department_code ?? "—"}</td>
                <td className="py-2 px-4 text-primary/60">{new Date(r.registered_at).toLocaleString("ru")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
