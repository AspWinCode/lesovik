import { useState } from "react";
import { TabSwitcher } from "@/components/ui/TabSwitcher";

interface PreviewPanelProps {
  projectName?: string;
  previewImageUrl?: string;
  onOpen?: () => void;
}

export function PreviewPanel({ projectName = "Fitness App", previewImageUrl, onOpen }: PreviewPanelProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  const tabs = [
    {
      id: "mobile",
      label: "Смартфон",
      icon: (
        <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
          <rect x="4" y="1" width="15" height="21" rx="3" stroke="#00205F" strokeWidth="2"/>
          <circle cx="11.5" cy="18.5" r="1" fill="#00205F"/>
        </svg>
      ),
    },
    {
      id: "desktop",
      label: "Десктоп",
      icon: (
        <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
          <rect x="1" y="2" width="21" height="14" rx="2" stroke="#00205F" strokeWidth="2"/>
          <path d="M7 20 L16 20" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
          <path d="M11.5 16 L11.5 20" stroke="#00205F" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      className="absolute top-[70px] right-0 bg-mainbg flex flex-col items-center gap-[70px]"
      style={{
        width: 580,
        height: 1000,
        borderRadius: "5px 20px 20px 5px",
        paddingTop: 7,
      }}
    >
      {/* Device toggle */}
      <TabSwitcher
        tabs={tabs}
        activeId={device}
        onChange={(id) => setDevice(id as "mobile" | "desktop")}
        className="w-[348px]"
      />

      {/* Preview image */}
      <div
        className="bg-cardbg overflow-hidden shrink-0"
        style={{
          width: 380,
          height: 800,
          borderRadius: 60,
        }}
      >
        {previewImageUrl ? (
          <img src={previewImageUrl} alt="Превью" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40 text-sm">
            Превью недоступно
          </div>
        )}
      </div>

      {/* Open app button */}
      <button
        onClick={onOpen}
        className="flex items-center justify-center gap-5 bg-cta text-white text-cta-lg
                   rounded-btn px-10 py-[10px] hover:bg-active transition-colors"
        style={{ width: 331 }}
      >
        Открыть {projectName}
      </button>
    </div>
  );
}
