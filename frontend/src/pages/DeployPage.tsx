import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import { useApps, usePublishApp, useAppSnapshots, useCreateSnapshot, useRollbackSnapshot } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { usePages, usePublishPage, useUnpublishPage } from "@/shared/hooks/usePages";

type DeploySection = "publish" | "versions" | "pages" | "monitoring";

const NAV_ITEMS: { id: DeploySection; label: string; icon: React.ReactNode }[] = [
  { id: "publish",    label: "Публикация",    icon: <PublishNavIcon /> },
  { id: "versions",  label: "Версии",         icon: <VersionIcon /> },
  { id: "pages",     label: "Страницы",       icon: <PagesNavIcon /> },
  { id: "monitoring",label: "Мониторинг",     icon: <MonitorIcon /> },
];

export function DeployPage() {
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [active, setActive]         = useState<DeploySection>("publish");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const navigate = useNavigate();

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const publishMutation = usePublishApp();

  function handlePublish() {
    if (app) publishMutation.mutate(app.id);
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail
        active={railModule}
        onChange={setRailModule}
        onCollapse={() => setNavCollapsed((v) => !v)}
        collapsed={navCollapsed}
      />

      {/* ── Sidebar ── */}
      {!navCollapsed && (
        <aside
          className="absolute bg-white overflow-y-auto border-r border-cardbg flex flex-col"
          style={{ left: 85, top: 70, width: 295, height: 1010 }}
        >
          <div className="flex items-center px-5 py-4 border-b border-cardbg gap-[10px]">
            <span className="text-[18px] font-semibold text-primary">Управление</span>
            {app?.is_published && (
              <span className="h-[20px] px-[8px] flex items-center rounded-[10px] bg-green-100 text-green-700 text-[11px] font-medium">
                Опубликовано
              </span>
            )}
          </div>

          {app && (
            <div className="px-5 py-3 border-b border-cardbg bg-mainbg/50">
              <p className="text-[13px] font-medium text-primary truncate">{app.name}</p>
              <p className="text-[12px] text-primary/40 mt-[2px]">
                Версия {app.version}
                {app.is_published ? " · опубликовано" : " · черновик"}
              </p>
            </div>
          )}

          <nav className="py-2 flex-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 text-left text-[15px] px-5 py-[10px] transition-colors",
                  active === item.id
                    ? "bg-[#EBF4FF] text-cta font-medium"
                    : "text-primary hover:bg-mainbg",
                )}
              >
                <span className="w-5 h-5 shrink-0">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="border-t border-cardbg">
            <button
              onClick={() => navigate("/preview")}
              className="w-full flex items-center gap-2 px-5 py-3 text-[13px] text-cta hover:bg-mainbg transition-colors font-medium"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5z" />
                <circle cx="8" cy="8" r="2" />
              </svg>
              Предпросмотр →
            </button>
          </div>
        </aside>
      )}

      {/* ── Main ── */}
      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{
          left: navCollapsed ? 90 : 380,
          top: 70,
          width: navCollapsed ? 1545 : 1255,
          height: 1010,
          transition: "left 0.2s, width 0.2s",
        }}
      >
        {active === "publish"    && <PublishSection app={app} onPublish={handlePublish} publishing={publishMutation.isPending} />}
        {active === "versions"   && <VersionsSection appId={app?.id} />}
        {active === "pages"      && <PagesSection appId={app?.id} />}
        {active === "monitoring" && <MonitoringSection />}
      </main>

      <PreviewPanel projectName={app?.name ?? "Приложение"} />
    </div>
  );
}

/* ── Publish section ─────────────────────────────────────────────────── */

