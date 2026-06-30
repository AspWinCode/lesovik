import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { cn } from "@/lib/cn";

type HistoryFilter = "all" | "add" | "update" | "delete";

const TABLES = ["Клиенты", "Заказы", "Продукты", "Пользователи", "Задачи"];

const MOCK_HISTORY = [
  { id: 1,  time: "15.06.2025 14:32", table: "Клиенты",      action: "add",    field: "Новая запись #48",   user: "admin@app.ru",  oldVal: "—",          newVal: "Клиент Омега" },
  { id: 2,  time: "15.06.2025 14:28", table: "Заказы",        action: "update", field: "Статус (Заказ #12)", user: "user1@app.ru",  oldVal: "В обработке", newVal: "Выполнен" },
  { id: 3,  time: "15.06.2025 13:55", table: "Продукты",      action: "update", field: "Цена (Продукт #7)",  user: "admin@app.ru",  oldVal: "1500 ₽",      newVal: "1750 ₽" },
  { id: 4,  time: "15.06.2025 13:41", table: "Клиенты",       action: "delete", field: "Запись #31",         user: "admin@app.ru",  oldVal: "Клиент Гамма", newVal: "—" },
  { id: 5,  time: "15.06.2025 13:20", table: "Задачи",        action: "add",    field: "Новая запись #22",   user: "user2@app.ru",  oldVal: "—",           newVal: "Задача: Отчёт" },
  { id: 6,  time: "15.06.2025 12:58", table: "Пользователи",  action: "update", field: "Email (user2)",      user: "admin@app.ru",  oldVal: "old@mail.ru", newVal: "user2@app.ru" },
  { id: 7,  time: "15.06.2025 12:44", table: "Заказы",        action: "add",    field: "Новая запись #56",   user: "user1@app.ru",  oldVal: "—",           newVal: "Заказ: 5 ед." },
  { id: 8,  time: "15.06.2025 12:30", table: "Продукты",      action: "delete", field: "Запись #3",          user: "admin@app.ru",  oldVal: "Продукт Бета", newVal: "—" },
  { id: 9,  time: "15.06.2025 11:55", table: "Клиенты",       action: "update", field: "Телефон (Клиент #5)", user: "user1@app.ru", oldVal: "+7 900 000",  newVal: "+7 900 111" },
  { id: 10, time: "15.06.2025 11:30", table: "Задачи",        action: "update", field: "Приоритет (Задача #8)", user: "user2@app.ru", oldVal: "Низкий",    newVal: "Высокий" },
  { id: 11, time: "15.06.2025 11:10", table: "Заказы",        action: "delete", field: "Запись #44",         user: "admin@app.ru",  oldVal: "Заказ #44",   newVal: "—" },
  { id: 12, time: "15.06.2025 10:47", table: "Пользователи",  action: "add",    field: "Новая запись",        user: "admin@app.ru",  oldVal: "—",           newVal: "newuser@app.ru" },
  { id: 13, time: "15.06.2025 10:22", table: "Продукты",      action: "update", field: "Название (Продукт #2)", user: "admin@app.ru", oldVal: "Продукт A", newVal: "Продукт Альфа" },
  { id: 14, time: "15.06.2025 09:58", table: "Клиенты",       action: "add",    field: "Новая запись #47",   user: "user2@app.ru",  oldVal: "—",           newVal: "Клиент Пси" },
  { id: 15, time: "15.06.2025 09:30", table: "Задачи",        action: "delete", field: "Запись #15",         user: "user1@app.ru",  oldVal: "Задача: Архив", newVal: "—" },
];

const ACTION_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  add:    { label: "Добавление", bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]" },
  update: { label: "Изменение",  bg: "bg-[#EBF4FF]", text: "text-cta" },
  delete: { label: "Удаление",   bg: "bg-[#FFEBEE]", text: "text-[#D32F2F]" },
};

