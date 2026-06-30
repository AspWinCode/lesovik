import { useState, useEffect } from "react";
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
  isCustom?: boolean;
}

const ALL = "Все";

const BUILT_IN_TEMPLATES: Template[] = [
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

const COLOR_PRESETS = [
  "#EBF4FF", "#E8F5E9", "#FFF8E1", "#FCE4EC",
  "#F3E5F5", "#E0F7FA", "#F5F5F5", "#FFF3E0",
  "#E8EAF6", "#F1F8E9",
];

const LS_KEY = "user_templates_v1";

function loadUserTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUserTemplates(templates: Template[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

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
  const [userTemplates, setUserTemplates] = useState<Template[]>(() => loadUserTemplates());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => { saveUserTemplates(userTemplates); }, [userTemplates]);

  const allTemplates = showOnlyMine
    ? userTemplates
    : [...BUILT_IN_TEMPLATES, ...userTemplates];

  const filtered = filterTemplates(allTemplates, { search, category, func: funcFilter, feature, complexity });

  function handleSidebar(tab: SidebarTab) {
    if (tab === "templates") { setSidebarTab(tab); return; }
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
          if (!template.isCustom) await installTemplate(app.id, template.id);
          navigate(`/views?app=${app.id}`);
        },
        onError: () => setCopyingId(null),
      },
    );
  }

  function handleCreateTemplate(data: Omit<Template, "id" | "isCustom">) {
    const newTemplate: Template = {
      ...data,
      id: `custom_${Date.now()}`,
      isCustom: true,
    };
    setUserTemplates((prev) => [...prev, newTemplate]);
    setShowCreateModal(false);
  }

  function handleDeleteTemplate(id: string) {
    setUserTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <Sidebar active={sidebarTab} onChange={handleSidebar} />

      <main className="absolute top-[70px] overflow-y-auto bg-white" style={{ left: 280, width: 1640, height: 1010 }}>
        <div className="px-10 py-8">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-[32px] font-bold text-primary">Шаблоны приложений</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-cta text-white text-[14px] font-semibold rounded-[20px] px-5 py-2.5 hover:bg-active transition-colors mt-1"
            >
              <span className="text-[18px] leading-none">+</span>
              Создать шаблон
            </button>
          </div>
          <p className="text-[15px] text-primary/60 mb-6 max-w-[900px]">
            Готовые наборы модулей из ТЗ. При копировании создаётся приложение и устанавливаются нужные модули.
          </p>

          <div className="flex items-center gap-4 mb-6">
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
            {userTemplates.length > 0 && (
              <button
                onClick={() => setShowOnlyMine((v) => !v)}
                className={cn(
                  "border rounded-[20px] px-4 py-2 text-[13px] transition-colors",
                  showOnlyMine ? "border-cta text-cta bg-[#EBF4FF]" : "border-cardbg text-primary bg-white hover:border-cta/40",
                )}
              >
                Мои шаблоны {userTemplates.length > 0 && `(${userTemplates.length})`}
              </button>
            )}
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                copying={copyingId === template.id}
                onCopy={() => handleCopy(template)}
                onDelete={template.isCustom ? () => handleDeleteTemplate(template.id) : undefined}
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

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTemplate}
        />
      )}
    </div>
  );
}

