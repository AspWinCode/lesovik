/* Public marketing landing page (scrollable). */
import { useState } from "react";

const STEPS = [
  { heading: "Выберете любой шаблон или создайте пустое приложение", shot: "Галерея шаблонов" },
  { heading: "Создайте свою базу данных или импортируйте существующую", shot: "Источники / База данных" },
  { heading: "Создайте интерфейс, подходящий для вашего приложения", shot: "Редактор представлений" },
  { heading: "Настройте автоматические действия и рабочие процессы", shot: "Бот / События" },
  { heading: "Запускайте приложения и отслеживайте эффективность в реальном времени", shot: "Профиль приложения" },
];

const FEATURES = [
  { title: "Без программирования", sub: "Визуальный конструктор для ваших приложений", items: ["Настраивайте события", "Отправка уведомлений", "Асинхронная обработка"] },
  { title: "Интеграции", sub: "Обеспечивает интеграцию с внешними сервисами", items: ["Нейросети", "1С: предприятие", "Мессенджеры"] },
  { title: "Работа в команде", sub: "Совместная разработка приложений", items: ["Настройте роли и доступ", "Работайте вместе онлайн", "История версий"] },
  { title: "Шаблоны", sub: "Используйте готовые шаблоны для вашего бизнеса", items: ["Бизнес-услуги", "Недвижимость", "Розничная торговля"] },
  { title: "Обучение", sub: "Пройдите обучение в любом удобном для вас формате", items: ["Статьи", "Видеоматериалы", "Предлагаемые шаги"] },
];

const DB_ROWS = [
  { kicker: "СОЗДАВАЙТЕ БАЗЫ ДАННЫХ", items: ["Визуальный конструктор таблиц", "Готовые схемы для любых задач", "Импорт из Excel/Google Sheets", "Автоматическое резервное копирование"], imgFirst: true },
  { kicker: "УПРАВЛЯЙТЕ СОБЫТИЯМИ", items: ["Настраиваемые действия: добавить, редактировать, удалить", "Гибкие правила срабатывания для таблиц и событий", "Конструктор иконок и отображения", "Асинхронная обработка"], imgFirst: false },
  { kicker: "АВТОМАТИЗИРУЙТЕ ПРОЦЕССЫ", items: ["Создавайте правила: «Когда событие → запусти процесс»", "Настраивайте цепочки действий из шагов и задач", "Боты работают в облаке 24/7", "Автоматизируйте рутину, даже когда приложение закрыто"], imgFirst: true },
];

const AI_CARDS = [
  { title: "Прогнозирующие модели", items: ["Предсказание продаж", "Анализ оттока клиентов", "Прогноз загрузки ресурсов"] },
  { title: "Распознавание текста", items: ["Сканирование документов", "Анализ отзывов", "Извлечение данных из фото"] },
  { title: "Голосовой помощник", items: ["Встраивается в ваше приложение", "Понимает русскую речь", "Автоматизирует поддержку"] },
];

const PLANS = [
  { name: "Базовый", price: "3 000 ₽", items: ["Основные функции", "До 5 пользователей", "До 10 ГБ хранилища"] },
  { name: "Стандартный", price: "7 000 ₽", items: ["Расширенные функции", "До 20 пользователей", "50 ГБ хранилища", "Техническая поддержка"] },
  { name: "Профессиональный", price: "7 000 ₽", items: ["Полные функции", "До 50 пользователей", "200 ГБ хранилища", "Приоритетная техническая поддержка", "Интеграция с корпоративными системами"] },
  { name: "Корпоративный", price: "7 000 ₽", items: ["Индивидуальная стоимость", "Функции по запросу", "Неограниченное количество пользователей", "Неограниченное хранилище", "Персональная техническая поддержка", "Интеграция с корпоративными системами"] },
];

