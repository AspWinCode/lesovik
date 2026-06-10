import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";

type ColType = "Число" | "Текст" | "Приложение" | "Дата" | "Изображение" | "Список";

interface TableColumn {
  id: string;
  name: string;
  type: ColType;
  isKey: boolean;
  isLabel: boolean;
  formula: string;
}

interface DataSource {
  id: string;
  name: string;
  hasChildren?: boolean;
  children?: string[];
}

const SOURCES: DataSource[] = [
  { id: "analytics",  name: "Аналитика" },
  { id: "audit",      name: "Аудит",                hasChildren: true },
  { id: "main-menu",  name: "Главное меню",          hasChildren: true },
  { id: "year",       name: "Год" },
  { id: "report-d1",  name: "Детали отчета (1)",     hasChildren: true },
  { id: "report-d",   name: "Детали отчета" },
  { id: "journal-b1", name: "Журнал бракержа (1)",   hasChildren: true },
  { id: "journal-b2", name: "Журнал бракержа (2)",   hasChildren: true },
  { id: "journal-p",  name: "Журнал поступлений fi..." },
];

const COLUMNS_BY_SOURCE: Record<string, TableColumn[]> = {
  analytics: [
    { id: "1", name: "_RowNumber", type: "Число",      isKey: true,  isLabel: false, formula: "=" },
    { id: "2", name: "Row ID",     type: "Текст",      isKey: true,  isLabel: false, formula: "=" },
    { id: "3", name: "Модуль",     type: "Текст",      isKey: false, isLabel: false, formula: "=" },
    { id: "4", name: "view",       type: "Приложение", isKey: false, isLabel: false, formula: "=" },
  ],
  audit: [
    { id: "1", name: "_RowNumber", type: "Число",  isKey: true,  isLabel: false, formula: "=" },
    { id: "2", name: "Row ID",     type: "Текст",  isKey: true,  isLabel: false, formula: "=" },
    { id: "3", name: "Действие",   type: "Текст",  isKey: false, isLabel: true,  formula: "=" },
    { id: "4", name: "Дата",       type: "Дата",   isKey: false, isLabel: false, formula: "=" },
    { id: "5", name: "Пользоват.", type: "Текст",  isKey: false, isLabel: false, formula: "=" },
  ],
};

const COL_TYPES: ColType[] = ["Число", "Текст", "Приложение", "Дата", "Изображение", "Список"];

