import { useState, useEffect } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/shared/auth/tokens";
import { listApps, type App } from "@/shared/api/apps";
import { listPages, type PageRead } from "@/shared/api/views";
import { listEntities, type EntityRead, type FieldRead } from "@/shared/api/entities";
import { listRecords, createRecord, type RecordRead } from "@/shared/api/records";

interface PageBlock {
  id: string;
  type: string;
  title: string | null;
  config: Record<string, unknown>;
}

interface DesignConfig {
  accent?: string;
  show_header?: boolean;
}

function RuntimeShell() {
  const [params] = useSearchParams();
  const appId = params.get("app");
  const preview = params.get("preview") === "true";
  const pageParam = params.get("page");

  const authed = isAuthenticated();
  const queryClient = useQueryClient();

  // Listen for messages from the editor (refetch data, navigate to page)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === "RT_REFETCH") {
        void queryClient.invalidateQueries();
      }
      if (e.data.type === "RT_NAVIGATE" && e.data.pageId) {
        setActivePageId(e.data.pageId as string);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [queryClient]);

  const appsQuery = useQuery({
    queryKey: ["rt-apps"],
    queryFn: () => listApps(),
    enabled: authed,
  });

  const app: App | undefined = appId
    ? appsQuery.data?.items.find((a) => a.id === appId)
    : appsQuery.data?.items[0];
  const resolvedAppId = app?.id;

  const pagesQuery = useQuery({
    queryKey: ["rt-pages", resolvedAppId],
    queryFn: () => listPages(resolvedAppId!),
    enabled: authed && !!resolvedAppId,
  });
  const entitiesQuery = useQuery({
    queryKey: ["rt-entities", resolvedAppId],
    queryFn: () => listEntities(resolvedAppId!),
    enabled: authed && !!resolvedAppId,
  });

  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [viewportW, setViewportW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Preselect page from URL param or first page
  const pages = pagesQuery.data ?? [];
  const navPages = preview ? pages : (pages.filter((p) => p.is_published).length > 0
    ? pages.filter((p) => p.is_published)
    : pages);

  useEffect(() => {
    if (navPages.length === 0) return;
    if (pageParam && navPages.find((p) => p.id === pageParam)) {
      setActivePageId(pageParam);
    } else if (!activePageId || !navPages.find((p) => p.id === activePageId)) {
      setActivePageId(navPages[0].id);
    }
  }, [navPages.map((p) => p.id).join(","), pageParam]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authed) {
    return (
      <Centered>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span>Чтобы открыть приложение, войдите в систему.</span>
          <a
            href="/editor/signin"
            style={{ background: "#35A7FF", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 500 }}
          >
            Войти
          </a>
        </div>
      </Centered>
    );
  }
  if (appsQuery.isLoading || (resolvedAppId && (pagesQuery.isLoading || entitiesQuery.isLoading))) {
    return <Centered>Загрузка приложения…</Centered>;
  }
  if (!app) {
    return <Centered>Приложение не найдено. Откройте его из конструктора.</Centered>;
  }

  const activePage = navPages.find((p) => p.id === activePageId) ?? navPages[0] ?? null;
  const accent = (activePage?.layout?.design as DesignConfig | undefined)?.accent ?? "#35A7FF";
  const entities = entitiesQuery.data ?? [];
  const narrow = viewportW < 520;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F6FF", color: "#00205F", fontFamily: "Inter, sans-serif" }}>
      {/* App bar */}
      <header style={{ height: 56, background: accent, color: "#fff", display: "flex", alignItems: "center", padding: "0 20px", fontWeight: 600, fontSize: 18, flexShrink: 0 }}>
        {app.name}
      </header>

      {/* Horizontal tab nav on narrow screens */}
      {navPages.length > 1 && narrow && (
        <nav style={{ display: "flex", overflowX: "auto", gap: 4, padding: "8px 12px", background: "#fff", borderBottom: "1px solid #CBE3FF" }}>
          {navPages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePageId(p.id)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontSize: 13, whiteSpace: "nowrap",
                background: p.id === activePage?.id ? accent : "#F1F6FF",
                color: p.id === activePage?.id ? "#fff" : "#00205F",
                fontWeight: p.id === activePage?.id ? 600 : 400,
              }}
            >
              {p.title}
            </button>
          ))}
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 1100, margin: "0 auto", padding: narrow ? "12px 12px" : 16, gap: 16 }}>
        {/* Sidebar nav on wide screens */}
        {navPages.length > 1 && !narrow && (
          <nav style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {navPages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePageId(p.id)}
                style={{
                  textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 15, background: p.id === activePage?.id ? "#CBE3FF" : "transparent",
                  color: p.id === activePage?.id ? accent : "#00205F", fontWeight: p.id === activePage?.id ? 600 : 400,
                }}
              >
                {p.title}
              </button>
            ))}
          </nav>
        )}

        {/* Page body */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {!activePage ? (
            <Centered>В приложении пока нет страниц.</Centered>
          ) : (
            <PageView page={activePage} appId={app.id} entities={entities} accent={accent} pages={navPages} onNavigate={setActivePageId} />
          )}
        </main>
      </div>
    </div>
  );
}

