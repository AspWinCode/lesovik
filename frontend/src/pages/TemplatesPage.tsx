import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type SidebarTab } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";

interface Template {
  id: string;
  name: string;
  desc: string;
  color: string;
  emoji: string;
}

const TEMPLATES: Template[] = [
  { id: "survey",     name: "Простой опрос",              desc: "Базовая структура приложения для создания опросов или форм.",                           color: "#EBF4FF", emoji: "📋" },
  { id: "inventory",  name: "Инвентаризация",              desc: "Обновляйте инвентарь и контролируйте уровни",                                           color: "#E8F5E9", emoji: "📦" },
  { id: "shifts",     name: "Управление сменой",           desc: "Инструмент управления сменой",                                                          color: "#FFF8E1", emoji: "📅" },
  { id: "marketing",  name: "Маркетинговые проекты",       desc: "Отслеживайте этапы и бюджеты маркетинговых кампаний",                                   color: "#FCE4EC", emoji: "📊" },
  { id: "delivery",   name: "Доставка",                   desc: "Отслеживайте статус доставки заказа и отправляйте клиентам обновления.",                 color: "#FFF3E0", emoji: "🚚" },
  { id: "tasks",      name: "Диспетчер задач",             desc: "Отслеживайте разовые и повторяющиеся задачи на мобильном устройстве.",                  color: "#E8F5E9", emoji: "✅" },
  { id: "visits",     name: "Посещаемость",                desc: "Это приложение для отслеживания посещаемости, которое помогает вести учёт.",             color: "#EBF4FF", emoji: "👥" },
  { id: "expenses",   name: "Расходы клиента",             desc: "Отслеживайте бизнес-расходы и систематизируйте их по клиентам.",                        color: "#F3E5F5", emoji: "💳" },
  { id: "assets",     name: "Активы объекта",              desc: "Отслеживание активов компании по всем объектам.",                                       color: "#E0F7FA", emoji: "🏢" },
  { id: "retail",     name: "Управление розничной торговлей", desc: "Управляйте розничными операциями, запасами и продажами.",                            color: "#FFF8E1", emoji: "🏪" },
  { id: "portal",     name: "Портал ресурсов",             desc: "Единый портал для доступа к корпоративным ресурсам и документам.",                      color: "#E8F5E9", emoji: "🗂️" },
  { id: "visitors",   name: "Регистрация посетителей",     desc: "Автоматизируйте регистрацию посетителей и управляйте пропусками.",                      color: "#EBF4FF", emoji: "🪪" },
  { id: "inspection", name: "Инспекция объекта",           desc: "Проводите проверки объектов и фиксируйте результаты.",                                  color: "#FCE4EC", emoji: "🔍" },
  { id: "hr",         name: "Кадровый учёт",               desc: "Управляйте данными сотрудников и отслеживайте кадровые изменения.",                     color: "#F3E5F5", emoji: "👤" },
  { id: "orders",     name: "Заказы",                     desc: "Полный цикл управления заказами от создания до доставки.",                               color: "#E0F7FA", emoji: "📝" },
];

const CATEGORIES = ["Все", "Бизнес", "Управление", "Инвентаризация", "Кадры", "Финансы"];
const FUNCTIONS  = ["Все", "Отслеживание", "Управление", "Анализ", "Уведомления"];
const FEATURES   = ["Все", "Мобильное", "Веб", "Офлайн"];
const COMPLEXITIES = ["Все", "Простой", "Средний", "Сложный"];

export function TemplatesPage() {
  const [sidebarTab,  setSidebarTab]  = useState<SidebarTab>("templates");
  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("Все");
  const [funcFilter,  setFuncFilter]  = useState("Все");
  const [feature,     setFeature]     = useState("Все");
  const [complexity,  setComplexity]  = useState("Все");

  const filtered = TEMPLATES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <Sidebar active={sidebarTab} onChange={setSidebarTab} />

      {/* Main content */}
      <main
        className="absolute top-[70px] overflow-y-auto bg-white"
        style={{ left: 280, width: 1640, height: 1010 }}
      >
        <div className="px-10 py-8">
          <h1 className="text-[32px] font-bold text-primary mb-2">Шаблоны</h1>
          <p className="text-[15px] text-primary/60 mb-6 max-w-[900px]">
            Изучите библиотеку распространённых вариантов использования приложений, которые можно скопировать и настроить
            или использовать в качестве источника вдохновения для вашего проекта.
          </p>

          {/* Search + filters */}
          <div className="flex items-center gap-4 mb-8">
            {/* Search bar */}
            <div className="flex items-center gap-3 bg-mainbg rounded-[30px] px-5 h-[42px] w-[380px]">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-primary/50 shrink-0" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск пользователей или доменов"
                className="flex-1 bg-transparent text-[14px] text-primary outline-none"
              />
            </div>

            {/* Filter dropdowns */}
            <FilterDropdown label="Категория" options={CATEGORIES} value={category} onChange={setCategory} />
            <FilterDropdown label="Функции"   options={FUNCTIONS}   value={funcFilter} onChange={setFuncFilter} />
            <FilterDropdown label="Особенности" options={FEATURES}   value={feature}   onChange={setFeature} />
            <FilterDropdown label="Сложность"  options={COMPLEXITIES} value={complexity} onChange={setComplexity} />
          </div>

          {/* Template cards grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-40 text-[16px] text-primary/50">
              По вашему запросу ничего не найдено
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Template card ── */
function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="border border-cardbg rounded-[12px] overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-[120px] flex items-center justify-center text-[48px]"
        style={{ backgroundColor: template.color }}
      >
        {template.emoji}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-cta mb-1 hover:underline cursor-pointer">
          {template.name}
        </h3>
        <p className="text-[13px] text-primary/60 mb-4 line-clamp-2">{template.desc}</p>
        <div className="flex items-center gap-3">
          <button className="border border-cta text-cta text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-[#EBF4FF] transition-colors">
            Предпросмотр
          </button>
          <button className="bg-cta text-white text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-active transition-colors">
            Копировать
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Filter dropdown ── */
function FilterDropdown({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none border rounded-[20px] px-4 py-2 pr-8 text-[13px] focus:outline-none transition-colors cursor-pointer",
          value !== "Все"
            ? "border-cta text-cta bg-[#EBF4FF]"
            : "border-cardbg text-primary bg-white hover:border-cta/40"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "Все" ? label : o}</option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="currentColor">
        <path d="M2 4l4 4 4-4H2z" />
      </svg>
    </div>
  );
}
