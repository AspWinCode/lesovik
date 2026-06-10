import { useState } from "react";
import { cn } from "@/lib/cn";

type ViewMode = "grid" | "table";

interface Column {
  id: string;
  label: string;
  type: "id" | "text" | "number" | "unit" | "checkbox";
  width: number;
}

const TABLES = [
  "Сотрудники",
  "Операции",
  "Отчеты",
  "Детали отчета",
  "Copy of Детали отчета",
  "Необходимый минимум",
  "Аудит",
  "Популярные вопросы",
];

const COLUMNS: Column[] = [
  { id: "id",       label: "ID позиции",      type: "id",       width: 160 },
  { id: "name",     label: "Товар",            type: "text",     width: 280 },
  { id: "location", label: "Помещение товара", type: "text",     width: 220 },
  { id: "qty",      label: "Количество",       type: "number",   width: 120 },
  { id: "unit",     label: "Единица из...",    type: "unit",     width: 120 },
  { id: "min",      label: "Мин...",           type: "number",   width: 80  },
  { id: "hide",     label: "Скрыть",           type: "checkbox", width: 80  },
];

const MOCK_ROWS = Array.from({ length: 19 }, (_, i) => ({
  id: `*06Jgk8652sffwe`,
  name: "Брусника потертая с сахаром БСП 500 (гр)",
  location: "Цех готовой продукции",
  qty: 0,
  unit: i % 3 === 1 ? "Кр" : "Шт",
  min: 1000,
}));

export function DatabasePage() {
  const [activeTable, setActiveTable] = useState(0);
  const [viewMode,    setViewMode]    = useState<ViewMode>("grid");
  const [activeRow,   setActiveRow]   = useState<number | null>(0);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top mini navbar ── */}
      <header className="h-[50px] shrink-0 flex items-center px-6 gap-4 bg-white border-b border-cardbg">
        <span className="text-[18px] font-bold text-primary">OI</span>
        <span className="text-[16px] text-primary font-medium">Дикая Сибирь</span>
      </header>

      {/* ── Table tabs ── */}
      <div className="h-[44px] shrink-0 flex items-center border-b border-cardbg bg-white overflow-x-hidden">
        {TABLES.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTable(i)}
            className={cn(
              "h-full px-5 text-[14px] whitespace-nowrap border-b-2 transition-colors",
              activeTable === i
                ? "border-cta text-cta font-medium"
                : "border-transparent text-primary/70 hover:text-primary"
            )}
          >
            {t}
          </button>
        ))}
        <button className="h-full px-5 text-[14px] text-cta flex items-center gap-1 hover:bg-mainbg transition-colors whitespace-nowrap">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Новая таблица
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="h-[46px] shrink-0 flex items-center gap-4 px-4 bg-white border-b border-cardbg">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <ToolButton icon={<SearchIcon />} />
          <ToolButton icon={<PlusIcon />} />
          <ToolButton icon={<HistoryIcon />} />
        </div>

        <div className="h-5 w-px bg-cardbg" />

        <DropdownButton label="Сохранённый вид 1" />

        <div className="h-5 w-px bg-cardbg" />

        {/* View toggles */}
        <div className="flex items-center gap-1 bg-mainbg rounded-[6px] p-[3px]">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3 py-1 text-[13px] rounded-[4px] transition-colors",
              viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-primary/60 hover:text-primary"
            )}
          >
            Сетка
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "px-3 py-1 text-[13px] rounded-[4px] transition-colors",
              viewMode === "table" ? "bg-white text-primary shadow-sm" : "text-primary/60 hover:text-primary"
            )}
          >
            Таблица
          </button>
        </div>

        <div className="h-5 w-px bg-cardbg" />

        <DropdownButton icon={<ConfigIcon />}    label="Конфигурация" />
        <DropdownButton icon={<GroupIcon />}     label="Группа" />
        <DropdownButton icon={<FilterIcon />}    label="Фильтр" />
        <DropdownButton icon={<SortIcon />}      label="Сортировка" />
        <DropdownButton icon={<DensityIcon />}   label="Плотность" />

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <DropdownButton icon={<ColumnsIcon />} label="Столбцы" />
          <DropdownButton icon={<AppIcon />}     label="Приложение" />
        </div>
      </div>

      {/* ── Data table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-white border-b border-cardbg sticky top-0 z-10">
              {/* Row number */}
              <th className="w-10 min-w-[40px] border-r border-cardbg" />
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width, minWidth: col.width }}
                  className="border-r border-cardbg px-3 py-2 text-left font-medium text-primary whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <ColTypeIcon type={col.type} />
                    <span>{col.label}</span>
                    <SortArrows />
                  </div>
                </th>
              ))}
              {/* Add column */}
              <th className="px-4 py-2 text-left">
                <button className="flex items-center gap-1 text-cta text-[13px] font-medium hover:underline whitespace-nowrap">
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                  Добавить колонку
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {MOCK_ROWS.map((row, i) => (
              <tr
                key={i}
                onClick={() => setActiveRow(i)}
                className={cn(
                  "border-b border-cardbg cursor-pointer",
                  activeRow === i ? "bg-[#EBF4FF]" : "hover:bg-mainbg/60"
                )}
              >
                <td className="w-10 border-r border-cardbg px-2 text-center text-primary/50 select-none">
                  {i + 1}
                </td>
                <td className="border-r border-cardbg px-3 py-[6px]">
                  {activeRow === i ? (
                    <input
                      defaultValue={row.id}
                      className="w-full bg-transparent outline-none text-primary"
                      autoFocus={i === 0}
                    />
                  ) : (
                    <span className="text-primary">{row.id}</span>
                  )}
                </td>
                <td className="border-r border-cardbg px-3 py-[6px] text-cta">{row.name}</td>
                <td className="border-r border-cardbg px-3 py-[6px] text-primary">{row.location}</td>
                <td className="border-r border-cardbg px-3 py-[6px] text-primary text-right">{row.qty}</td>
                <td className="border-r border-cardbg px-3 py-[6px]">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded-[4px] text-[12px] font-medium",
                    row.unit === "Шт" ? "bg-[#EBF4FF] text-cta" : "bg-[#FFF3E0] text-[#E65100]"
                  )}>
                    {row.unit}
                  </span>
                </td>
                <td className="border-r border-cardbg px-3 py-[6px] text-primary text-right">{row.min}</td>
                <td className="border-r border-cardbg px-3 py-[6px] text-center">
                  <span className="w-5 h-5 rounded-full border-2 border-cardbg inline-block" />
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <footer className="h-[44px] shrink-0 flex items-center justify-end gap-4 px-6 bg-white border-t border-cardbg">
        <span className="text-[13px] text-primary/60">Строки на таблице:</span>
        <DropdownButton label="100" small />
        <span className="text-[13px] text-primary/60">1 из 3</span>
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-mainbg text-primary/60 hover:text-primary transition-colors">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-mainbg text-primary/60 hover:text-primary transition-colors">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </footer>
    </div>
  );
}

