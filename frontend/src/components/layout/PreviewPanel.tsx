import { useState } from "react";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { buildRuntimeUrl } from "@/shared/lib/appLinks";

interface PreviewPanelProps {
  projectName?: string;
  appId?: string | null;
  onOpen?: () => void;
}

export function PreviewPanel({ projectName = "Fitness App", appId, onOpen }: PreviewPanelProps) {
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

  const isMobile = device === "mobile";
  const frameW = isMobile ? 380 : 560;
  const frameH = isMobile ? 800 : 500;
  const outerR = isMobile ? 60 : 20;

  const runtimeUrl = appId ? buildRuntimeUrl(appId, window.location.origin) : null;

  return (
    <div
      className="absolute top-[70px] right-0 bg-mainbg flex flex-col items-center gap-[40px]"
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

      {/* Preview frame */}
      <div
        className="bg-cardbg overflow-hidden shrink-0 relative"
        style={{
          width: frameW,
          height: frameH,
          borderRadius: outerR,
          transition: "width 0.25s, height 0.25s, border-radius 0.25s",
        }}
      >
        {runtimeUrl ? (
          <iframe
            key={`${appId}-${device}`}
            src={runtimeUrl}
            title={projectName}
            style={{
              width: isMobile ? "100%" : "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40 text-sm">
            Выберите приложение
          </div>
        )}
      </div>

      {/* Open app button */}
      <button
        onClick={onOpen}
        disabled={!onOpen}
        title={onOpen ? undefined : "Откройте предпросмотр из конструктора"}
        className="flex items-center justify-center gap-5 bg-cta text-white text-cta-lg
                   rounded-btn px-10 py-[10px] hover:bg-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ width: 331 }}
      >
        Открыть {projectName}
      </button>
    </div>
  );
}
