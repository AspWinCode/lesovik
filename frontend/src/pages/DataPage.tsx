import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";

const VIEWS = ["Все записи", "Активные", "Архивные", "По пользователям", "Аналитика"];

const MOCK_RECORDS = [
  { id: 1,  name: "Клиент Альфа",   status: "Активен",  date: "12.01.2025", user: "user1@app.ru" },
  { id: 2,  name: "Клиент Бета",    status: "Архив",    date: "08.01.2025", user: "admin@app.ru" },
  { id: 3,  name: "Клиент Гамма",   status: "Активен",  date: "05.01.2025", user: "user2@app.ru" },
  { id: 4,  name: "Клиент Дельта",  status: "Ожидание", date: "02.01.2025", user: "user1@app.ru" },
  { id: 5,  name: "Клиент Эпсилон", status: "Активен",  date: "29.12.2024", user: "admin@app.ru" },
  { id: 6,  name: "Клиент Дзета",   status: "Архив",    date: "27.12.2024", user: "user2@app.ru" },
  { id: 7,  name: "Клиент Эта",     status: "Активен",  date: "24.12.2024", user: "user1@app.ru" },
  { id: 8,  name: "Клиент Тета",    status: "Ожидание", date: "20.12.2024", user: "admin@app.ru" },
  { id: 9,  name: "Клиент Йота",    status: "Активен",  date: "18.12.2024", user: "user2@app.ru" },
  { id: 10, name: "Клиент Каппа",   status: "Архив",    date: "15.12.2024", user: "user1@app.ru" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  "Активен":  { bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]" },
  "Архив":    { bg: "bg-[#F5F6F8]", text: "text-primary/60" },
  "Ожидание": { bg: "bg-[#FFF8E1]", text: "text-[#E65100]" },
};

type EditingCell = { rowId: number; field: string } | null;

export function DataPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [activeView, setActiveView] = useState("Все записи");
  const [search, setSearch] = useState("");
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [cellValues, setCellValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const ROWS_PER_PAGE = 8;

  const filteredRecords = MOCK_RECORDS.filter((r) => {
    if (activeView === "Активные"      && r.status !== "Активен")  return false;
    if (activeView === "Архивные"      && r.status !== "Архив")    return false;
    if (activeView === "По пользователям") return true;
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const pageRows = filteredRecords.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  function cellKey(rowId: number, field: string) { return `${rowId}:${field}`; }
  function cellVal(rowId: number, field: string, fallback: string) {
    return cellValues[cellKey(rowId, field)] ?? fallback;
  }
  function handleCellChange(rowId: number, field: string, val: string) {
    setCellValues((prev) => ({ ...prev, [cellKey(rowId, field)]: val }));
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Sidebar ── */}
      <aside
        className="absolute bg-white border-r border-cardbg overflow-y-auto flex flex-col"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">Данные</span>
        </div>

        <nav className="flex-1 py-2">
          {VIEWS.map((view) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setPage(1); }}
              className={cn(
                "w-full flex items-center gap-2 text-left text-[14px] px-5 py-2.5 transition-colors",
                activeView === view
                  ? "bg-[#EBF4FF] text-cta font-medium"
                  : "text-primary hover:bg-mainbg"
              )}
            >
              <ViewIcon className="w-4 h-4 shrink-0" />
              {view}
            </button>
          ))}
        </nav>

        <div className="border-t border-cardbg p-3">
          <button className="w-full flex items-center justify-center gap-2 py-2 text-[14px] text-cta font-medium rounded-[6px] border border-dashed border-cta hover:bg-[#EBF4FF] transition-colors">
            <span className="text-[16px] leading-none">+</span>
            Создать представление
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto flex flex-col"
        style={{ left: 380, top: 70, width: 1255, height: 1010 }}
      >
        {/* Toolbar */}
        <div className="px-8 py-4 bg-white border-b border-cardbg shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[22px] font-bold text-primary">{activeView}</h1>
            <button className="flex items-center gap-2 bg-cta text-white text-[14px] font-medium rounded-[6px] px-4 py-2 hover:bg-active transition-colors">
              <span className="text-[16px] leading-none">+</span>
              Добавить запись
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск…"
                className="pl-9 pr-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary placeholder:text-primary/40 focus:outline-none focus:border-cta w-[260px]"
              />
            </div>
            {[
              { icon: <FilterIcon className="w-4 h-4" />, label: "Фильтр" },
              { icon: <SortIcon   className="w-4 h-4" />, label: "Сортировка" },
              { icon: <GroupIcon  className="w-4 h-4" />, label: "Группировка" },
            ].map(({ icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-2 px-3 py-2 text-[14px] text-primary rounded-[6px] border border-cardbg bg-white hover:border-cta hover:text-cta transition-colors"
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-8 py-5">
          {activeView === "Аналитика" ? (
            <AnalyticsPlaceholder />
          ) : (
            <>
              <div className="bg-white rounded-[8px] border border-cardbg overflow-hidden">
                {/* Header */}
                <div className="grid border-b border-cardbg bg-[#F5F6F8]" style={{ gridTemplateColumns: "60px 1fr 120px 120px 180px 60px" }}>
                  {["ID", "Название", "Статус", "Дата", "Пользователь", ""].map((h) => (
                    <div key={h} className="px-4 py-2.5 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{h}</div>
                  ))}
                </div>

                {pageRows.length === 0 && (
                  <div className="py-12 text-center text-[14px] text-primary/40">Нет записей</div>
                )}

                {pageRows.map((row) => {
                  const statusStyle = STATUS_STYLES[row.status] ?? { bg: "bg-mainbg", text: "text-primary" };
                  return (
                    <div
                      key={row.id}
                      className="grid border-b border-cardbg last:border-b-0 hover:bg-mainbg transition-colors"
                      style={{ gridTemplateColumns: "60px 1fr 120px 120px 180px 60px" }}
                    >
                      <div className="px-4 py-2.5 text-[13px] text-primary/50 border-r border-cardbg">{row.id}</div>

                      {/* Inline-editable: name */}
                      <div
                        className="px-4 py-2.5 text-[13px] text-primary border-r border-cardbg cursor-text"
                        onClick={() => setEditingCell({ rowId: row.id, field: "name" })}
                      >
                        {editingCell?.rowId === row.id && editingCell.field === "name" ? (
                          <input
                            autoFocus
                            value={cellVal(row.id, "name", row.name)}
                            onChange={(e) => handleCellChange(row.id, "name", e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            className="w-full bg-transparent outline-none border-b border-cta text-primary"
                          />
                        ) : (
                          cellVal(row.id, "name", row.name)
                        )}
                      </div>

                      {/* Status */}
                      <div className="px-4 py-2.5 border-r border-cardbg flex items-center">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[20px]", statusStyle.bg, statusStyle.text)}>
                          {cellVal(row.id, "status", row.status)}
                        </span>
                      </div>

                      {/* Inline-editable: date */}
                      <div
                        className="px-4 py-2.5 text-[13px] text-primary/70 border-r border-cardbg cursor-text"
                        onClick={() => setEditingCell({ rowId: row.id, field: "date" })}
                      >
                        {editingCell?.rowId === row.id && editingCell.field === "date" ? (
                          <input
                            autoFocus
                            value={cellVal(row.id, "date", row.date)}
                            onChange={(e) => handleCellChange(row.id, "date", e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            className="w-full bg-transparent outline-none border-b border-cta text-primary"
                          />
                        ) : (
                          cellVal(row.id, "date", row.date)
                        )}
                      </div>

                      <div className="px-4 py-2.5 text-[13px] text-primary/60 border-r border-cardbg">{row.user}</div>

                      <div className="px-2 py-2.5 flex items-center justify-center">
                        <button className="w-6 h-6 flex items-center justify-center rounded text-primary/30 hover:text-primary hover:bg-cardbg transition-colors">
                          <DotsIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[13px] text-primary/50">
                  Показано {pageRows.length} из {filteredRecords.length} записей
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <PaginationBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PaginationBtn>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <PaginationBtn key={n} onClick={() => setPage(n)} active={page === n}>{n}</PaginationBtn>
                    ))}
                    <PaginationBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PaginationBtn>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <PreviewPanel />
    </div>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="bg-white rounded-[8px] border border-cardbg p-8">
      <h2 className="text-[18px] font-bold text-primary mb-4">Аналитика</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Всего записей",  value: "10",    color: "text-primary" },
          { label: "Активных",       value: "5",     color: "text-[#2E7D32]" },
          { label: "В архиве",       value: "3",     color: "text-primary/50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-mainbg rounded-[8px] p-4 border border-cardbg">
            <p className="text-[13px] text-primary/60 mb-1">{label}</p>
            <p className={cn("text-[32px] font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>
      {/* Bar chart placeholder */}
      <div className="h-[200px] bg-mainbg rounded-[8px] border border-cardbg flex items-end gap-3 px-6 pb-4">
        {[60, 40, 80, 30, 70, 50, 90].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-cta rounded-t-[4px] opacity-80" style={{ height: `${h * 1.5}px` }} />
            <span className="text-[11px] text-primary/50">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaginationBtn({ children, onClick, disabled, active }: {
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
        active   ? "bg-cta text-white font-medium" :
        disabled ? "text-primary/30 cursor-not-allowed" :
        "text-primary hover:bg-white border border-cardbg"
      )}
    >
      {children}
    </button>
  );
}

/* ── Icons ── */
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" /><path d="M10.5 10.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" /></svg>;
}
function FilterIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function SortIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M2 4h8M2 8h5M2 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M13 3v10M11 11l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function GroupIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="1" y="10" width="14" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function ViewIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function DotsIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="4" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="12" r="1.2" /></svg>;
}
