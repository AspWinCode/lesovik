import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type SidebarTab } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";
import { useCreateApp } from "@/shared/hooks/useApps";

interface Template {
  id: string;
  name: string;
  desc: string;
  color: string;
  emoji: string;
  category: string;
  functions: string[];
  features: string[];
  complexity: string;
}

const TEMPLATES: Template[] = [
  { id: "survey",     name: "Простой опрос",              desc: "Базовая структура приложения для создания опросов или форм.",                           color: "#EBF4FF", emoji: "📋", category: "Бизнес",         functions: ["Отслеживание"],              features: ["Веб", "Мобильное"],   complexity: "Простой" },
  { id: "inventory",  name: "Инвентаризация",              desc: "Обновляйте инвентарь и контролируйте уровни",                                           color: "#E8F5E9", emoji: "📦", category: "Инвентаризация", functions: ["Управление", "Отслеживание"], features: ["Мобильное", "Офлайн"], complexity: "Средний" },
  { id: "shifts",     name: "Управление сменой",           desc: "Инструмент управления сменой",                                                          color: "#FFF8E1", emoji: "📅", category: "Кадры",          functions: ["Управление", "Уведомления"], features: ["Мобильное"],           complexity: "Средний" },
  { id: "marketing",  name: "Маркетинговые проекты",       desc: "Отслеживайте этапы и бюджеты маркетинговых кампаний",                                   color: "#FCE4EC", emoji: "📊", category: "Управление",     functions: ["Анализ", "Отслеживание"],    features: ["Веб"],                complexity: "Сложный" },
  { id: "delivery",   name: "Доставка",                   desc: "Отслеживайте статус доставки заказа и отправляйте клиентам обновления.",                 color: "#FFF3E0", emoji: "🚚", category: "Управление",     functions: ["Отслеживание", "Уведомления"], features: ["Мобильное", "Офлайн"], complexity: "Средний" },
  { id: "tasks",      name: "Диспетчер задач",             desc: "Отслеживайте разовые и повторяющиеся задачи на мобильном устройстве.",                  color: "#E8F5E9", emoji: "✅", category: "Управление",     functions: ["Управление", "Уведомления"], features: ["Мобильное"],           complexity: "Простой" },
  { id: "visits",     name: "Посещаемость",                desc: "Это приложение для отслеживания посещаемости, которое помогает вести учёт.",             color: "#EBF4FF", emoji: "👥", category: "Кадры",          functions: ["Отслеживание"],              features: ["Мобильное"],           complexity: "Простой" },
  { id: "expenses",   name: "Расходы клиента",             desc: "Отслеживайте бизнес-расходы и систематизируйте их по клиентам.",                        color: "#F3E5F5", emoji: "💳", category: "Финансы",        functions: ["Анализ", "Отслеживание"],    features: ["Веб"],                complexity: "Средний" },
  { id: "assets",     name: "Активы объекта",              desc: "Отслеживание активов компании по всем объектам.",                                       color: "#E0F7FA", emoji: "🏢", category: "Инвентаризация", functions: ["Управление", "Отслеживание"], features: ["Мобильное", "Офлайн"], complexity: "Средний" },
  { id: "retail",     name: "Управление розничной торговлей", desc: "Управляйте розничными операциями, запасами и продажами.",                            color: "#FFF8E1", emoji: "🏪", category: "Бизнес",         functions: ["Управление", "Анализ"],      features: ["Веб", "Мобильное"],   complexity: "Сложный" },
  { id: "portal",     name: "Портал ресурсов",             desc: "Единый портал для доступа к корпоративным ресурсам и документам.",                      color: "#E8F5E9", emoji: "🗂️", category: "Управление",     functions: ["Управление"],                features: ["Веб"],                complexity: "Средний" },
  { id: "visitors",   name: "Регистрация посетителей",     desc: "Автоматизируйте регистрацию посетителей и управляйте пропусками.",                      color: "#EBF4FF", emoji: "🪪", category: "Бизнес",         functions: ["Отслеживание", "Уведомления"], features: ["Мобильное"],          complexity: "Простой" },
  { id: "inspection", name: "Инспекция объекта",           desc: "Проводите проверки объектов и фиксируйте результаты.",                                  color: "#FCE4EC", emoji: "🔍", category: "Управление",     functions: ["Отслеживание", "Анализ"],    features: ["Мобильное", "Офлайн"], complexity: "Средний" },
  { id: "hr",         name: "Кадровый учёт",               desc: "Управляйте данными сотрудников и отслеживайте кадровые изменения.",                     color: "#F3E5F5", emoji: "👤", category: "Кадры",          functions: ["Управление"],                features: ["Веб"],                complexity: "Сложный" },
  { id: "orders",     name: "Заказы",                     desc: "Полный цикл управления заказами от создания до доставки.",                               color: "#E0F7FA", emoji: "📝", category: "Бизнес",         functions: ["Управление", "Отслеживание"], features: ["Веб", "Мобильное"],   complexity: "Сложный" },
];

