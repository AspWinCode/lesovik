import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabSwitcherProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabSwitcher({ tabs, activeId, onChange, className }: TabSwitcherProps) {
  return (
    <div className={cn("flex items-center bg-white rounded-tab p-[3.6px] gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-5 py-[3.6px] rounded-tab text-nav text-primary transition-colors",
            activeId === tab.id ? "bg-cardbg" : "hover:bg-mainbg"
          )}
        >
          {tab.icon && <span className="w-[22px] h-[22px] shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
