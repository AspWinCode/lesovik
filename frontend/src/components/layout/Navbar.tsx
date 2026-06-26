import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/shared/auth/store";
import { useThemeStore } from "@/shared/theme/store";

interface NavbarProps {
  brandName?: string;
  className?: string;
  onGroupAddClick?: () => void;
  /** Wire the Save / Undo / Redo controls; omitted handlers render disabled. */
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Navbar({ brandName = "Дикая Сибирь", className, onGroupAddClick, onSave, onUndo, onRedo }: NavbarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleTheme = useThemeStore((s) => s.toggle);

  async function handleLogout() {
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <header
      className={cn(
        "absolute left-0 top-0 w-full h-[70px] flex items-center justify-between",
        "px-[15px] bg-white z-10",
        className
      )}
    >
      {/* Left: logo + brand */}
      <div className="flex items-center gap-[35px]">
        <div className="flex items-center gap-[35px]">
          <span className="text-logo text-primary font-medium leading-none">OI</span>
          <span className="text-brand text-primary font-bold">{brandName}</span>
        </div>
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-[30px]">
        <NavIconButton label="Сохранить" icon={<SaveIcon />} onClick={onSave} disabled={!onSave} />
        <div className="flex items-center gap-3">
          <NavIconButton label="Отменить" icon={<UndoIcon />} onClick={onUndo} disabled={!onUndo} />
          <NavIconButton label="Повторить" icon={<RedoIcon />} onClick={onRedo} disabled={!onRedo} />
        </div>
        <NavIconButton label="Закрыть" icon={<CloseIcon />} highlight="mistake" onClick={() => navigate("/")} />
        <NavIconButton label="Добавить пользователя" icon={<GroupAddIcon />} onClick={onGroupAddClick} />
        <HelpDropdown />
        <SupportDropdown />
        <NavIconButton label="Сменить тему" icon={<MoonIcon />} onClick={toggleTheme} />
        {/* User avatar — opens account menu */}
        <AvatarMenu
          label={user ? user.display_name : "Я"}
          initials={user ? initials(user.display_name) : "Я"}
          onProfile={() => navigate("/profile")}
          onAccount={() => navigate("/account")}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}

/* ── Help dropdown ── */
const HELP_ITEMS = [
  "Документация",
  "Курс OI",
  "Форум сообщества",
  "Видео обучение",
  "Справочные ресурсы",
];

function HelpDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Помощь"
        title="Помощь"
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-mainbg"
      >
        <QuestionIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 min-w-[220px] bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] overflow-hidden py-1">
          {HELP_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-[15px] text-primary hover:text-cta hover:bg-mainbg transition-colors"
            >
              <span>{item}</span>
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0 ml-2">
                <path d="M7 2h3v3M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Support dropdown ── */
const SUPPORT_ITEMS = [
  { label: "Документация",        icon: "📄" },
  { label: "Форум сообщества",    icon: "💬" },
  { label: "Видеообучение",       icon: "🎬" },
  { label: "Служба поддержки",    icon: "❓" },
  { label: "Примечания к выпуску", icon: "ℹ️" },
  { label: "Отправить отзыв",     icon: "↩" },
];

function SupportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Поддержка"
        title="Поддержка"
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-mainbg"
      >
        <SupportIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 min-w-[230px] bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] overflow-hidden py-1">
          {SUPPORT_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-primary hover:text-cta hover:bg-mainbg transition-colors text-left"
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Avatar + account dropdown ── */
function AvatarMenu({
  label,
  initials,
  onProfile,
  onAccount,
  onLogout,
}: {
  label: string;
  initials: string;
  onProfile: () => void;
  onAccount: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={label}
        className="w-10 h-10 rounded-full bg-cardbg flex items-center justify-center
                   text-primary text-sm font-semibold cursor-pointer hover:bg-mainbg transition-colors"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 min-w-[200px] bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,32,95,0.18)] overflow-hidden">
          <div className="px-4 py-2 text-[13px] text-primary/50 border-b border-mainbg truncate">{label}</div>
          <button
            onClick={() => { setOpen(false); onAccount(); }}
            className="w-full text-left px-4 py-2.5 text-[15px] text-primary hover:bg-mainbg transition-colors"
          >
            Политика
          </button>
          <button
            onClick={() => { setOpen(false); onProfile(); }}
            className="w-full text-left px-4 py-2.5 text-[15px] text-primary hover:bg-mainbg transition-colors"
          >
            Мой аккаунт
          </button>
          <button
            disabled
            title="В разработке"
            className="w-full text-left px-4 py-2.5 text-[15px] text-primary/40 cursor-not-allowed"
          >
            Моя команда
            <span className="ml-2 text-[11px] text-primary/30">В разработке</span>
          </button>
          <div className="border-t border-mainbg">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full text-left px-4 py-2.5 text-[15px] text-mistake hover:bg-mainbg transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavIconButton({
  label,
  icon,
  highlight,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  highlight?: "mistake";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={disabled ? `${label} (в разработке)` : label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded transition-colors",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-mainbg",
        highlight === "mistake" && !disabled && "text-mistake"
      )}
    >
      {icon}
    </button>
  );
}

/* ── Icon stubs — replace with your SVG assets ── */
const iconCls = "w-[28px] h-[28px] stroke-current fill-none";

function SaveIcon() {
  return (
    <svg viewBox="0 0 30 30" className={iconCls}>
      <rect x="5" y="19" width="20" height="6" rx="1" stroke="#CBE3FF" strokeWidth="2"/>
      <path d="M10 5 L10 12" stroke="#CBE3FF" strokeWidth="2"/>
      <rect x="4" y="4" width="22" height="22" rx="2" stroke="#CBE3FF" strokeWidth="2"/>
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 28 28" className={iconCls}>
      <path d="M6 6 L6 14 L14 14" stroke="#CBE3FF" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 14 C6 20 12 24 19 21" stroke="#CBE3FF" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 28 28" className={iconCls} style={{ transform: "scaleX(-1)" }}>
      <path d="M6 6 L6 14 L14 14" stroke="#CBE3FF" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 14 C6 20 12 24 19 21" stroke="#CBE3FF" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 32 32" className={iconCls}>
      <circle cx="16" cy="16" r="12" stroke="#C22A2A" strokeWidth="2.13"/>
      <line x1="12" y1="12" x2="20" y2="20" stroke="#C22A2A" strokeWidth="2.67" strokeLinecap="round"/>
      <line x1="20" y1="12" x2="12" y2="20" stroke="#C22A2A" strokeWidth="2.67" strokeLinecap="round"/>
    </svg>
  );
}

function GroupAddIcon() {
  return (
    <svg viewBox="0 0 30 28" className={iconCls}>
      {/* Person */}
      <circle cx="10" cy="8" r="5" stroke="#00205F" strokeWidth="2"/>
      <path d="M1 27 C1 20 5 17 10 17 C15 17 19 20 19 27" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      {/* Plus sign — clearly to the right, not overlapping */}
      <line x1="24" y1="4" x2="24" y2="16" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="10" x2="30" y2="10" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 32 32" className={iconCls}>
      <circle cx="16" cy="16" r="12" stroke="#00205F" strokeWidth="2"/>
      <path d="M13 12 C13 9 19 9 19 13 C19 16 16 16 16 19" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="23" r="1" fill="#00205F"/>
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-[28px] h-[28px] fill-none stroke-current">
      <circle cx="16" cy="16" r="12" stroke="#00205F" strokeWidth="2"/>
      <circle cx="16" cy="16" r="5" stroke="#00205F" strokeWidth="2"/>
      <line x1="11.5" y1="11.5" x2="7" y2="7" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20.5" y1="11.5" x2="25" y2="7" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <line x1="11.5" y1="20.5" x2="7" y2="25" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20.5" y1="20.5" x2="25" y2="25" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 26 26" className="w-[26px] h-[26px]">
      <path d="M21 13.5 C18 16.5 13 17 9 14 C5 11 4.5 6 7.5 3 C3 4 0 8.5 1 13.5 C2 19 7.5 23 13.5 22 C18.5 21 22 17 21 13.5Z"
            fill="#00205F"/>
    </svg>
  );
}
