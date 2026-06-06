import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────────── */

/** Dark overlay backdrop */
function Overlay({
  onClose,
  children,
  alignTop = false,
  topOffset = 85,
}: {
  onClose: () => void;
  children: ReactNode;
  alignTop?: boolean;
  topOffset?: number;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex justify-center"
      style={{ background: "rgba(0, 32, 95, 0.5)", alignItems: alignTop ? "flex-start" : "center" }}
      onClick={onClose}
    >
      <div
        className="bg-mainbg rounded-[10px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-visible"
        style={alignTop ? { marginTop: topOffset } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-7 h-7 shrink-0 hover:opacity-70 transition-opacity">
      <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
        <line x1="7" y1="7" x2="21" y2="21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="7" x2="7" y2="21" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Blue pill input/field container */
function BlueField({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full h-[41px] bg-cardbg rounded-btn flex items-center px-5 relative", className)}>
      {children}
    </div>
  );
}

/** Bottom action buttons */
function ModalButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-[10px]">
      <button
        onClick={onCancel}
        className="px-5 py-[3px] h-[34px] border-2 border-cta rounded-btn text-cta text-meta
                   hover:bg-cta/10 transition-colors"
      >
        Отмена
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="px-5 py-[3px] h-[34px] bg-cta border-2 border-cta rounded-btn text-white text-meta
                   hover:bg-active transition-colors disabled:opacity-60 disabled:cursor-default"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MODAL 1 — Create project (type selection)
───────────────────────────────────────────────── */

export function CreateProjectModal({
  onClose,
  onAppOption,
}: {
  onClose: () => void;
  onAppOption: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 505 }} className="px-10 pb-8">
        {/* Header */}
        <div className="flex justify-end items-center pt-[30px] mb-5">
          <CloseBtn onClick={onClose} />
        </div>

        {/* Приложение */}
        <div className="flex flex-col gap-5 mb-[30px]">
          <span className="text-[18px] font-bold text-primary">Приложение</span>

          <button onClick={onAppOption} className="flex items-center gap-[17px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[26px] h-[26px] shrink-0"><ArchiveIcon /></span>
            <span>Начать существующими данными</span>
          </button>
          <button onClick={onAppOption} className="flex items-center gap-[32px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[32px] h-[32px] shrink-0"><FolderDupIcon /></span>
            <span>Начать с шаблона</span>
          </button>
          <button onClick={onAppOption} className="flex items-center gap-[19px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[28px] h-[28px] shrink-0"><FileIcon /></span>
            <span>Пустое приложение</span>
          </button>
        </div>

        {/* База данных */}
        <div className="flex flex-col gap-5">
          <span className="text-[18px] font-bold text-primary">База данных</span>

          <button className="flex items-center gap-[18px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[24px] h-[24px] shrink-0"><DbOutlineIcon /></span>
            <span>Новая база данных</span>
          </button>
          <button className="flex items-center gap-[18px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[18px] h-[23px] shrink-0 flex items-center justify-center">
              <SheetsIcon />
            </span>
            <span>Импортировать из Sheets</span>
          </button>
          <button className="flex items-center gap-[18px] text-meta text-primary hover:text-cta transition-colors text-left">
            <span className="w-[23px] h-[25px] shrink-0 flex items-center justify-center">
              <ExcelIcon />
            </span>
            <span>Импортировать из Excel</span>
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   MODAL 2 — New App form
───────────────────────────────────────────────── */

const CATEGORY_PLACEHOLDER = "Выберете категорию...";

const CATEGORIES = [
  "Проверки и обследования",
  "Выездное обслуживание",
  "Управление недвижимостью",
  "Продажи и CRM",
  "Управление запасами",
  "Взаимодействие с клиентами",
  "Управление персоналом",
  "Планирование и управление проектами",
  "Обучение и тренинги",
  "Другое",
];

/** Custom category dropdown — Figma "категории приложений" */
function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options = [CATEGORY_PLACEHOLDER, ...CATEGORIES];

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <BlueField>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between text-[18px] text-primary cursor-pointer pr-1"
        >
          <span className={cn(!value && "opacity-70")}>{value || CATEGORY_PLACEHOLDER}</span>
          <span className={cn("text-xs transition-transform", open && "rotate-180")}>▾</span>
        </button>
      </BlueField>

      {/* Open panel — overflow-visible on Overlay allows this to escape */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-20 w-full bg-white rounded-[25px] p-[5px] flex flex-col"
          style={{ boxShadow: "10px 10px 20px rgba(0,0,0,0.25), -10px -10px 20px rgba(0,0,0,0.25)" }}
        >
          {options.map((label, i) => {
            const isPlaceholder = i === 0;
            const isSelected = isPlaceholder ? !value : label === value;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onChange(isPlaceholder ? "" : label);
                  setOpen(false);
                }}
                className={cn(
                  "w-full h-12 shrink-0 flex items-center px-[30px] border-2 border-white rounded-btn",
                  "text-meta font-medium text-primary text-left transition-colors",
                  isSelected ? "bg-selected" : "bg-mainbg hover:bg-cardbg",
                )}
                style={{ marginTop: i === 0 ? 0 : -2 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const VIEW_TEMPLATES = [
  { label: "Календарь", icon: <CalendarIcon /> },
  { label: "Колода",    icon: <DeckIcon /> },
  { label: "Таблица",   icon: <TableTplIcon /> },
  { label: "Галерея",   icon: <GalleryIcon /> },
  { label: "Детали",    icon: <DetailsIcon /> },
];

const TABLE_TEMPLATES = [
  { label: "Бракераж" },
  { label: "Отчет" },
  { label: "Детали" },
  { label: "Аудит" },
];

function TemplateItem({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <button
      className="flex flex-col items-center justify-center gap-[5px] rounded-[5px] bg-cardbg
                 hover:opacity-100 transition-opacity cursor-pointer"
      style={{ width: 81, height: 75, opacity: 0.85 }}
    >
      {icon ? (
        <span className="w-[35px] h-[35px] flex items-center justify-center">{icon}</span>
      ) : (
        <span className="w-[24px] h-[24px] flex items-center justify-center"><DbOutlineIcon /></span>
      )}
      <span className="text-[12px] text-primary font-medium leading-tight">{label}</span>
    </button>
  );
}

export function NewAppModal({
  onClose,
  onConfirm,
  isSubmitting = false,
}: {
  onClose: () => void;
  onConfirm: (name: string) => void;
  isSubmitting?: boolean;
}) {
  const [appName, setAppName] = useState("New App");
  const [category, setCategory] = useState("");
  const hasCategory = category !== "";

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 505 }} className="px-10 py-[30px] flex flex-col gap-5">
        {/* Title */}
        <h2 className="text-[18px] font-bold text-primary">Создайте новое приложение</h2>

        {/* App name */}
        <div className="flex flex-col gap-[10px]">
          <label className="text-meta text-primary font-medium">Название приложения</label>
          <BlueField>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-transparent outline-none text-[18px] text-primary"
            />
          </BlueField>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-[10px]">
          <label className="text-meta text-primary font-medium">Категория</label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>

        {/* View templates */}
        {hasCategory && (
          <div className="flex flex-col gap-[10px]">
            <label className="text-meta text-primary font-medium">
              Шаблоны представлений для данной категории
            </label>
            <div className="flex gap-[13px] flex-wrap">
              {VIEW_TEMPLATES.map((t) => (
                <TemplateItem key={t.label} label={t.label} icon={t.icon} />
              ))}
            </div>
          </div>
        )}

        {/* Table templates */}
        {hasCategory && (
          <div className="flex flex-col gap-[10px]">
            <label className="text-meta text-primary font-medium">
              Шаблоны таблиц для данной категории
            </label>
            <div className="flex gap-[13px] flex-wrap">
              {TABLE_TEMPLATES.map((t) => (
                <TemplateItem key={t.label} label={t.label} />
              ))}
              {/* + button */}
              <button
                className="flex items-center justify-center rounded-[5px] bg-cardbg hover:opacity-100 transition-opacity"
                style={{ width: 81, height: 75, opacity: 0.85 }}
              >
                <div className="w-[38px] h-[38px] bg-white rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                    <line x1="10" y1="3" x2="10" y2="17" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="17" y2="10" stroke="#00205F" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <ModalButtons
          onCancel={onClose}
          onConfirm={() => onConfirm(appName.trim())}
          confirmLabel={isSubmitting ? "Создание…" : "Выберете свои данные"}
          disabled={isSubmitting || appName.trim().length < 2}
        />
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   MODAL 3 — Share / Use app (URLs)
───────────────────────────────────────────────── */

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="text-meta text-primary font-medium">{label}</span>
      <div className="flex items-center gap-[10px]">
        <BlueField className="flex-1">
          <span className="text-[18px] text-primary truncate">{url}</span>
        </BlueField>
        <button className="shrink-0 w-[34px] h-[40px] flex items-center justify-center hover:opacity-70">
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

export function ShareModal({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 505 }} className="px-10 pb-8">
        {/* Header — close only */}
        <div className="flex justify-end pt-[30px] mb-5">
          <CloseBtn onClick={onClose} />
        </div>

        <div className="flex flex-col gap-5">
          {/* Использовать приложение */}
          <span className="text-[18px] font-bold text-primary">Использовать приложение</span>
          <UrlRow label="Установить на мобильное устройство" url="https://www.appsheet.com/newsho" />
          <UrlRow label="Открыть в браузере" url="https://www.appsheet.com/newsho" />

          {/* Редактировать */}
          <div className="pt-[10px] flex flex-col gap-5">
            <span className="text-[18px] font-medium text-primary">Редактировать приложение</span>
            <UrlRow label="Просмотр / копирование или редактирование" url="https://www.appsheet.com/newsho" />
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   MODAL 4 — Roles / Share project
───────────────────────────────────────────────── */

const MOCK_USERS = [
  { initial: "R", email: "romchik9931@gmail.com", role: "Владелец", editable: false },
  { initial: "C", email: "chikoinikit@gmail.com",  role: "Редактор",  editable: true },
  { initial: "G", email: "gfifgfif31@gmail.com",   role: "Редактор",  editable: true },
];

export function RolesModal({
  onClose,
  projectName = "Дикая Сибирь",
}: {
  onClose: () => void;
  projectName?: string;
}) {
  return (
    <Overlay onClose={onClose} alignTop topOffset={85}>
      <div style={{ width: 703 }} className="px-10 flex flex-col gap-5">
        {/* Header section with border-bottom */}
        <div className="flex flex-col gap-[10px] border-b-2 border-white pb-[5px]">
          <div className="flex justify-between items-start pt-[30px]">
            <div>
              <p className="text-[20px] font-bold text-primary leading-[150%]">
                Поделиться «{projectName}»
              </p>
              <p className="text-meta text-primary/70">2 пользователя</p>
            </div>
            <button className="mt-1 hover:opacity-70">
              <GearIcon />
            </button>
          </div>

          {/* Email input */}
          <BlueField>
            <input
              placeholder="Добавить email или домен"
              className="w-full bg-transparent outline-none text-[18px] text-primary placeholder-primary/50"
            />
          </BlueField>
        </div>

        {/* Auth toggle */}
        <div className="flex flex-col gap-[10px]">
          <p className="text-meta text-primary">
            Поставщик услуг аутентификации для доступа к приложению:{" "}
            <button className="underline text-cta hover:opacity-80">Нет</button>
          </p>
          <div className="flex items-center gap-[15px]">
            {/* Toggle pill */}
            <div className="relative w-[38px] h-[21px] bg-cardbg rounded-full cursor-pointer">
              <div className="absolute left-0 top-0 w-[21px] h-[21px] rounded-full bg-cardbg border border-white/60" />
            </div>
            <span className="text-meta text-primary">Дополнительно</span>
          </div>
        </div>

        {/* Users */}
        <div className="flex flex-col gap-[10px]">
          {MOCK_USERS.map((u) => (
            <div key={u.email} className="flex justify-between items-center h-[34px]">
              <div className="flex items-center gap-[15px]">
                <div className="w-[34px] h-[34px] bg-cardbg rounded-full flex items-center justify-center
                                text-[15px] font-medium text-cta shrink-0">
                  {u.initial}
                </div>
                <span className="text-meta text-primary">{u.email}</span>
              </div>
              <div className="flex items-center gap-[10px] w-[90px] justify-center">
                {u.editable ? (
                  <>
                    <span className="text-[14px] text-primary">{u.role}</span>
                    <span className="text-primary text-[10px]">▾</span>
                  </>
                ) : (
                  <span className="text-[14px] italic text-primary">{u.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom buttons */}
        <div className="flex justify-between items-center py-[30px]">
          <div className="flex gap-5">
            <button className="flex items-center gap-[10px] px-5 py-[3px] h-[34px]
                               border-2 border-cta rounded-btn text-cta text-meta hover:bg-cta/10 transition-colors">
              <span className="w-[25px] h-[25px]"><LinkIcon /></span>
              <span>Ссылка</span>
            </button>
            <button className="flex items-center gap-[10px] px-5 py-[3px] h-[34px]
                               border-2 border-cta rounded-btn text-cta text-meta hover:bg-cta/10 transition-colors">
              <span className="w-[21px] h-[25px]"><CopyIcon /></span>
              <span>Копировать пользователя</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-[3px] h-[34px] bg-cta border-2 border-cta rounded-btn
                       text-white text-meta hover:bg-active transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ─────────────────────────────────────────────────
   ICONS (inline SVG stubs)
───────────────────────────────────────────────── */

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 26 26" fill="none" className="w-full h-full">
      <rect x="3" y="12" width="20" height="11" rx="1" stroke="#00205F" strokeWidth="2.17"/>
      <path d="M9 12 L9 7 L13 3 L13 12" stroke="#00205F" strokeWidth="2.17" strokeLinejoin="round"/>
      <rect x="3" y="3" width="20" height="20" rx="1" stroke="#00205F" strokeWidth="2.17"/>
    </svg>
  );
}

function FolderDupIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <path d="M12 7 L20 7 L20 13 L12 13 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="6" y="11" width="16" height="14" rx="1.33" stroke="#00205F" strokeWidth="2"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
      <rect x="6" y="3.5" width="16" height="21" rx="1.5" stroke="#00205F" strokeWidth="2.33"/>
      <path d="M15 3.5 L15 9 L21 9" stroke="#00205F" strokeWidth="2.33"/>
    </svg>
  );
}

function DbOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 6 L4 18 C4 19.66 7.58 21 12 21 C16.42 21 20 19.66 20 18 L20 6" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke="#00205F" strokeWidth="2"/>
    </svg>
  );
}

function SheetsIcon() {
  return (
    <svg viewBox="0 0 18 23" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="16" height="21" rx="2" fill="#0F9D58"/>
      <rect x="4" y="7"  width="10" height="2" rx="0.5" fill="white"/>
      <rect x="4" y="11" width="10" height="2" rx="0.5" fill="white"/>
      <rect x="4" y="15" width="6"  height="2" rx="0.5" fill="white"/>
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 23 25" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="21" height="23" rx="2" fill="#1D6F42"/>
      <path d="M7 8 L11.5 12.5 M11.5 8 L7 12.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <rect x="13" y="8"  width="6" height="2" rx="0.5" fill="white"/>
      <rect x="13" y="12" width="6" height="2" rx="0.5" fill="white"/>
      <rect x="7"  y="16" width="12" height="2" rx="0.5" fill="white"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 35 40" fill="none" className="w-full h-full">
      <rect x="6"  y="7"  width="15" height="15" rx="2" stroke="#35A7FF" strokeWidth="2.86"/>
      <rect x="14" y="18" width="15" height="15" rx="2" stroke="#35A7FF" strokeWidth="2.86"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 26 26" fill="none" className="w-[26px] h-[26px]">
      <circle cx="13" cy="13" r="4" stroke="#00205F" strokeWidth="2"/>
      <path d="M13 2 L14.5 6 L13 2 Z M13 24 L11.5 20 L13 24 Z" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="13" cy="13" r="9" stroke="#00205F" strokeWidth="2" strokeDasharray="3 3"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <path d="M10 8 C7 8 4 10 4 13 C4 16 7 18 10 18 L13 18" stroke="#35A7FF" strokeWidth="1.72" strokeLinecap="round"/>
      <path d="M15 18 C18 18 21 16 21 13 C21 10 18 8 15 8 L12 8" stroke="#35A7FF" strokeWidth="1.72" strokeLinecap="round"/>
      <line x1="9" y1="13" x2="16" y2="13" stroke="#35A7FF" strokeWidth="1.72" strokeLinecap="round"/>
    </svg>
  );
}

/* View template icons */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="9" width="27" height="22" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="4" y="9" width="27" height="8" rx="2" fill="#00205F"/>
      <line x1="10" y1="4" x2="10" y2="10" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="25" y1="4" x2="25" y2="10" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="10" y="20" width="4" height="4" rx="0.5" fill="#00205F"/>
      <rect x="19" y="20" width="4" height="4" rx="0.5" fill="#00205F"/>
      <rect x="10" y="26" width="4" height="4" rx="0.5" fill="#00205F"/>
      <rect x="19" y="26" width="4" height="4" rx="0.5" fill="#00205F"/>
    </svg>
  );
}

function DeckIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="2" y="6" width="10" height="23" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="14" y="10" width="10" height="15" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="26" y="13" width="7" height="9" rx="2" stroke="#00205F" strokeWidth="2.5"/>
    </svg>
  );
}

function TableTplIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="4" y="6" width="27" height="23" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="4" y="6" width="27" height="8" rx="2" fill="#00205F" fillOpacity="0.15" stroke="#00205F" strokeWidth="2.5"/>
      <line x1="4" y1="22" x2="31" y2="22" stroke="#00205F" strokeWidth="1.5"/>
      <line x1="17" y1="6" x2="17" y2="29" stroke="#00205F" strokeWidth="1.5"/>
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
      <rect x="3" y="3"   width="13" height="13" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="19" y="3"  width="13" height="13" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="3" y="19"  width="13" height="13" rx="2" stroke="#00205F" strokeWidth="2.5"/>
      <rect x="19" y="19" width="13" height="13" rx="2" stroke="#00205F" strokeWidth="2.5"/>
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 37 37" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="29" height="29" rx="3" stroke="#00205F" strokeWidth="2.5"/>
      <circle cx="14" cy="14" r="4" stroke="#00205F" strokeWidth="2.5"/>
      <line x1="22" y1="12" x2="30" y2="12" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="17" x2="30" y2="17" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8"  y1="25" x2="29" y2="25" stroke="#00205F" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
