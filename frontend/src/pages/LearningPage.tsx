import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";

interface NextStep {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  done: boolean;
}

interface VideoCard {
  id: string;
  title: string;
  desc: string;
}

const VIDEO_CARDS: VideoCard[] = [
  { id: "1", title: "Подготовка электронной таблицы Google", desc: "SheetBest для подготовки электронной таблицы Google Sheets для использования с OI." },
  { id: "2", title: "Создание интерфейса", desc: "Узнайте, как создавать интерфейсы в OI, создавая представления, используя условное форматирование и фирменный стиль." },
  { id: "3", title: "Совместное использование и развёртывание вашего приложения", desc: "Узнайте, как добавить соавторов для работы и развёртывания вашего приложения." },
  { id: "4", title: "Автоматизация рабочих процессов", desc: "Создавайте автоматические уведомления, задачи и процессы без написания кода." },
  { id: "5", title: "Подключение источников данных", desc: "Интегрируйте Google Sheets, Excel, базы данных и другие источники данных." },
  { id: "6", title: "Настройка безопасности", desc: "Управляйте доступом пользователей с помощью ролей и фильтров безопасности." },
];

export function LearningPage() {
  const [railModule, setRailModule] = useState<RailModule>("docs");
  const [steps, setSteps] = useState<NextStep[]>([
    { id: "explore",  label: "Изучите приложение",     desc: "Выберите столбец, который вы хотите предсказать.",          icon: <ExploreIcon />,  done: false },
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
            <h2 className="text-[18px] font-semibold text-primary mb-5">Как работает OI</h2>
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

          {/* Video tutorials */}
          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-4">Видеообучение</h2>
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {VIDEO_CARDS.map((card) => (
                <div key={card.id} className="bg-white border border-cardbg rounded-[10px] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  {/* Thumbnail placeholder */}
                  <div className="h-[140px] bg-mainbg flex items-center justify-center">
                    <svg viewBox="0 0 60 60" className="w-12 h-12 text-cta/30" fill="currentColor">
                      <path d="M30 5C16.2 5 5 16.2 5 30s11.2 25 25 25 25-11.2 25-25S43.8 5 30 5zm-4 35V20l14 10-14 10z" />
                    </svg>
                  </div>
                  <div className="p-4">
                    <p className="text-[14px] font-semibold text-cta mb-1">{card.title}</p>
                    <p className="text-[12px] text-primary/60 line-clamp-2">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