export function DbHistoryPage() {
  const [railModule, setRailModule] = useState<RailModule>("data");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const ROWS_PER_PAGE = 10;

  const filtered = MOCK_HISTORY.filter((row) => {
    if (filter !== "all" && row.action !== filter) return false;
    if (activeTable && row.table !== activeTable) return false;
    if (search && !JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const pageRows = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} onCollapse={() => setNavCollapsed((v) => !v)} collapsed={navCollapsed} />

      {/* ── Sidebar ── */}
      {!navCollapsed && <aside
        className="absolute bg-white border-r border-cardbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 295, height: 1010 }}
      >
        <div className="px-5 py-4 border-b border-cardbg">
          <span className="text-[18px] font-semibold text-primary">История</span>
        </div>

        <div className="py-3 px-4">
          <p className="text-[12px] text-primary/50 mb-2 uppercase tracking-wide font-medium">Фильтр действий</p>
          <div className="flex flex-col gap-1">
            {([
              { id: "all",    label: "Все действия" },
              { id: "add",    label: "Добавления" },
              { id: "update", label: "Изменения" },
              { id: "delete", label: "Удаления" },
            ] as { id: HistoryFilter; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setFilter(id); setPage(1); }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors",
                  filter === id ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 px-4 border-t border-cardbg pt-3">
          <p className="text-[12px] text-primary/50 mb-2 uppercase tracking-wide font-medium">Таблицы</p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveTable(null); setPage(1); }}
              className={cn("w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors", activeTable === null ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg")}
            >
              Все таблицы
            </button>
            {TABLES.map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTable(t); setPage(1); }}
                className={cn("w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors", activeTable === t ? "bg-[#EBF4FF] text-cta font-medium" : "text-primary hover:bg-mainbg")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </aside>}

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto flex flex-col"
        style={{ left: navCollapsed ? 90 : 380, top: 70, width: navCollapsed ? 1830 : 1540, height: 1010, transition: "left 0.2s, width 0.2s" }}
      >
        <div className="px-8 py-6 bg-white border-b border-cardbg shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[22px] font-bold text-primary">История изменений базы данных</h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 border border-cardbg bg-white text-primary text-[14px] rounded-[6px] px-4 py-2 hover:border-cta hover:text-cta transition-colors">
                <ExportIcon className="w-4 h-4" />
                Экспорт CSV
              </button>
              <button
                disabled
                title="В разработке"
                className="flex items-center gap-2 border border-cardbg bg-white text-primary/40 text-[14px] rounded-[6px] px-4 py-2 cursor-not-allowed"
              >
                <TrashIcon className="w-4 h-4" />
                Очистить историю
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[400px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по истории…"
                className="w-full pl-9 pr-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary placeholder:text-primary/40 focus:outline-none focus:border-cta"
              />
            </div>
            <input
              type="date"
              className="px-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
            />
            <span className="text-primary/40 text-[14px]">—</span>
            <input
              type="date"
              className="px-3 py-2 text-[14px] rounded-[6px] border border-cardbg bg-mainbg text-primary focus:outline-none focus:border-cta"
            />
          </div>
        </div>

        <div className="flex-1 px-8 py-5">
          {/* Table */}
          <div className="bg-white rounded-[8px] border border-cardbg overflow-hidden">
            {/* Header */}
            <div className="grid border-b border-cardbg bg-[#F5F6F8]" style={{ gridTemplateColumns: "160px 120px 110px 220px 160px 1fr 1fr 60px" }}>
              {["Время", "Таблица", "Действие", "Поле / Запись", "Пользователь", "Было", "Стало", ""].map((h) => (
                <div key={h} className="px-3 py-2.5 text-[12px] font-semibold text-primary border-r last:border-r-0 border-cardbg">{h}</div>
              ))}
            </div>

            {pageRows.length === 0 && (
              <div className="py-12 text-center text-[14px] text-primary/40">Нет записей</div>
            )}

            {pageRows.map((row) => {
              const act = ACTION_LABELS[row.action];
              return (
                <div
                  key={row.id}
                  className="grid border-b border-cardbg last:border-b-0 hover:bg-mainbg transition-colors"
                  style={{ gridTemplateColumns: "160px 120px 110px 220px 160px 1fr 1fr 60px" }}
                >
                  <div className="px-3 py-2.5 text-[12px] text-primary/70 border-r border-cardbg">{row.time}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary border-r border-cardbg">{row.table}</div>
                  <div className="px-3 py-2.5 border-r border-cardbg">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-[20px]", act.bg, act.text)}>{act.label}</span>
                  </div>
                  <div className="px-3 py-2.5 text-[12px] text-primary border-r border-cardbg truncate">{row.field}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary/70 border-r border-cardbg">{row.user}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary/50 border-r border-cardbg truncate">{row.oldVal}</div>
                  <div className="px-3 py-2.5 text-[12px] text-primary border-r border-cardbg truncate">{row.newVal}</div>
                  <div className="px-3 py-2.5 flex items-center justify-center">
                    <button title="Откатить" className="w-7 h-7 flex items-center justify-center rounded-[6px] text-primary/40 hover:text-cta hover:bg-[#EBF4FF] transition-colors">
                      <RollbackIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <PaginationBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PaginationBtn key={n} onClick={() => setPage(n)} active={page === n}>{n}</PaginationBtn>
              ))}
              <PaginationBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PaginationBtn>
            </div>
          )}
        </div>
      </main>
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
function ExportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function RollbackIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" fill="none"><path d="M4 8a4 4 0 100 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M4 5l-2 2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
