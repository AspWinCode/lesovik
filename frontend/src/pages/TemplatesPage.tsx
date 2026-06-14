import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type SidebarTab } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";
import { installTemplate } from "@/shared/api/templates";
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
  modules?: string[];
}

const ALL = "Все";

const TEMPLATES: Template[] = [
  {
    id: "trading_company",
    name: "Торговая компания",
    desc: "Предприятие, склад, заказы, финансы и аналитика.",
    color: "#EBF4FF",
    emoji: "TC",
    category: "Бизнес",
    functions: ["Управление", "Анализ"],
    features: ["Веб", "Мобильное"],
    complexity: "Сложный",
    modules: ["enterprise", "warehouse", "orders", "finance", "analytics"],
  },
  {
    id: "manufacturing_company",
    name: "Производственное предприятие",
    desc: "Предприятие, склад, производство, финансы и аналитика.",
    color: "#E8F5E9",
    emoji: "MF",
    category: "Операции",
    functions: ["Управление", "Отслеживание"],
    features: ["Веб"],
    complexity: "Сложный",
    modules: ["enterprise", "warehouse", "production", "finance", "analytics"],
  },
  {
    id: "service_company",
    name: "Сервисная компания",
    desc: "Задачи, договоры, финансы, IT-поддержка и базовые справочники.",
    color: "#FFF8E1",
    emoji: "SV",
    category: "Бизнес",
    functions: ["Управление", "Уведомления"],
    features: ["Веб", "Мобильное"],
    complexity: "Средний",
    modules: ["enterprise", "projects", "contracts", "finance", "it_support"],
  },
  {
    id: "hr_department",
    name: "HR-подразделение",
    desc: "Предприятие, HR и задачи для кадровых процессов.",
    color: "#FCE4EC",
    emoji: "HR",
    category: "Кадры",
    functions: ["Управление", "Отслеживание"],
    features: ["Веб"],
    complexity: "Средний",
    modules: ["enterprise", "hr", "projects"],
  },
  {
    id: "document_flow",
    name: "Документооборот",
    desc: "Документы, договоры и справочники предприятия.",
    color: "#F3E5F5",
    emoji: "DF",
    category: "Документы",
    functions: ["Управление", "Отслеживание"],
    features: ["Веб"],
    complexity: "Средний",
    modules: ["enterprise", "documents", "contracts"],
  },
  {
    id: "financial_accounting",
    name: "Финансовый учёт",
    desc: "Финансы, аналитика и базовые справочники.",
    color: "#E0F7FA",
    emoji: "FA",
    category: "Финансы",
    functions: ["Анализ", "Отслеживание"],
    features: ["Веб"],
    complexity: "Средний",
    modules: ["enterprise", "finance", "analytics"],
  },
  {
    id: "empty",
    name: "Пустое приложение",
    desc: "Без модулей. Ручная настройка с нуля.",
    color: "#F5F5F5",
    emoji: "EM",
    category: "Бизнес",
    functions: ["Управление"],
    features: ["Веб"],
    complexity: "Простой",
    modules: [],
  },
];

const CATEGORIES = [ALL, "Бизнес", "Операции", "Кадры", "Документы", "Финансы"];
const FUNCTIONS = [ALL, "Отслеживание", "Управление", "Анализ", "Уведомления"];
const FEATURES = [ALL, "Мобильное", "Веб"];
const COMPLEXITIES = [ALL, "Простой", "Средний", "Сложный"];

function isAll(value: string): boolean {
  return value === ALL || value === "All";
}