export function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-white text-primary overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-mainbg border-b-[5px] border-white">
        <div className="max-w-[1760px] mx-auto px-6 h-[110px] flex items-center justify-between gap-10">
          <span className="text-[56px] font-medium text-primary leading-none">OI</span>
          <nav className="flex items-center gap-[60px]">
            <a href="#how" className="text-[24px] font-medium text-primary hover:text-cta transition-colors">Как создать приложение</a>
            <a href="#pricing" className="text-[24px] font-medium text-primary hover:text-cta transition-colors">Тарифные планы</a>
          </nav>
          <button className="px-5 h-[50px] bg-cta text-white text-[24px] font-medium rounded-btn shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-active transition-colors">
            Авторизоваться
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f4d] via-[#143a7a] to-[#35A7FF]" />
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative max-w-[1760px] mx-auto px-6 pt-[90px] pb-[110px] flex flex-col items-center gap-[50px]">
          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="max-w-[1036px] text-[40px] font-bold leading-[48px] tracking-[-0.02em] text-white">
              Создавайте функциональные и захватывающие веб-приложения без программирования
            </h1>
            <p className="max-w-[832px] text-[22px] leading-[150%] text-white/90">
              Мы считаем, что в современном мире веб-разработка должна быть легкой и понятной,
              а от доступности технологий напрямую зависит уровень жизни
            </p>
          </div>
          {/* hero image collage placeholders */}
          <div className="relative w-full max-w-[1360px] h-[460px] flex items-center justify-center">
            <div className="absolute left-0 top-6 w-[700px] h-[410px] bg-white/90 rounded-[5px] shadow-2xl" />
            <div className="relative w-[900px] h-[460px] bg-white rounded-[5px] shadow-2xl z-10 flex items-center justify-center text-primary/30 text-2xl">
              Превью конструктора
            </div>
            <div className="absolute right-0 top-10 w-[620px] h-[400px] bg-white/90 rounded-[5px] shadow-2xl" />
          </div>
          <button className="flex items-center px-5 h-[50px] bg-cta text-white text-[24px] font-medium rounded-btn shadow hover:bg-active transition-colors">
            Начать пользоваться
          </button>
        </div>
      </section>

      <main className="max-w-[1760px] mx-auto px-6 flex flex-col gap-[120px] py-[120px]">
        {/* ── Key features ── */}
        <section className="flex flex-col gap-20">
          <h2 className="text-center text-[40px] font-bold tracking-[-0.02em] text-primary">Ключевые преимущества</h2>
          <div className="flex flex-wrap justify-center gap-[33px]">
            {FEATURES.map((f) => (
              <article key={f.title} className="w-[326px] bg-mainbg rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[50px_34px] flex flex-col items-center gap-6">
                <div className="w-[119px] h-[119px] rounded-full bg-cardbg flex items-center justify-center"><FeatureGlyph /></div>
                <div className="flex flex-col gap-[10px] w-full">
                  <h3 className="text-center text-[22px] font-medium text-primary">{f.title}</h3>
                  <p className="text-center text-[18px] text-primary">{f.sub}</p>
                  <ul className="text-[18px] text-primary leading-[150%]">
                    {f.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── How to create (stepper) ── */}
        <HowToCreate />

        {/* ── DB & automation ── */}
        <section className="flex flex-col gap-20">
          <h2 className="text-center text-[40px] font-bold tracking-[-0.02em] text-primary">Работа с базами данных и автоматизация</h2>
          <div className="flex flex-col gap-20">
            {DB_ROWS.map((row) => (
              <div key={row.kicker} className="flex items-center justify-between gap-[120px] flex-wrap">
                {row.imgFirst && <ImgBlock />}
                <div className="flex-1 min-w-[400px] flex flex-col items-center gap-5">
                  <h3 className="text-center text-[22px] font-medium text-primary">{row.kicker}</h3>
                  <ul className="text-[22px] leading-[230%] text-primary">
                    {row.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
                {!row.imgFirst && <ImgBlock />}
              </div>
            ))}
          </div>
        </section>

        {/* ── Neural nets ── */}
        <section className="flex flex-col gap-20">
          <h2 className="text-center text-[40px] font-bold tracking-[-0.02em] text-primary">Интеграция с нейросетями</h2>
          <div className="flex flex-wrap justify-center gap-[33px]">
            {AI_CARDS.map((c) => (
              <article key={c.title} className="w-[565px] bg-mainbg rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-[50px_34px] flex items-center gap-10">
                <div className="w-[100px] h-[100px] rounded-full bg-cardbg shrink-0 flex items-center justify-center"><FeatureGlyph /></div>
                <div className="flex flex-col gap-[5px]">
                  <h3 className="text-[22px] font-medium text-primary">{c.title}</h3>
                  <ul className="text-[18px] leading-[150%] text-primary">
                    {c.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Creative / views carousel ── */}
        <CreativeCarousel />

        {/* ── Pricing ── */}
        <section id="pricing" className="flex flex-col gap-20">
          <h2 className="text-center text-[40px] font-semibold tracking-[-0.02em] text-primary">Тарифные планы</h2>
          <div className="flex flex-wrap justify-center gap-[60px]">
            {PLANS.map((p) => (
              <article key={p.name} className="w-[417px] bg-mainbg rounded-[5px] shadow-[0_-1px_4px_rgba(0,0,0,0.25),0_4px_4px_rgba(0,0,0,0.25)] p-[30px_40px] flex flex-col justify-between gap-5 min-h-[611px]">
                <div className="flex flex-col gap-5">
                  <h3 className="text-[28px] font-bold text-primary">{p.name}</h3>
                  <p className="text-[36px] font-semibold text-cta">{p.price}</p>
                  <ul className="flex flex-col gap-[15px] mt-2">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-start gap-[15px] text-[20px] text-primary">
                        <span className="w-[30px] h-[30px] shrink-0"><CheckRing /></span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="self-center px-5 h-[50px] border-2 border-cta text-cta text-[24px] font-medium rounded-btn hover:bg-cta hover:text-white transition-colors">
                  Начать работу
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-mainbg border-t-[5px] border-white">
        <div className="max-w-[1760px] mx-auto px-6 py-[30px] flex flex-wrap justify-between items-end gap-10">
          <div className="flex flex-col">
            <span className="text-[80px] font-medium text-primary leading-[120%]">OI</span>
            <span className="text-[16px] text-primary">© 2023 Российская No-Code платформа</span>
          </div>
          <div className="flex flex-col gap-[5px] text-[16px] text-primary">
            <span className="font-medium">КОНТАКТ</span>
            <span>Москва, ул. Тверская, 15</span>
            <span>8 (800) 555-01-23</span>
            <span>support@nocode-platform.ru</span>
          </div>
          <ul className="flex flex-col gap-[5px] text-[16px] text-primary">
            {["Оферта", "Политика конфиденциальности", "Пользовательское соглашение", "Условия оказания услуг"].map((l) => (
              <li key={l}><a href="#" className="hover:text-cta transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

/* ── Bits ── */
function HowToCreate() {
  const [step, setStep] = useState(0);
  const active = STEPS[step];
  return (
    <section id="how" className="flex flex-col items-center gap-[50px]">
      <h2 className="text-center text-[40px] font-bold tracking-[-0.02em] text-primary">Как создать приложение</h2>
      <div className="w-full max-w-[940px] flex flex-col items-center gap-[30px]">
        <p className="text-center text-[22px] font-medium text-primary min-h-[33px]">{active.heading}</p>
        <div className="w-full h-[528px] bg-cardbg rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center text-primary/40 text-2xl">
          {active.shot}
        </div>
        {/* stepper */}
        <div className="relative w-full flex justify-between items-center">
          <div className="absolute left-[40px] right-[40px] top-1/2 -translate-y-1/2 h-[20px] bg-mainbg rounded-[15px]" />
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`relative z-10 w-[81px] h-[81px] rounded-full flex items-center justify-center text-white text-[20px] font-semibold leading-[120%] text-center transition-colors ${i === step ? "bg-cta" : "bg-cardbg"}`}
            >
              {i + 1} шаг
            </button>
          ))}
        </div>
      </div>
      <button className="flex items-center px-5 h-[50px] bg-cta text-white text-[24px] font-medium rounded-btn shadow hover:bg-active transition-colors">
        Создать свое первое приложение
      </button>
    </section>
  );
}

const SLIDES = [
  { heading: "Настраивайте представления: отображение данных в виде таблицы, формы, карточек, календаря, карты и пр.", shot: "Редактор представлений" },
  { heading: "Кастомизируйте UI с помощью готовых шаблонов и тем: изменяйте цветовую палитру, шрифты, иконки и другие стилистические элементы", shot: "Вкладка «Дизайн»" },
  { heading: "Создавайте уникальный внешний вид своих проектов, добавляя различные компоненты с помощью функции drag-and-drop", shot: "Дерево компонентов (drag-and-drop)" },
];

function CreativeCarousel() {
  const [i, setI] = useState(0);
  const n = SLIDES.length;
  const slide = SLIDES[i];
  return (
    <section className="flex flex-col items-center gap-[30px]">
      <h2 className="text-center text-[40px] font-semibold tracking-[-0.02em] text-primary">Всё для творческих идей</h2>
      <p className="text-center text-[22px] text-primary max-w-[940px] min-h-[66px]">{slide.heading}</p>
      <div className="w-full flex items-center justify-center gap-[45px]">
        <button aria-label="Назад" onClick={() => setI((p) => (p - 1 + n) % n)} className="w-[45px] h-[45px] rounded-full bg-cardbg flex items-center justify-center shrink-0 hover:bg-cta/20 transition-colors"><Arrow dir="left" /></button>
        <div className="w-full max-w-[940px] h-[528px] bg-cardbg rounded-[5px] shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-center text-primary/40 text-2xl">
          {slide.shot}
        </div>
        <button aria-label="Вперёд" onClick={() => setI((p) => (p + 1) % n)} className="w-[45px] h-[45px] rounded-full bg-cardbg flex items-center justify-center shrink-0 hover:bg-cta/20 transition-colors"><Arrow dir="right" /></button>
      </div>
      <div className="flex items-center gap-5">
        {SLIDES.map((_, k) => (
          <button key={k} aria-label={`Слайд ${k + 1}`} onClick={() => setI(k)} className={`w-[17px] h-[17px] rounded-full transition-colors ${k === i ? "bg-cta" : "bg-cardbg"}`} />
        ))}
      </div>
    </section>
  );
}

function ImgBlock() {
  return (
    <div className="w-[939px] max-w-full h-[528px] bg-cardbg rounded-[5px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center text-primary/40 text-2xl shrink-0">
      Скриншот редактора
    </div>
  );
}
function FeatureGlyph() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-[56px] h-[56px]">
      <rect x="8" y="8" width="14" height="14" rx="3" stroke="#00205F" strokeWidth="3" />
      <rect x="26" y="8" width="14" height="14" rx="3" stroke="#00205F" strokeWidth="3" />
      <rect x="8" y="26" width="14" height="14" rx="3" stroke="#00205F" strokeWidth="3" />
      <rect x="26" y="26" width="14" height="14" rx="3" stroke="#00205F" strokeWidth="3" />
    </svg>
  );
}
function CheckRing() {
  return (
    <svg viewBox="0 0 30 30" fill="none" className="w-full h-full">
      <rect x="3.75" y="3.75" width="22.5" height="22.5" rx="2.5" stroke="#35A7FF" strokeWidth="2" />
      <path d="M9 15 L13 19 L21 10" stroke="#35A7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${dir === "left" ? "rotate-180" : ""}`}>
      <path d="M8 4 L16 12 L8 20" stroke="#35A7FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