export function DataSchemaPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [activeSource, setActiveSource] = useState("analytics");

  const source = SOURCES.find((s) => s.id === activeSource);
  const columns = COLUMNS_BY_SOURCE[activeSource] ?? COLUMNS_BY_SOURCE["analytics"];

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sources sidebar ── */}
      <aside
        className="absolute bg-white overflow-y-auto border-r border-cardbg"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cardbg">
          <span className="text-[17px] font-semibold text-primary">Источники</span>
          <div className="flex items-center gap-2">
            <button className="text-primary/50 hover:text-primary">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a4 4 0 100 8 4 4 0 000-8zM0 6a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 010 6z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="text-cta hover:text-active">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </button>
            <button className="text-primary/50 hover:text-primary">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Source list */}
        <nav className="py-1">
          {SOURCES.map((src) => (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2 text-[14px] transition-colors",
                activeSource === src.id
                  ? "bg-[#EBF4FF] text-cta font-medium"
                  : "text-primary hover:bg-mainbg"
              )}
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-primary/40" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="8" cy="4" rx="5" ry="2" />
                  <path d="M3 4v8c0 1.1 2.24 2 5 2s5-.9 5-2V4" />
                  <path d="M3 8c0 1.1 2.24 2 5 2s5-.9 5-2" />
                </svg>
                <span className="truncate max-w-[160px]">{src.name}</span>
              </div>
              {src.hasChildren && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40" fill="currentColor">
                  <path d="M4 2l4 4-4 4V2z" />
                </svg>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom options */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-cardbg">
          <button className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-primary/60 hover:bg-mainbg transition-colors">
            <span className="font-semibold tracking-wide">ОПЦИИ</span>
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
              <path d="M2 4l4 4 4-4H2z" />
            </svg>
          </button>
          <button className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-primary/60 hover:bg-mainbg transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
              <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
            </svg>
            Пользовательские настройки
          </button>
        </div>
      </aside>

      {/* ── Column editor ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 380, top: 70, width: 945, height: 1010 }}
      >
        {/* Content header */}
        <div className="px-6 py-4 bg-white border-b border-cardbg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[18px] font-bold text-primary">Таблица: {source?.name ?? "—"}</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-cta text-white text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-active transition-colors">
                Перейти к исх. коду
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-mainbg text-primary/60">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 10V13a1 1 0 001 1h12a1 1 0 001-1v-3" /><path d="M8 1v9M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-mainbg text-primary/60">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 6A5 5 0 003 6v1H1l2 3 2-3H3V6a5 5 0 1010 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-mainbg text-cta">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-mainbg text-primary/60">
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-primary/60">
            <span>Источник: <strong className="text-primary font-medium">Задачи</strong></span>
            <span>Квалификатор: <strong className="text-primary font-medium">Ресурсы</strong></span>
            <span>Источник данных: <strong className="text-primary font-medium">Google</strong></span>
            <span>Тип источника: <strong className="text-primary font-medium">Таблицы</strong></span>
            <span>Столбцы: <strong className="text-primary font-medium">{columns.length}</strong></span>
          </div>
        </div>

        {/* Column table */}
        <div className="px-6 py-4">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="border-b-2 border-cardbg">
                <th className="text-left font-semibold text-primary py-2 pr-4 w-[240px]">Название</th>
                <th className="text-left font-semibold text-primary py-2 pr-4 w-[180px]">Тип</th>
                <th className="text-center font-semibold text-primary py-2 pr-4 w-[60px]">Ключ</th>
                <th className="text-center font-semibold text-primary py-2 pr-4 w-[60px]">Метка</th>
                <th className="text-left font-semibold text-primary py-2">Формула</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.id} className="border-b border-cardbg hover:bg-white/60 transition-colors">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 text-primary/40">
                        <ColTypeIconSmall type={col.type} />
                      </span>
                      <span className="text-primary">{col.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="relative">
                      <select
                        defaultValue={col.type}
                        className="w-full bg-white border border-cardbg rounded-[6px] px-2 py-1 text-[13px] text-primary appearance-none focus:outline-none focus:border-cta pr-6"
                      >
                        {COL_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
                        <path d="M2 4l4 4 4-4H2z" />
                      </svg>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <button className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto",
                      col.isKey ? "border-cta bg-cta" : "border-cardbg"
                    )}>
                      {col.isKey && (
                        <svg viewBox="0 0 10 10" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <button className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto",
                      col.isLabel ? "border-cta bg-cta" : "border-cardbg"
                    )}>
                      {col.isLabel && (
                        <svg viewBox="0 0 10 10" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="py-2">
                    <input
                      defaultValue={col.formula}
                      className="w-full bg-white border border-cardbg rounded-[6px] px-2 py-1 text-[13px] text-primary focus:outline-none focus:border-cta"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="mt-4 flex items-center gap-2 text-cta text-[14px] font-medium hover:underline">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            Добавить виртуальную колонку
          </button>
        </div>
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

function ColTypeIconSmall({ type }: { type: ColType }) {
  if (type === "Число") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2l-1 12M13 2l-1 12M2 6h12M2 10h12" strokeLinecap="round" />
    </svg>
  );
  if (type === "Приложение") return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="currentColor">
      <path d="M2 3a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm7 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V3zM2 10a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3zm7 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h10M3 8h7M3 11h5" strokeLinecap="round" />
    </svg>
  );
}