/* ── Small helpers ── */
function ToolButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-mainbg text-primary/60 hover:text-primary transition-colors">
      {icon}
    </button>
  );
}

function DropdownButton({ icon, label, small }: { icon?: React.ReactNode; label: string; small?: boolean }) {
  return (
    <button className={cn(
      "flex items-center gap-1.5 rounded-[6px] hover:bg-mainbg transition-colors text-primary/70 hover:text-primary",
      small ? "px-2 py-1 text-[13px]" : "px-3 py-1.5 text-[13px]"
    )}>
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      {label}
      <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40" fill="currentColor">
        <path d="M2 4l4 4 4-4H2z" />
      </svg>
    </button>
  );
}

function ColTypeIcon({ type }: { type: Column["type"] }) {
  if (type === "id") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M8 5v6M6 7l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "number") return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2l-1 12M13 2l-1 12M2 6h12M2 10h12" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-primary/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 5h10M3 8h7M3 11h5" strokeLinecap="round" />
    </svg>
  );
}

function SortArrows() {
  return (
    <svg viewBox="0 0 12 16" className="w-2.5 h-3 text-primary/30 ml-0.5" fill="currentColor">
      <path d="M6 1l3 4H3l3-4zM6 15l-3-4h6l-3 4z" />
    </svg>
  );
}

/* ── Toolbar icons ── */
function SearchIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>; }
function PlusIcon()    { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12" strokeLinecap="round" /></svg>; }
function HistoryIcon() { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ConfigIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>; }
function GroupIcon()   { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="7" height="6" rx="1"/><rect x="11" y="3" width="7" height="6" rx="1"/><rect x="2" y="12" width="16" height="5" rx="1"/></svg>; }
function FilterIcon()  { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>; }
function SortIcon()    { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h14M5 10h10M7 15h6" strokeLinecap="round"/></svg>; }
function DensityIcon() { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h14M3 8h14M3 12h14M3 16h14" strokeLinecap="round"/></svg>; }
function ColumnsIcon() { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="7" height="14" rx="1"/><rect x="11" y="3" width="7" height="14" rx="1"/></svg>; }
function AppIcon()     { return <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z"/></svg>; }