function PageView({ page, appId, entities, accent, onNavigate }: {
  page: PageRead; appId: string; entities: EntityRead[]; accent: string;
  pages: PageRead[]; onNavigate: (id: string) => void;
}) {
  const design = (page.layout?.design as DesignConfig | undefined) ?? {};
  const entityId = page.layout?.entity_id as string | undefined;
  const entity = entities.find((e) => e.id === entityId) ?? null;
  const blocks = (page.blocks ?? []) as unknown as PageBlock[];

  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entity?.id],
    queryFn: () => listRecords(appId, entity!.id, { limit: 50 }),
    enabled: !!entity,
  });
  const records = recordsQuery.data?.items ?? [];
  const cols = (entity?.fields ?? []).filter((f) => !f.is_system);

  return (
    <div>
      {(design.show_header ?? true) && (
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>{page.title}</h1>
      )}
      {blocks.length === 0 && <Centered>На этой странице ещё нет блоков.</Centered>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {blocks.map((b) => (
          <Block
            key={b.id}
            block={b}
            entity={entity}
            cols={cols}
            records={records}
            accent={accent}
            appId={appId}
            onNavigate={onNavigate}
            onRecordCreated={() => recordsQuery.refetch()}
          />
        ))}
      </div>
    </div>
  );
}