/* ── Template Card ── */
function TemplateCard({
  template,
  copying,
  onCopy,
  onDelete,
}: {
  template: Template;
  copying: boolean;
  onCopy: () => void;
  onDelete?: () => void;
}) {
  const modules = template.modules ?? [];

  return (
    <div className="border border-cardbg rounded-[8px] overflow-hidden hover:shadow-md transition-shadow bg-white relative">
      {template.isCustom && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-white/80 text-cta text-[11px] font-semibold px-2 py-0.5 rounded-full border border-cta/30">
            Мой
          </span>
        </div>
      )}
      <div
        className="h-[120px] flex items-center justify-center text-[30px] font-bold text-primary/70"
        style={{ backgroundColor: template.color }}
      >
        {template.emoji}
      </div>
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-cta mb-1">{template.name}</h3>
        <p className="text-[13px] text-primary/60 mb-3 min-h-[38px]">{template.desc}</p>
        <p className="text-[12px] text-primary/45 mb-4">
          {modules.length ? `Модули: ${modules.join(", ")}` : template.category}
        </p>
        <div className="flex items-center gap-3">
          {onDelete && (
            <button
              onClick={onDelete}
              className="border border-red-200 text-red-400 text-[13px] font-medium rounded-[20px] px-4 py-1.5 hover:bg-red-50 transition-colors"
            >
              Удалить
            </button>
          )}
          {!template.isCustom && (
            <button
              disabled
              className="border border-cardbg text-primary/40 text-[13px] font-medium rounded-[20px] px-4 py-1.5 cursor-not-allowed"
            >
              Предпросмотр
            </button>
          )}
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

/* ── Create Template Modal ── */
function CreateTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Omit<Template, "id" | "isCustom">) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("МШ");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [category, setCategory] = useState("Бизнес");
  const [complexity, setComplexity] = useState("Простой");
  const [functions, setFunctions] = useState<string[]>(["Управление"]);
  const [features, setFeatures] = useState<string[]>(["Веб"]);

  function toggleArr<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      desc: desc.trim(),
      emoji: emoji.trim().slice(0, 4) || name.slice(0, 2).toUpperCase(),
      color,
      category,
      complexity,
      functions: functions.length ? functions : ["Управление"],
      features: features.length ? features : ["Веб"],
      modules: [],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] shadow-[0_8px_40px_rgba(0,32,95,0.18)] w-[560px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[30px] pt-[28px] pb-[20px]">
          <h3 className="text-[22px] font-bold text-primary">Создать шаблон</h3>
          <button onClick={onClose} className="text-primary/40 hover:text-primary text-[24px] leading-none transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px] px-[30px] pb-[28px] overflow-y-auto">

          {/* Preview */}
          <div
            className="h-[80px] rounded-[10px] flex items-center justify-center text-[28px] font-bold text-primary/70 mb-[-4px]"
            style={{ backgroundColor: color }}
          >
            {emoji.slice(0, 4) || "??"}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] font-medium text-primary/70">Название <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Мой учёт"
              className="h-[42px] px-[14px] rounded-[10px] border border-primary/20 text-[15px] text-primary outline-none focus:border-cta transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] font-medium text-primary/70">Описание</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Краткое описание шаблона"
              className="px-[14px] py-[10px] rounded-[10px] border border-primary/20 text-[15px] text-primary outline-none focus:border-cta transition-colors resize-none"
            />
          </div>

          {/* Emoji & Color */}
          <div className="flex gap-[14px]">
            <div className="flex flex-col gap-[5px] w-[120px]">
              <label className="text-[13px] font-medium text-primary/70">Аббревиатура</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                maxLength={4}
                placeholder="TC"
                className="h-[42px] px-[14px] rounded-[10px] border border-primary/20 text-[15px] text-primary outline-none focus:border-cta transition-colors text-center font-bold"
              />
            </div>
            <div className="flex flex-col gap-[5px] flex-1">
              <label className="text-[13px] font-medium text-primary/70">Цвет фона</label>
              <div className="flex gap-[8px] flex-wrap pt-[4px]">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-[28px] h-[28px] rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-cta scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Category & Complexity */}
          <div className="flex gap-[14px]">
            <div className="flex flex-col gap-[5px] flex-1">
              <label className="text-[13px] font-medium text-primary/70">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-[42px] px-[14px] rounded-[10px] border border-primary/20 text-[15px] text-primary outline-none focus:border-cta transition-colors"
              >
                {CATEGORIES.filter((c) => c !== ALL).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[5px] flex-1">
              <label className="text-[13px] font-medium text-primary/70">Сложность</label>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                className="h-[42px] px-[14px] rounded-[10px] border border-primary/20 text-[15px] text-primary outline-none focus:border-cta transition-colors"
              >
                {COMPLEXITIES.filter((c) => c !== ALL).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Functions */}
          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] font-medium text-primary/70">Функции</label>
            <div className="flex gap-[8px] flex-wrap">
              {FUNCTIONS.filter((f) => f !== ALL).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFunctions((prev) => toggleArr(prev, f))}
                  className={cn(
                    "px-3 py-1.5 rounded-[20px] text-[13px] border transition-colors",
                    functions.includes(f) ? "bg-cta text-white border-cta" : "border-cardbg text-primary hover:border-cta/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] font-medium text-primary/70">Особенности</label>
            <div className="flex gap-[8px]">
              {FEATURES.filter((f) => f !== ALL).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeatures((prev) => toggleArr(prev, f))}
                  className={cn(
                    "px-3 py-1.5 rounded-[20px] text-[13px] border transition-colors",
                    features.includes(f) ? "bg-cta text-white border-cta" : "border-cardbg text-primary hover:border-cta/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-[10px] pt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="h-[42px] px-[22px] rounded-[20px] border-2 border-primary/20 text-[15px] text-primary hover:bg-mainbg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-[42px] px-[22px] rounded-[20px] bg-cta text-white text-[15px] font-semibold hover:bg-active transition-colors"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Filter Dropdown ── */
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