export function filterTemplates(
  list: Template[],
  f: { search: string; category: string; func: string; feature: string; complexity: string },
): Template[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((t) => {
    if (q && !t.name.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    if (!isAll(f.category) && t.category !== f.category) return false;
    if (!isAll(f.func) && !t.functions.includes(f.func)) return false;
    if (!isAll(f.feature) && !t.features.includes(f.feature)) return false;
    if (!isAll(f.complexity) && t.complexity !== f.complexity) return false;
    return true;
  });
}

function slugify(name: string): string {
  const translit: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const base = name
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => translit[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "app"}-${Date.now().toString(36)}`;
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const createApp = useCreateApp();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("templates");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [funcFilter, setFuncFilter] = useState(ALL);
  const [feature, setFeature] = useState(ALL);
  const [complexity, setComplexity] = useState(ALL);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const filtered = filterTemplates(TEMPLATES, { search, category, func: funcFilter, feature, complexity });

  function handleSidebar(tab: SidebarTab) {
    if (tab === "templates") {
      setSidebarTab(tab);
      return;
    }
    navigate("/");
  }

  function handleCopy(template: Template) {
    if (createApp.isPending) return;
    setCopyingId(template.id);
    createApp.mutate(
      {
        name: template.name,
        slug: slugify(template.name),
        description: template.desc,
        settings: { template: template.id, modules: template.modules ?? [] },
      },
      {
        onSuccess: async (app) => {
          await installTemplate(app.id, template.id);
          navigate(`/views?app=${app.id}`);
        },
        onError: () => setCopyingId(null),
      },
    );
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <Sidebar active={sidebarTab} onChange={handleSidebar} />

      <main className="absolute top-[70px] overflow-y-auto bg-white" style={{ left: 280, width: 1640, height: 1010 }}>
        <div className="px-10 py-8">
          <h1 className="text-[32px] font-bold text-primary mb-2">Шаблоны приложений</h1>
          <p className="text-[15px] text-primary/60 mb-6 max-w-[900px]">
            Готовые наборы модулей из ТЗ. При копировании создаётся приложение и устанавливаются нужные модули.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск шаблонов"
              className="h-[42px] w-[360px] bg-mainbg rounded-[8px] px-4 text-[14px] text-primary outline-none"
            />
            <FilterDropdown label="Категория" options={CATEGORIES} value={category} onChange={setCategory} />
            <FilterDropdown label="Функции" options={FUNCTIONS} value={funcFilter} onChange={setFuncFilter} />
            <FilterDropdown label="Особенности" options={FEATURES} value={feature} onChange={setFeature} />
            <FilterDropdown label="Сложность" options={COMPLEXITIES} value={complexity} onChange={setComplexity} />
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                copying={copyingId === template.id}
                onCopy={() => handleCopy(template)}
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

function TemplateCard({ template, copying, onCopy }: { template: Template; copying: boolean; onCopy: () => void }) {
  const modules = template.modules ?? [];

  return (
    <div className="border border-cardbg rounded-[8px] overflow-hidden hover:shadow-md transition-shadow bg-white">
      <div className="h-[120px] flex items-center justify-center text-[30px] font-bold text-primary/70" style={{ backgroundColor: template.color }}>
        {template.emoji}
      </div>
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-cta mb-1">{template.name}</h3>
        <p className="text-[13px] text-primary/60 mb-3 min-h-[38px]">{template.desc}</p>
        <p className="text-[12px] text-primary/45 mb-4">Модули: {modules.length ? modules.join(", ") : "нет"}</p>
        <div className="flex items-center gap-3">
          <button
            disabled
            className="border border-cardbg text-primary/40 text-[13px] font-medium rounded-[20px] px-4 py-1.5 cursor-not-allowed"
          >
            Предпросмотр
          </button>
          <button
            onClick={onCopy}
            disabled={copying}
            className="bg-cta text-white text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-active transition-colors disabled:opacity-60"
          >
            {copying ? "Создание..." : "Копировать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border rounded-[20px] px-4 py-2 text-[13px] focus:outline-none transition-colors cursor-pointer",
        !isAll(value) ? "border-cta text-cta bg-[#EBF4FF]" : "border-cardbg text-primary bg-white hover:border-cta/40",
      )}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {isAll(o) ? label : o}
        </option>
      ))}
    </select>
  );
}
