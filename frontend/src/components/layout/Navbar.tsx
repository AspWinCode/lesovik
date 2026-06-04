import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/shared/auth/store";

interface NavbarProps {
  brandName?: string;
  className?: string;
  onGroupAddClick?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Navbar({ brandName = "Дикая Сибирь", className, onGroupAddClick }: NavbarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

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
        <NavIconButton label="Сохранить" icon={<SaveIcon />} />
        <div className="flex items-center gap-3">
          <NavIconButton label="Отменить" icon={<UndoIcon />} />
          <NavIconButton label="Повторить" icon={<RedoIcon />} />
        </div>
        <NavIconButton label="Закрыть" icon={<CloseIcon />} highlight="mistake" />
        <NavIconButton label="Добавить пользователя" icon={<GroupAddIcon />} onClick={onGroupAddClick} />
        <NavIconButton label="Помощь" icon={<QuestionIcon />} />
        <NavIconButton label="Тема" icon={<MoonIcon />} />
        {/* User avatar — click to log out */}
        <button
          onClick={handleLogout}
          title={user ? `${user.display_name} — выйти` : "Выйти"}
          className="w-10 h-10 rounded-full bg-cardbg flex items-center justify-center
                     text-primary text-sm font-semibold cursor-pointer hover:bg-mainbg transition-colors"
        >
          {user ? initials(user.display_name) : "Я"}
        </button>
      </div>
    </header>
  );
}

function NavIconButton({
  label,
  icon,
  highlight,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  highlight?: "mistake";
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded hover:bg-mainbg transition-colors",
        highlight === "mistake" && "text-mistake"
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
    <svg viewBox="0 0 33 33" className={iconCls}>
      <circle cx="11" cy="9" r="5" stroke="#00205F" strokeWidth="1.53"/>
      <circle cx="22" cy="10" r="4" stroke="#00205F" strokeWidth="1.53"/>
      <path d="M2 26 C2 20 6 18 11 18 C16 18 20 20 20 26" stroke="#00205F" strokeWidth="1.53"/>
      <line x1="26" y1="3" x2="26" y2="11" stroke="#00205F" strokeWidth="1.53" strokeLinecap="round"/>
      <line x1="22" y1="7" x2="30" y2="7" stroke="#00205F" strokeWidth="1.53" strokeLinecap="round"/>
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

function MoonIcon() {
  return (
    <svg viewBox="0 0 26 26" className="w-[26px] h-[26px]">
      <path d="M21 13.5 C18 16.5 13 17 9 14 C5 11 4.5 6 7.5 3 C3 4 0 8.5 1 13.5 C2 19 7.5 23 13.5 22 C18.5 21 22 17 21 13.5Z"
            fill="#00205F"/>
    </svg>
  );
}