function PublishSection({
  app,
  onPublish,
  publishing,
}: {
  app: { id: string; name: string; is_published: boolean; version: number } | undefined;
  onPublish: () => void;
  publishing: boolean;
}) {
  const checks = [
    { label: "Схема данных сущностей настроена",       status: "success" as const },
    { label: "Хотя бы одна страница создана",          status: app ? "success" as const : "warn" as const },
    { label: "Права доступа настроены",                status: "success" as const },
    { label: "Рабочие процессы активированы",          status: "info" as const },
  ];

  return (
    <div className="px-[40px] py-[30px] max-w-[820px]">
      <h2 className="text-[22px] font-bold text-primary mb-[6px]">Публикация приложения</h2>
      <p className="text-[14px] text-primary/55 mb-[24px]">
        После публикации приложение становится доступным пользователям с нужными ролями.
      </p>

      {/* Status card */}
      <div className={cn(
        "rounded-[12px] border p-[20px] mb-[24px] flex items-center gap-[16px]",
        app?.is_published
          ? "bg-green-50 border-green-200"
          : "bg-white border-cardbg",
      )}>
        <div className={cn(
          "w-[48px] h-[48px] rounded-full flex items-center justify-center shrink-0",
          app?.is_published ? "bg-green-100" : "bg-mainbg",
        )}>
          {app?.is_published ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-green-600">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary/40">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <p className={cn("text-[15px] font-semibold", app?.is_published ? "text-green-700" : "text-primary")}>
            {app?.is_published ? "Приложение опубликовано" : "Приложение не опубликовано"}
          </p>
          <p className="text-[13px] text-primary/50 mt-[2px]">
            {app?.is_published
              ? "Пользователи имеют доступ к текущей версии"
              : "Опубликуйте, чтобы сделать приложение доступным"}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden mb-[24px]">
        <div className="px-[16px] py-[10px] border-b border-cardbg bg-[#F5F6F8]">
          <span className="text-[12px] font-semibold text-primary/50">Проверка готовности</span>
        </div>
        {checks.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-[16px] py-[12px] border-b border-cardbg last:border-b-0">
            <span className="text-[14px] text-primary">{c.label}</span>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="flex items-center gap-[12px]">
        <button
          onClick={onPublish}
          disabled={publishing || !app}
          className="flex items-center gap-[8px] h-[40px] px-[20px] bg-cta text-white text-[14px] font-medium rounded-btn hover:bg-active transition-colors disabled:opacity-60"
        >
          <PublishNavIcon />
          {publishing ? "Публикация…" : app?.is_published ? "Переопубликовать" : "Опубликовать"}
        </button>
        <button
          onClick={() => void 0}
          className="h-[40px] px-[16px] border border-cardbg bg-white text-[14px] text-primary rounded-btn hover:border-cta hover:text-cta transition-colors"
        >
          Предпросмотр
        </button>
      </div>
    </div>
  );
}

/* ── Versions section ────────────────────────────────────────────────── */

function VersionsSection({ appId }: { appId: string | undefined }) {
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState<number | null>(null);

  const snapshotsQuery  = useAppSnapshots(appId);
  const snapshots       = (snapshotsQuery.data ?? []).slice().reverse();
  const createMutation  = useCreateSnapshot();
  const rollbackMutation = useRollbackSnapshot();

  function handleCreate() {
    if (!appId) return;
    createMutation.mutate(
      { appId, comment: comment.trim() || null },
      { onSuccess: () => { setShowForm(false); setComment(""); } },
    );
  }

  function handleRollback(snapshotNum: number) {
    if (!appId) return;
    rollbackMutation.mutate({ appId, snapshotNum }, {
      onSuccess: () => setConfirmRollback(null),
    });
  }

  return (
    <div className="px-[40px] py-[30px] max-w-[820px]">
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h2 className="text-[22px] font-bold text-primary">Снимки версий</h2>
          <p className="text-[13px] text-primary/50 mt-[4px]">
            Создавайте контрольные точки и откатывайтесь к ним при необходимости
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-[6px] h-[36px] px-[14px] bg-cta text-white text-[13px] font-medium rounded-btn hover:bg-active transition-colors"
        >
          <span className="text-[16px] leading-none">+</span>
          Создать снимок
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-[10px] border border-cta/30 px-[20px] py-[16px] mb-[16px] flex items-center gap-[12px]">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий к снимку (опционально)"
            className="flex-1 h-[34px] px-[12px] rounded-btn border border-cardbg bg-mainbg text-[13px] text-primary focus:outline-none focus:border-cta"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !appId}
            className="h-[34px] px-[14px] bg-cta text-white text-[13px] rounded-btn hover:bg-active transition-colors disabled:opacity-60"
          >
            {createMutation.isPending ? "Создаём…" : "Создать"}
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="h-[34px] px-[10px] text-primary/50 hover:text-primary transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Snapshot list */}
      {snapshotsQuery.isLoading && (
        <div className="text-[13px] text-primary/40 py-8 text-center">Загрузка…</div>
      )}

      {!snapshotsQuery.isLoading && snapshots.length === 0 && (
        <div className="bg-white rounded-[10px] border border-dashed border-cardbg py-[40px] text-center">
          <VersionIcon />
          <p className="text-[14px] text-primary/40 mt-[10px]">Снимков ещё нет</p>
          <p className="text-[12px] text-primary/30 mt-[4px]">Создайте первый снимок для фиксации текущей версии</p>
        </div>
      )}

      <div className="flex flex-col gap-[8px]">
        {snapshots.map((snap) => (
          <div
            key={snap.id}
            className="bg-white rounded-[10px] border border-cardbg px-[20px] py-[14px] flex items-center gap-[16px]"
          >
            <div className="w-[36px] h-[36px] rounded-[8px] bg-mainbg flex items-center justify-center shrink-0">
              <span className="text-[13px] font-bold text-primary/60">#{snap.snapshot_num}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-primary truncate">
                {snap.comment ?? `Снимок #${snap.snapshot_num}`}
              </p>
              <p className="text-[12px] text-primary/40 mt-[2px]">
                {new Date(snap.created_at).toLocaleString("ru", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>

            {confirmRollback === snap.snapshot_num ? (
              <div className="flex items-center gap-[6px]">
                <span className="text-[12px] text-amber-600 font-medium">Откатить?</span>
                <button
                  onClick={() => handleRollback(snap.snapshot_num)}
                  disabled={rollbackMutation.isPending}
                  className="h-[28px] px-[10px] bg-amber-500 text-white text-[12px] rounded-btn hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {rollbackMutation.isPending ? "…" : "Да"}
                </button>
                <button
                  onClick={() => setConfirmRollback(null)}
                  className="h-[28px] px-[10px] border border-cardbg text-primary text-[12px] rounded-btn hover:bg-mainbg transition-colors"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRollback(snap.snapshot_num)}
                className="h-[30px] px-[12px] border border-cardbg text-[12px] text-primary/60 rounded-btn hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                Откатить
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Pages section ───────────────────────────────────────────────────── */

function PagesSection({ appId }: { appId: string | undefined }) {
  const pagesQuery     = usePages(appId);
  const pages          = (pagesQuery.data ?? []).slice().sort((a, b) => a.nav_order - b.nav_order);
  const publishPage    = usePublishPage(appId ?? "");
  const unpublishPage  = useUnpublishPage(appId ?? "");

  return (
    <div className="px-[40px] py-[30px] max-w-[820px]">
      <div className="mb-[24px]">
        <h2 className="text-[22px] font-bold text-primary">Страницы</h2>
        <p className="text-[13px] text-primary/50 mt-[4px]">
          Управляйте публикацией отдельных страниц приложения
        </p>
      </div>

      {pagesQuery.isLoading && (
        <div className="text-[13px] text-primary/40 py-8 text-center">Загрузка…</div>
      )}

      {!pagesQuery.isLoading && pages.length === 0 && (
        <div className="bg-white rounded-[10px] border border-dashed border-cardbg py-[40px] text-center">
          <p className="text-[14px] text-primary/40">Страниц нет. Создайте их в разделе Представления.</p>
        </div>
      )}

      <div className="bg-white rounded-[10px] border border-cardbg overflow-hidden">
        {/* Header row */}
        {pages.length > 0 && (
          <div className="grid px-[16px] py-[8px] bg-[#F5F6F8] border-b border-cardbg text-[12px] font-semibold text-primary/50"
            style={{ gridTemplateColumns: "1fr 120px 160px 100px" }}
          >
            <span>Страница</span>
            <span>Порядок</span>
            <span>Обновлена</span>
            <span>Статус</span>
          </div>
        )}

        {pages.map((page) => {
          const isPending =
            (publishPage.isPending && publishPage.variables === page.id) ||
            (unpublishPage.isPending && unpublishPage.variables === page.id);

          return (
            <div
              key={page.id}
              className="grid items-center px-[16px] py-[12px] border-b border-cardbg last:border-b-0 hover:bg-mainbg/40 transition-colors"
              style={{ gridTemplateColumns: "1fr 120px 160px 100px" }}
            >
              <div className="flex items-center gap-[10px] min-w-0">
                {page.icon ? (
                  <span className="text-[16px] leading-none shrink-0">{page.icon}</span>
                ) : (
                  <PagesNavIcon />
                )}
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-primary truncate">{page.title}</p>
                  <p className="text-[12px] text-primary/40 font-mono">/{page.slug}</p>
                </div>
              </div>

              <span className="text-[13px] text-primary/50">#{page.nav_order}</span>

              <span className="text-[12px] text-primary/40">
                {new Date(page.updated_at).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "numeric" })}
              </span>

              <button
                onClick={() =>
                  page.is_published
                    ? unpublishPage.mutate(page.id)
                    : publishPage.mutate(page.id)
                }
                disabled={isPending || !appId}
                className={cn(
                  "h-[28px] px-[10px] rounded-btn text-[12px] font-medium transition-colors disabled:opacity-60",
                  page.is_published
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-mainbg text-primary/60 hover:bg-cardbg border border-cardbg",
                )}
              >
                {isPending
                  ? "…"
                  : page.is_published
                  ? "Опубликована"
                  : "Черновик"}
              </button>
            </div>
          );
        })}
      </div>

      {pages.length > 0 && (
        <p className="text-[12px] text-primary/35 mt-[10px]">
          {pages.filter((p) => p.is_published).length} из {pages.length} страниц опубликовано
        </p>
      )}
    </div>
  );
}

/* ── Monitoring section ──────────────────────────────────────────────── */

function MonitoringSection() {
  const metrics = [
    { label: "Активных пользователей", value: "—", sub: "за последние 24 ч" },
    { label: "Запросов к API",         value: "—", sub: "за последние 24 ч" },
    { label: "Среднее время ответа",   value: "—", sub: "мс" },
  ];

  return (
    <div className="px-[40px] py-[30px] max-w-[820px]">
      <h2 className="text-[22px] font-bold text-primary mb-[6px]">Мониторинг</h2>
      <p className="text-[13px] text-primary/50 mb-[24px]">Статистика использования и состояние приложения</p>

      <div className="grid grid-cols-3 gap-[12px] mb-[24px]">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-[10px] border border-cardbg px-[16px] py-[14px]">
            <p className="text-[12px] text-primary/50 mb-[4px]">{m.label}</p>
            <p className="text-[28px] font-bold text-primary">{m.value}</p>
            <p className="text-[11px] text-primary/35 mt-[2px]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[10px] border border-dashed border-cardbg py-[40px] text-center">
        <MonitorIcon />
        <p className="text-[13px] text-primary/40 mt-[10px]">Детальная аналитика будет доступна после публикации</p>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: "error" | "warn" | "success" | "info" }) {
  const map = {
    error:   { bg: "bg-[#FFEBEE]", text: "text-[#D32F2F]", label: "Ошибка" },
    warn:    { bg: "bg-[#FFF8E1]", text: "text-[#E65100]", label: "Предупреждение" },
    success: { bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]", label: "Готово" },
    info:    { bg: "bg-[#EBF4FF]", text: "text-cta",        label: "Информация" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("text-[12px] font-medium px-[10px] py-[4px] rounded-[20px]", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────── */
const C = "currentColor";

function PublishNavIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full" style={{ width: 20, height: 20 }}>
      <path d="M10 4v9M7 7l3-3 3 3" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15h12" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function VersionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full" style={{ width: 20, height: 20 }}>
      <circle cx="10" cy="10" r="7" stroke={C} strokeWidth="1.5" />
      <path d="M10 6v4l3 2" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PagesNavIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full" style={{ width: 20, height: 20 }}>
      <rect x="4" y="2" width="12" height="16" rx="2" stroke={C} strokeWidth="1.5" />
      <path d="M8 7h4M8 10h4M8 13h2" stroke={C} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full" style={{ width: 20, height: 20 }}>
      <rect x="2" y="3" width="16" height="11" rx="2" stroke={C} strokeWidth="1.5" />
      <path d="M7 17h6M10 14v3" stroke={C} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 10l2-3 3 4 2-2 3 1" stroke={C} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
