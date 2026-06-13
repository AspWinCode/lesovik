import { useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { previewImport, importRecords, type ImportPreview, type ImportResult } from "@/shared/api/records";
import type { FieldRead } from "@/shared/api/entities";

/* ── Draggable CSV header chip ── */
function HeaderChip({ header, mapped }: { header: string; mapped: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `h::${header}` });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-2 h-[34px] px-3 rounded-[8px] border text-[13px] font-medium cursor-grab active:cursor-grabbing select-none touch-none transition-all",
        isDragging ? "opacity-0" : "",
        mapped
          ? "bg-cta/10 border-cta/40 text-cta"
          : "bg-white border-cardbg text-primary hover:border-cta/50"
      )}
    >
      <svg viewBox="0 0 12 16" fill="currentColor" className="w-2.5 h-3.5 opacity-40 shrink-0">
        <circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/>
        <circle cx="3" cy="8" r="1.2"/><circle cx="9" cy="8" r="1.2"/>
        <circle cx="3" cy="13" r="1.2"/><circle cx="9" cy="13" r="1.2"/>
      </svg>
      {header}
    </div>
  );
}

/* ── Field drop zone ── */
function FieldDropZone({
  field,
  mappedHeader,
  onClear,
}: {
  field: FieldRead;
  mappedHeader: string | null;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `f::${field.name}` });

  return (
    <div className="flex items-center gap-3">
      <div className="w-[180px] shrink-0">
        <span className="text-[13px] font-medium text-primary">{field.display_name}</span>
        <span className="text-[11px] text-primary/40 ml-1.5">{field.field_type}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 h-[36px] rounded-[8px] border-2 border-dashed flex items-center px-3 transition-all",
          isOver ? "border-cta bg-cta/5" : "border-cardbg",
          mappedHeader ? "border-solid border-cta/30 bg-cta/5" : ""
        )}
      >
        {mappedHeader ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[13px] text-cta font-medium">{mappedHeader}</span>
            <button
              onClick={onClear}
              className="text-primary/30 hover:text-mistake text-sm leading-none"
            >✕</button>
          </div>
        ) : (
          <span className="text-[12px] text-primary/30">
            {isOver ? "Отпустите здесь" : "Перетащите заголовок"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main modal
   ════════════════════════════════════════════════════════════════ */
export function ImportModal({
  appId,
  entityId,
  fields,
  onClose,
  onSuccess,
}: {
  appId: string;
  entityId: string;
  fields: FieldRead[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // fieldName → csvHeader
  const [activeHeader, setActiveHeader] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userFields = fields.filter((f) => !f.is_system);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /* inverse mapping: csvHeader → fieldName */
  const headerToField = Object.fromEntries(Object.entries(mapping).map(([f, h]) => [h, f]));

  async function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setMapping({});
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const prev = await previewImport(appId, entityId, f);
      setPreview(prev);
      // auto-map headers that match field names exactly
      const autoMap: Record<string, string> = {};
      for (const field of userFields) {
        const match = prev.headers.find(
          (h) => h.toLowerCase() === field.name.toLowerCase() || h.toLowerCase() === field.display_name.toLowerCase()
        );
        if (match) autoMap[field.name] = match;
      }
      setMapping(autoMap);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка чтения файла");
    } finally {
      setLoading(false);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("h::")) setActiveHeader(id.slice(3));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveHeader(null);
    const { active, over } = e;
    if (!over) return;
    const header = String(active.id).replace(/^h::/, "");
    const fieldName = String(over.id).replace(/^f::/, "");
    if (!fieldName) return;
    setMapping((prev) => {
      const next = { ...prev };
      // remove this header from any existing field
      for (const [fn, h] of Object.entries(next)) {
        if (h === header) delete next[fn];
      }
      next[fieldName] = header;
      return next;
    });
  }

  async function handleImport() {
    if (!file || !preview) return;
    // Build column_map: csvHeader → fieldName
    const colMap: Record<string, string> = {};
    for (const [fieldName, csvHeader] of Object.entries(mapping)) {
      colMap[csvHeader] = fieldName;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await importRecords(appId, entityId, file, colMap);
      setResult(res);
      if (res.created > 0) onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[16px] shadow-2xl w-[860px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-cardbg shrink-0">
          <h2 className="text-[20px] font-bold text-primary">Импорт данных</h2>
          <button onClick={onClose} className="text-primary/40 hover:text-primary text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* Step 1 — file pick */}
          {!preview && !result && (
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-full border-2 border-dashed border-cardbg rounded-[12px] p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-cta transition-colors"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <div className="text-[40px]">📂</div>
                <p className="text-[16px] font-semibold text-primary">Выберите или перетащите файл</p>
                <p className="text-[13px] text-primary/50">CSV или XLSX, до 50 МБ</p>
                {loading && <p className="text-[13px] text-cta">Читаем файл…</p>}
                {error && <p className="text-[13px] text-mistake">{error}</p>}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Step 2 — mapping */}
          {preview && !result && (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="flex flex-col gap-6">
                {/* File summary */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-primary">{file?.name}</p>
                    <p className="text-[13px] text-primary/50">{preview.total_rows} строк · {preview.headers.length} колонок</p>
                  </div>
                  <button onClick={() => { setPreview(null); setFile(null); }} className="text-[13px] text-cta hover:underline">
                    Выбрать другой файл
                  </button>
                </div>

                <div className="flex gap-6 items-start">
                  {/* Left: CSV headers */}
                  <div className="w-[220px] shrink-0">
                    <p className="text-[13px] font-semibold text-primary/60 mb-3 uppercase tracking-wide">Колонки файла</p>
                    <div className="flex flex-col gap-2">
                      {preview.headers.map((h) => (
                        <HeaderChip key={h} header={h} mapped={!!headerToField[h]} />
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center pt-10 text-primary/20">
                    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Right: entity fields as drop zones */}
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-primary/60 mb-3 uppercase tracking-wide">Поля таблицы</p>
                    <div className="flex flex-col gap-2">
                      {userFields.map((f) => (
                        <FieldDropZone
                          key={f.id}
                          field={f}
                          mappedHeader={mapping[f.name] ?? null}
                          onClear={() => setMapping((prev) => {
                            const next = { ...prev };
                            delete next[f.name];
                            return next;
                          })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample preview */}
                {preview.sample.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-primary/60 mb-2 uppercase tracking-wide">Предпросмотр (первые строки)</p>
                    <div className="overflow-x-auto border border-cardbg rounded-[8px]">
                      <table className="text-[12px] w-full">
                        <thead>
                          <tr className="bg-mainbg">
                            {preview.headers.map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-medium text-primary/60 whitespace-nowrap border-b border-cardbg">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.sample.map((row, i) => (
                            <tr key={i} className="border-b border-cardbg last:border-0">
                              {preview.headers.map((h) => (
                                <td key={h} className="px-3 py-1.5 text-primary/80 whitespace-nowrap">{row[h] ?? "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {error && <div className="px-4 py-2 bg-[#FDECEC] text-mistake text-[13px] rounded-[8px]">{error}</div>}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeHeader && (
                  <div className="flex items-center gap-2 h-[34px] px-3 rounded-[8px] border border-cta bg-cta text-white text-[13px] font-medium shadow-lg">
                    {activeHeader}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* Step 3 — result */}
          {result && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-[48px]">{result.errors.length === 0 ? "✅" : "⚠️"}</div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-[480px]">
                {[
                  { label: "Всего строк", value: result.total, color: "text-primary" },
                  { label: "Создано", value: result.created, color: "text-cta" },
                  { label: "Пропущено / ошибки", value: result.skipped + result.errors.length, color: "text-mistake" },
                ].map((s) => (
                  <div key={s.label} className="bg-mainbg rounded-[12px] p-4 text-center">
                    <p className={cn("text-[32px] font-bold", s.color)}>{s.value}</p>
                    <p className="text-[12px] text-primary/50 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <div className="w-full">
                  <p className="text-[13px] font-semibold text-primary/60 mb-2">Ошибки ({result.errors.length})</p>
                  <div className="max-h-[200px] overflow-y-auto border border-cardbg rounded-[8px]">
                    {result.errors.slice(0, 20).map((e, i) => (
                      <div key={i} className="px-3 py-2 text-[12px] border-b border-cardbg last:border-0">
                        <span className="font-medium text-primary/60">Строка {e.row}:</span>{" "}
                        <span className="text-mistake">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-cardbg shrink-0">
          <p className="text-[12px] text-primary/40">
            {preview && !result
              ? `Сопоставлено: ${Object.keys(mapping).length} из ${userFields.length} полей`
              : ""}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="h-[38px] px-5 rounded-[8px] border border-cardbg text-[14px] text-primary hover:bg-mainbg">
              {result ? "Закрыть" : "Отмена"}
            </button>
            {preview && !result && (
              <button
                onClick={handleImport}
                disabled={loading || Object.keys(mapping).length === 0}
                className="h-[38px] px-6 rounded-[8px] bg-cta text-white text-[14px] font-medium hover:bg-cta/90 disabled:opacity-50"
              >
                {loading ? "Импортируем…" : `Импортировать ${preview.total_rows} строк`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