function Block({ block, entity, cols, records, accent, appId, onNavigate, onRecordCreated }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  appId: string;
  onNavigate: (id: string) => void;
  onRecordCreated: () => void;
}) {
  if (block.type === "divider") {
    return <hr style={{ border: "none", borderTop: "1px solid #CBE3FF", margin: "4px 0" }} />;
  }

  if (block.type === "rich_text") {
    const text = (block.config?.text as string) ?? block.title ?? "";
    return (
      <div style={{ background: "#F1F6FF", borderRadius: 10, padding: 16, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {text}
      </div>
    );
  }

  if (block.type === "metric") {
    return (
      <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, padding: 16, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, color: "#8898AA" }}>{block.title ?? "Метрика"}</span>
        <span style={{ fontSize: 40, fontWeight: 700, color: accent }}>{(block.config?.value as string) ?? "—"}</span>
      </section>
    );
  }

  if (block.type === "kpi") {
    const value = (block.config?.value as string) || String(records.length);
    const trend = (block.config?.trend as string) ?? "+0%";
    const positive = !trend.trim().startsWith("-");
    return (
      <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, padding: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 13, color: "#8898AA" }}>{block.title ?? "KPI"}</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#00205F" }}>{value}</span>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: positive ? "#DCFCE7" : "#FEE2E2", color: positive ? "#15803D" : "#B91C1C" }}>
          {trend}
        </span>
      </section>
    );
  }

  if (block.type === "iframe") {
    const src = (block.config?.src as string) ?? "";
    return (
      <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 14, color: "#5b6b86" }}>
          {block.title ?? "Фрейм"}
        </div>
        {src ? (
          <iframe src={src} style={{ width: "100%", height: 320, border: 0 }} title={block.title ?? "iframe"} />
        ) : (
          <div style={{ padding: 20, color: "#8898AA", fontSize: 13 }}>URL не задан</div>
        )}
      </section>
    );
  }

  if (block.type === "button") {
    const cfg = block.config ?? {};
    const actionType = (cfg.actionType as string) ?? "url";
    const href = (cfg.href as string) ?? "";
    const targetPageId = (cfg.targetPageId as string) ?? "";
    const targetBlockId = (cfg.targetBlockId as string) ?? "";
    const fontSize = Number((cfg.fontSize as string) ?? 15);
    const radiusVal = (cfg.radius as string) ?? "rounded";
    const widthVal = (cfg.width as string) ?? "full";
    const radiusMap: Record<string, number> = { sharp: 4, rounded: 8, pill: 9999 };
    const widthMap: Record<string, string> = { full: "100%", half: "50%", third: "33.333%", auto: "auto" };

    const style: React.CSSProperties = {
      background: accent, color: "#fff", border: "none",
      borderRadius: radiusMap[radiusVal] ?? 8,
      padding: "10px 20px", fontSize, fontWeight: 500,
      cursor: "pointer", textDecoration: "none", display: "inline-block",
      width: widthMap[widthVal] ?? "100%", textAlign: "center",
      boxSizing: "border-box",
    };

    function handleClick() {
      if (actionType === "page" && targetPageId) {
        onNavigate(targetPageId);
      } else if (actionType === "block" && targetBlockId) {
        const el = document.getElementById(targetBlockId) ?? document.querySelector(`[data-block="${targetBlockId}"]`);
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        alert("Действие кнопки не настроено");
      }
    }

    if (actionType === "url" && href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
          {block.title ?? "Кнопка"}
        </a>
      );
    }
    return (
      <button style={style} onClick={handleClick}>
        {block.title ?? "Кнопка"}
      </button>
    );
  }

  if (block.type === "form") {
    return (
      <FormBlock
        block={block}
        entity={entity}
        cols={cols}
        appId={appId}
        accent={accent}
        onSuccess={onRecordCreated}
      />
    );
  }

  // table (default)
  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between" }}>
        <span>{block.title ?? entity?.display_name ?? "Таблица"}</span>
        <span style={{ color: "#8898AA", fontWeight: 400, fontSize: 13 }}>{records.length} записей</span>
      </div>
      {cols.length === 0 ? (
        <p style={{ padding: 14, color: "#8898AA", fontSize: 14 }}>Таблица не выбрана.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #CBE3FF" }}>
                {cols.slice(0, 6).map((f) => (
                  <th key={f.id} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#5b6b86", whiteSpace: "nowrap" }}>{f.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: "1px solid #F1F6FF" }}>
                  {cols.slice(0, 6).map((f) => (
                    <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{formatCell(rec.payload[f.name], f)}</td>
                  ))}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 14, color: "#8898AA" }}>Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FormBlock({ block, entity, cols, appId, accent, onSuccess }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  appId: string;
  accent: string;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entity || status === "submitting") return;
    setStatus("submitting");
    try {
      const payload: Record<string, unknown> = {};
      cols.forEach((f) => {
        const v = values[f.name];
        if (v !== undefined && v !== "") payload[f.name] = v;
      });
      await createRecord(appId, entity.id, { payload });
      setValues({});
      setStatus("success");
      onSuccess();
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, padding: 16, background: "#fff" }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{block.title ?? "Форма"}</h3>
      {cols.length === 0 ? (
        <p style={{ color: "#8898AA", fontSize: 14 }}>Таблица не выбрана.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cols.slice(0, 8).map((f) => (
            <label key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#5b6b86" }}>
              {f.display_name}{f.is_required && " *"}
              {f.field_type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={values[f.name] === "true"}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked ? "true" : "false" }))}
                  style={{ width: 20, height: 20, cursor: "pointer" }}
                />
              ) : (
                <input
                  type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={`Введите ${f.display_name.toLowerCase()}`}
                  required={f.is_required}
                  style={{ height: 36, borderRadius: 8, border: "1px solid #CBE3FF", padding: "0 12px", background: "#F1F6FF", fontSize: 14, outline: "none" }}
                />
              )}
            </label>
          ))}

          {status === "success" && (
            <p style={{ color: "#15803D", fontSize: 13, fontWeight: 500 }}>✓ Запись сохранена</p>
          )}
          {status === "error" && (
            <p style={{ color: "#B91C1C", fontSize: 13 }}>Ошибка при сохранении. Попробуйте ещё раз.</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              alignSelf: "flex-start", background: accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px", marginTop: 4, fontSize: 14,
              cursor: status === "submitting" ? "not-allowed" : "pointer",
              opacity: status === "submitting" ? 0.7 : 1,
            }}
          >
            {status === "submitting" ? "Сохранение…" : "Сохранить"}
          </button>
        </form>
      )}
    </section>
  );
}

function formatCell(value: unknown, field: FieldRead): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "boolean") return value ? "✓" : "✗";
  if (field.field_type === "select") {
    const choices = (field.field_options?.choices as { value: string; label: string }[]) ?? [];
    return choices.find((c) => c.value === value)?.label ?? String(value);
  }
  return String(value);
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240, color: "#5b6b86", fontSize: 15, fontFamily: "Inter, sans-serif", padding: 24, textAlign: "center" }}>
      {children}
    </div>
  );
}

export function RuntimeApp() {
  return (
    <BrowserRouter basename="/app">
      <RuntimeShell />
    </BrowserRouter>
  );
}
