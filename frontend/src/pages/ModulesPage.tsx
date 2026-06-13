import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";

/* ── Module catalog definition ── */
interface ModuleDef {
  id: string;
  name: string;
  description: string;
  entities: string;
  category: string;
  icon: string;
  color: string;
}

const MODULES: ModuleDef[] = [
  {
    id: "enterprise",
    name: "Предприятие",
    description: "Основные справочники организации: подразделения, сотрудники, должности, контрагенты.",
    entities: "Подразделения · Сотрудники · Должности · Контрагенты",
    category: "Базовый",
    icon: "🏢",
    color: "#4C6EF5",
  },
  {
    id: "crm",
    name: "CRM",
    description: "Управление клиентами, сделками и воронкой продаж.",
    entities: "Клиенты · Сделки · Воронка · Активности",
    category: "Продажи",
    icon: "🤝",
    color: "#F59E0B",
  },
  {
    id: "tasks",
    name: "Задачи и проекты",
    description: "Проекты, задачи, вехи и управление ресурсами команды.",
    entities: "Проекты · Задачи · Вехи · Ресурсы",
    category: "Продуктивность",
    icon: "✅",
    color: "#10B981",
  },
  {
    id: "warehouse",
    name: "Склад",
    description: "Учёт товаров, складских остатков и движения материальных ценностей.",
    entities: "Товары · Склады · Остатки · Операции",
    category: "Операции",
    icon: "📦",
    color: "#8B5CF6",
  },
  {
    id: "orders",
    name: "Заказы и отгрузки",
    description: "Заказы клиентов, позиции, отгрузки и складские документы.",
    entities: "Заказы · Позиции · Отгрузки · Возвраты",
    category: "Операции",
    icon: "🚚",
    color: "#06B6D4",
  },
  {
    id: "production",
    name: "Производство",
    description: "Заказы на производство, спецификации (BOM) и технологические операции.",
    entities: "Производственные заказы · BOM · Операции",
    category: "Операции",
    icon: "⚙️",
    color: "#64748B",
  },
  {
    id: "finance",
    name: "Финансы",
    description: "Бюджетирование, платёжные документы и финансовые транзакции.",
    entities: "Бюджет · Платежи · Транзакции · Статьи",
    category: "Финансы",
    icon: "💰",
    color: "#059669",
  },
  {
    id: "contracts",
    name: "Договоры",
    description: "Договорная работа: контрагенты, приложения, этапы оплаты.",
    entities: "Договоры · Контрагенты · Приложения · Оплаты",
    category: "Финансы",
    icon: "📝",
    color: "#DC2626",
  },
  {
    id: "hr",
    name: "HR и кадры",
    description: "Подбор персонала, кандидаты, оценки и обучение сотрудников.",
    entities: "Кандидаты · Заявки · Оценки · Обучение",
    category: "HR",
    icon: "👥",
    color: "#DB2777",
  },
  {
    id: "documents",
    name: "Документооборот",
    description: "Управление входящими, исходящими и внутренними документами.",
    entities: "Входящие · Исходящие · Внутренние · Маршруты",
    category: "Документы",
    icon: "📄",
    color: "#7C3AED",
  },
  {
    id: "analytics",
    name: "Аналитика",
    description: "KPI, аналитические дашборды и отчётные срезы.",
    entities: "KPI · Дашборды · Отчёты · Срезы",
    category: "Аналитика",
    icon: "📊",
    color: "#0EA5E9",
  },
  {
    id: "it",
    name: "IT и поддержка",
    description: "Тикеты поддержки, инвентаризация оборудования и SLA.",
    entities: "Тикеты · Оборудование · SLA · База знаний",
    category: "IT",
    icon: "🛠️",
    color: "#EA580C",
  },
];

const CATEGORIES = ["Все", "Базовый", "Продажи", "Продуктивность", "Операции", "Финансы", "HR", "Документы", "Аналитика", "IT"];

const INSTALLED_KEY = "lesovik_installed_modules";

function loadInstalled(): Set<string> {
  try {
    const raw = localStorage.getItem(INSTALLED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveInstalled(set: Set<string>) {
  localStorage.setItem(INSTALLED_KEY, JSON.stringify([...set]));
}

/* ── Module card ── */
function ModuleCard({
  mod,
  installed,
  onToggle,
}: {
  mod: ModuleDef;
  installed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-[14px] border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md",
        installed ? "border-cta/40 shadow-[0_0_0_2px_rgba(53,167,255,0.12)]" : "border-cardbg"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
          style={{ background: mod.color + "20" }}
        >
          {mod.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-primary">{mod.name}</span>
            {installed && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cta/10 text-cta">✓ Установлен</span>
            )}
          </div>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{ background: mod.color + "18", color: mod.color }}
          >
            {mod.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-primary/60 leading-relaxed">{mod.description}</p>

      {/* Entities list */}
      <p className="text-[12px] text-primary/40">{mod.entities}</p>

      {/* Action */}
      <button
        onClick={onToggle}
        className={cn(
          "h-[34px] rounded-[8px] text-[13px] font-medium transition-colors mt-auto",
          installed
            ? "border border-cardbg text-primary/60 hover:border-mistake hover:text-mistake"
            : "bg-cta text-white hover:bg-cta/90"
        )}
      >
        {installed ? "Удалить модуль" : "Установить"}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════════════════════════ */
export function ModulesPage() {
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(loadInstalled);
  const [toast, setToast] = useState<string | null>(null);

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);

  function toggleInstalled(modId: string, modName: string) {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
        showToast(`Модуль «${modName}» удалён`);
      } else {
        next.add(modId);
        showToast(`Модуль «${modName}» установлен`);
      }
      saveInstalled(next);
      return next;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = MODULES.filter((m) => {
    const matchCat = category === "Все" || m.category === category;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* ── Main content ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 1425, height: 1010 }}
      >
        <div className="px-[48px] py-[32px]">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[28px] font-bold text-primary">Каталог модулей</h1>
              <p className="text-[15px] text-primary/50 mt-1">
                Готовые бизнес-модули для быстрого старта. Установите нужные — и базы данных, связи и шаблоны страниц появятся автоматически.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-primary/40">
              <span className="font-medium text-primary">{installed.size}</span> установлено из {MODULES.length}
            </div>
          </div>

          {/* Search + category filter */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск модулей…"
                className="h-[38px] w-[260px] border border-cardbg rounded-[10px] pl-9 pr-3 text-[14px] bg-white focus:outline-none focus:border-cta"
              />
              <svg className="absolute left-3 top-[11px] w-4 h-4 text-primary/30" fill="none" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "h-[34px] px-4 rounded-full text-[13px] font-medium transition-colors border",
                    category === cat
                      ? "bg-cta text-white border-cta"
                      : "bg-white text-primary/60 border-cardbg hover:border-cta hover:text-cta"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Module grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-[17px] font-semibold text-primary mb-2">Ничего не найдено</p>
              <p className="text-[14px] text-primary/40">Попробуйте другой поисковый запрос или категорию</p>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {filtered.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  installed={installed.has(mod.id)}
                  onToggle={() => toggleInstalled(mod.id, mod.name)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <PreviewPanel projectName={app?.name ?? "Lesovik"} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[14px] px-5 py-3 rounded-[10px] shadow-lg z-50 transition-all">
          {toast}
        </div>
      )}
    </div>
  );
}
