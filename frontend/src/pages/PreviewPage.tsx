import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useApps, usePublishApp } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { usePages } from "@/shared/hooks/usePages";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1200, h: 750,  label: "Десктоп" },
  tablet:  { w: 768,  h: 960,  label: "Планшет" },
  mobile:  { w: 375,  h: 667,  label: "Мобильный" },
};

export function PreviewPage() {
  const [device, setDevice] = useState<Device>("desktop");
  const [activePage, setActivePage] = useState<string | null>(null);
  const navigate = useNavigate();

  const appsQuery  = useApps();
  const app        = useActiveApp(appsQuery.data?.items ?? []);
  const pagesQuery = usePages(app?.id);
  const pages      = (pagesQuery.data ?? []).slice().sort((a, b) => a.nav_order - b.nav_order);

  const publishMutation = usePublishApp();

  const { w, h } = DEVICE_SIZES[device];
  const scale = Math.min(1, 1680 / (w + 40), 880 / (h + 60));

  const currentPageId = activePage ?? pages[0]?.id ?? null;
  const iframeSrc = app
    ? `/runtime?app=${app.id}&preview=true${currentPageId ? `&page=${currentPageId}` : ""}`
    : null;

  const publishedAt = (app as (typeof app & { published_at?: string | null }) | undefined)?.published_at;

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 h-[60px] border-b border-cardbg bg-white shrink-0 z-10">
        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-primary/60 hover:text-primary hover:bg-mainbg transition-colors"
          >
            <BackIcon />
          </button>
          <span className="text-[16px] font-semibold text-primary">
            {app ? app.name : "Предпросмотр"}
          </span>
          {app?.is_published && (
            <span className="h-[20px] px-[8px] flex items-center rounded-[10px] bg-green-100 text-green-700 text-[11px] font-medium">
              Опубликовано
            </span>
          )}
          {publishedAt && (
            <span className="text-[12px] text-primary/35">
              {new Date(publishedAt).toLocaleString("ru", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-[4px] bg-mainbg rounded-[8px] p-[4px]">
          {(Object.entries(DEVICE_SIZES) as [Device, { w: number; h: number; label: string }][]).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              className={cn(
                "flex items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] transition-colors",
                device === key
                  ? "bg-white text-cta shadow-sm font-medium"
                  : "text-primary/60 hover:text-primary",
              )}
            >
              {key === "desktop" && <DesktopIcon />}
              {key === "tablet"  && <TabletIcon />}
              {key === "mobile"  && <MobileIcon />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => app && publishMutation.mutate(app.id)}
            disabled={publishMutation.isPending || !app}
            className="flex items-center gap-[6px] h-[34px] px-[14px] bg-cta text-white text-[13px] font-medium rounded-btn hover:bg-active transition-colors disabled:opacity-60"
          >
            <PublishIcon />
            {publishMutation.isPending
              ? "Публикация…"
              : app?.is_published
              ? "Переопубликовать"
              : "Опубликовать"}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-[6px] h-[34px] px-[12px] bg-mainbg text-primary text-[13px] rounded-btn hover:bg-cardbg transition-colors"
          >
            <CloseIcon />
            Закрыть
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Pages sidebar ── */}
        {pages.length > 0 && (
          <aside className="w-[220px] border-r border-cardbg bg-white flex flex-col shrink-0">
            <div className="px-[16px] py-[10px] border-b border-cardbg">
              <span className="text-[11px] font-semibold text-primary/40 uppercase tracking-wide">
                Страницы
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto py-[4px]">
              {pages.map((page) => {
                const isActive = (activePage ?? pages[0]?.id) === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => setActivePage(page.id)}
                    className={cn(
                      "w-full flex items-center gap-[8px] text-left px-[16px] py-[9px] text-[13px] transition-colors",
                      isActive
                        ? "bg-[#EBF4FF] text-cta font-medium"
                        : "text-primary/70 hover:bg-mainbg",
                    )}
                  >
                    {page.icon ? (
                      <span className="text-[14px] leading-none shrink-0">{page.icon}</span>
                    ) : (
                      <PageIcon className="w-3.5 h-3.5 shrink-0 text-primary/30" />
                    )}
                    <span className="flex-1 truncate">{page.title}</span>
                    {page.is_published && (
                      <span
                        className="w-[6px] h-[6px] rounded-full bg-green-400 shrink-0"
                        title="Опубликована"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-cardbg px-[16px] py-[10px]">
              <p className="text-[11px] text-primary/30">
                {pages.filter((p) => p.is_published).length} из {pages.length} опубликовано
              </p>
            </div>
          </aside>
        )}

        {/* ── Preview canvas ── */}
        <div className="flex-1 bg-[#DDE3EC] flex flex-col items-center justify-center overflow-hidden relative">
          {/* Size pill */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 bg-black/20 text-white text-[11px] px-[10px] py-[3px] rounded-full select-none pointer-events-none">
            {w} × {h} · {Math.round(scale * 100)}%
          </div>

          {iframeSrc ? (
            <div
              style={{
                width: w,
                height: h,
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                flexShrink: 0,
              }}
              className="rounded-[12px] shadow-2xl overflow-hidden bg-white"
            >
              <iframe
                key={`${app?.id}-${currentPageId}-${device}`}
                src={iframeSrc}
                width={w}
                height={h}
                className="w-full h-full border-0 block"
                title="Предпросмотр приложения"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-[10px]">
              <div className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center">
                <DesktopIcon className="w-6 h-6 text-white/60" />
              </div>
              <p className="text-[14px] text-white/60">
                {appsQuery.isLoading ? "Загрузка приложения…" : "Нет приложений"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PublishIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function PageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 16" fill="none">
      <rect x="1" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 5h6M4 8h6M4 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className ?? "w-4 h-4"}>
      <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function TabletIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
function MobileIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <rect x="4" y="1" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