const CATEGORIES = ["Все", "Бизнес", "Управление", "Инвентаризация", "Кадры", "Финансы"];
const FUNCTIONS  = ["Все", "Отслеживание", "Управление", "Анализ", "Уведомления"];
const FEATURES   = ["Все", "Мобильное", "Веб", "Офлайн"];
const COMPLEXITIES = ["Все", "Простой", "Средний", "Сложный"];

/** Pure filter — exported for unit testing. */
export function filterTemplates(
  list: Template[],
  f: { search: string; category: string; func: string; feature: string; complexity: string },
): Template[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((t) => {
    if (q && !t.name.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    if (f.category !== "Все" && t.category !== f.category) return false;
    if (f.func !== "Все" && !t.functions.includes(f.func)) return false;
    if (f.feature !== "Все" && !t.features.includes(f.feature)) return false;
    if (f.complexity !== "Все" && t.complexity !== f.complexity) return false;
    return true;
  });
}

/** Slugify a template name into the backend-required app slug shape. */
function slugify(name: string): string {
  const base = name.toLowerCase().trim()
    .replace(/[а-яё]/gi, (c) => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c.toLowerCase()] ?? c))
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const safe = base.length >= 2 ? base : `app-${base}`;
  return `${safe}-${Date.now().toString(36)}`;
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const createApp = useCreateApp();
  const [sidebarTab,  setSidebarTab]  = useState<SidebarTab>("templates");
  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("Все");
  const [funcFilter,  setFuncFilter]  = useState("Все");
  const [feature,     setFeature]     = useState("Все");
  const [complexity,  setComplexity]  = useState("Все");
  const [copyingId,   setCopyingId]   = useState<string | null>(null);

  const filtered = filterTemplates(TEMPLATES, { search, category, func: funcFilter, feature, complexity });

  function handleSidebar(tab: SidebarTab) {
    if (tab === "templates") { setSidebarTab(tab); return; }
    navigate("/"); // other tabs live on the main page
  }

  function handleCopy(t: Template) {
    if (createApp.isPending) return;
    setCopyingId(t.id);
    createApp.mutate(
      { name: t.name, slug: slugify(t.name), description: t.desc, settings: { template: t.id } },
      {
        onSuccess: (app) => navigate(`/views?app=${app.id}`),
        onError: () => setCopyingId(null),
      },
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <Sidebar active={sidebarTab} onChange={handleSidebar} />

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
                placeholder="Поиск шаблонов"
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
              <TemplateCard
                key={t.id}
                template={t}
                copying={copyingId === t.id}
                onCopy={() => handleCopy(t)}
              />
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
function TemplateCard({ template, copying, onCopy }: { template: Template; copying: boolean; onCopy: () => void }) {
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
        <h3 className="text-[16px] font-semibold text-cta mb-1">
          {template.name}
        </h3>
        <p className="text-[13px] text-primary/60 mb-4 line-clamp-2">{template.desc}</p>
        <div className="flex items-center gap-3">
          <button
            disabled
            title="В разработке"
            className="border border-cardbg text-primary/40 text-[13px] font-medium rounded-[20px] px-4 py-1.5 cursor-not-allowed"
          >
            Предпросмотр
          </button>
          <button
            onClick={onCopy}
            disabled={copying}
            className="bg-cta text-white text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-active transition-colors disabled:opacity-60"
          >
            {copying ? "Создание…" : "Копировать"}
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
