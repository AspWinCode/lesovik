import { cn } from "@/lib/cn";

export type SidebarTab = "all" | "my" | "shared" | "templates";

interface SidebarProps {
  active: SidebarTab;
  onChange: (tab: SidebarTab) => void;
}

const items: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: "all",       label: "Все проекты", icon: <HomeIcon /> },
  { id: "my",        label: "Мои",         icon: <UserIcon /> },
  { id: "shared",    label: "Общие",       icon: <GroupIcon /> },
  { id: "templates", label: "Шаблоны",     icon: <TemplateIcon /> },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside
      className="absolute left-0 top-[70px] w-[280px] h-[1010px] flex"
      style={{ padding: "0 15px 12px" }}
    >
      <nav className="flex flex-col items-center w-[250px] pt-0 gap-[15px]">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "nav-item",
              active === item.id && "active"
            )}
          >
            <span className="w-[25px] h-[25px] shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ── Icons ── */
function HomeIcon() {
  return (
    <svg viewBox="0 0 25 25" fill="none" className="w-full h-full">
      <path d="M3 10 L12.5 3 L22 10 L22 22 L3 22 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="9" y="15" width="7" height="7" fill="#00205F" rx="1"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 29 29" fill="none" className="w-full h-full">
      <circle cx="14.5" cy="10" r="5" stroke="#00205F" strokeWidth="2"/>
      <path d="M4 26 C4 20 8.5 17 14.5 17 C20.5 17 25 20 25 26" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 33 33" fill="none" className="w-full h-full">
      <circle cx="10" cy="9" r="5" stroke="#00205F" strokeWidth="2"/>
      <circle cx="23" cy="9" r="4" stroke="#00205F" strokeWidth="2"/>
      <circle cx="33" cy="9" r="4" stroke="#00205F" strokeWidth="2" style={{display:"none"}}/>
      <path d="M1 28 C1 21 5 18 10 18 C15 18 19 21 19 28" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 27 C18 22 20 19 25 19 C28 19 31 21 31 26" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <path d="M12 7 L20 7 L20 13 L12 13 Z" stroke="#00205F" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="6" y="11" width="16" height="14" rx="1.33" stroke="#00205F" strokeWidth="2"/>
    </svg>
  );
}
