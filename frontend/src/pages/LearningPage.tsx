import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { useAuthStore } from "@/shared/auth/store";
import { useArticles } from "@/shared/hooks/useKnowledge";

interface NextStep {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  done: boolean;
}

const LEARNING_CATEGORY = "Обучение";

export function LearningPage() {
  const isPlatformAdmin = useAuthStore((s) => s.user?.roles.some((r) => r.id === "platform_admin") ?? false);
  const articlesQ = useArticles({ category: LEARNING_CATEGORY });
  const articles = articlesQ.data ?? [];

  const [railModule, setRailModule] = useState<RailModule>("docs");
  const [steps, setSteps] = useState<NextStep[]>([
    { id: "explore",  label: "Изучите приложение",     desc: "Посмотрите, из каких таблиц и страниц состоит ваше приложение.", icon: <ExploreIcon />,  done: false },
    { id: "theme",    label: "Выберете тему",            desc: "Настройте фирменные цвета и логотипы",                      icon: <ThemeIcon />,    done: false },
    { id: "data",     label: "Просмотр данных",          desc: "Проверьте подключённые данные вашего приложения",           icon: <DataIcon />,     done: false },
    { id: "views",    label: "Настройте представление",  desc: "Управляйте отображением данных",                            icon: <ViewsIcon />,    done: false },
    { id: "users",    label: "Пригласите пользователей", desc: "Поделитесь своим приложением с другими",                   icon: <UsersIcon />,    done: false },
    { id: "deploy",   label: "Развернуть",               desc: "Запустить приложение",                                      icon: <DeployIcon />,   done: false },
  ]);

  function toggleStep(id: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      {/* Main content */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 1250, height: 1010 }}
      >
        <div className="px-10 py-8">
          <h1 className="text-[28px] font-bold text-primary mb-8">Обучение</h1>

          {/* Suggested next steps */}
          <section className="mb-10">
            <h2 className="text-[18px] font-semibold text-primary mb-4">Предлагаемые следующие шаги</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  className={`text-left border rounded-[10px] p-5 transition-all ${
                    step.done
                      ? "border-cta bg-[#EBF4FF] opacity-70"
                      : "border-cardbg bg-white hover:border-cta/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 shrink-0 mt-0.5 text-cta">{step.icon}</span>
                    <div>
                      <p className={`text-[15px] font-semibold mb-1 ${step.done ? "line-through text-primary/50" : "text-cta"}`}>
                        {step.label}
                      </p>
                      <p className="text-[13px] text-primary/60">{step.desc}</p>
                    </div>
                    {step.done && (
                      <svg viewBox="0 0 20 20" className="w-5 h-5 text-cta ml-auto shrink-0" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* How AppSheet works */}
          <section className="mb-10">
            <h2 className="text-[18px] font-semibold text-primary mb-5">Как работает Лесовик</h2>
            <div className="flex items-center gap-0">
              {[
                { num: 1, label: "Данные",       icon: "🗄️" },
                { num: 2, label: "Интерфейс",    icon: "📱" },
                { num: 3, label: "Автоматизация",icon: "⚡" },
                { num: 4, label: "Публикация",   icon: "🚀" },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center">
                  <div className="flex flex-col items-center gap-2 w-[180px]">
                    <div className="w-14 h-14 bg-white border-2 border-cta/20 rounded-full flex items-center justify-center text-2xl">
                      {step.icon}
                    </div>
                    <div className="text-center">
                      <div className="w-7 h-7 rounded-full bg-cta text-white text-[13px] font-bold flex items-center justify-center mx-auto mb-1">
                        {step.num}
                      </div>
                      <p className="text-[14px] font-medium text-primary">{step.label}</p>
                    </div>
                  </div>
                  {i < 3 && (
                    <svg viewBox="0 0 40 20" className="w-10 h-5 text-cta/30 mx-1" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M0 10h36M30 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Learning articles — pulled from the knowledge base (category "Обучение"),
              editable by a platform admin from the Knowledge Base page. */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-primary">Обучающие материалы</h2>
              {isPlatformAdmin && (
                <Link
                  to="/knowledge-base"
                  className="text-[13px] font-medium text-cta hover:underline"
                >
                  + Добавить материал
                </Link>
              )}
            </div>

            {articlesQ.isLoading && <p className="text-[13px] text-primary/40">Загрузка…</p>}

            {!articlesQ.isLoading && articles.length === 0 && (
              <div className="border border-dashed border-cardbg rounded-[10px] p-8 text-center">
                <p className="text-[14px] text-primary/60 mb-1">Обучающих материалов пока нет</p>
                <p className="text-[13px] text-primary/40">
                  {isPlatformAdmin
                    ? "Добавьте статьи в базе знаний с категорией «Обучение» — они появятся здесь."
                    : "Обратитесь к администратору платформы, чтобы их добавили."}
                </p>
              </div>
            )}

            {articles.length > 0 && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/knowledge-base?article=${article.slug}`}
                    className="bg-white border border-cardbg rounded-[10px] overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-[100px] bg-mainbg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 text-cta/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 4h16v16H4z" strokeLinejoin="round" />
                        <path d="M8 9h8M8 13h8M8 17h4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="p-4">
                      <p className="text-[14px] font-semibold text-cta mb-1">{article.title}</p>
                      <p className="text-[12px] text-primary/60 line-clamp-2">{article.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <PreviewPanel projectName="Дикая Сибирь" />
    </div>
  );
}

/* ── Step icons ── */
const s = "#00205F";

function ExploreIcon()  { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><circle cx="10" cy="10" r="7"/><path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ThemeIcon()    { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><circle cx="10" cy="10" r="7"/><path d="M6.5 13.5A5 5 0 0113.5 6.5" strokeLinecap="round"/></svg>; }
function DataIcon()     { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><ellipse cx="10" cy="5" rx="6" ry="2"/><path d="M4 5v10c0 1.1 2.69 2 6 2s6-.9 6-2V5"/><path d="M4 10c0 1.1 2.69 2 6 2s6-.9 6-2"/></svg>; }
function ViewsIcon()    { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>; }
function UsersIcon()    { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><path d="M7 7a3 3 0 100-6 3 3 0 000 6zm-5 10a5 5 0 0110 0H2z"/><path d="M13 5a3 3 0 010 6M17 17a5 5 0 00-4-4.9" strokeLinecap="round"/></svg>; }
function DeployIcon()   { return <svg viewBox="0 0 20 20" fill="none" stroke={s} strokeWidth="1.5" className="w-full h-full"><path d="M10 3l7 7-7 7M3 10h14" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
