import { useState, useEffect, useRef } from "react";
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
  theme?: "light" | "dark";
  density?: "compact" | "normal" | "spacious";
  font_family?: string;
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
      // Direct layout patch — updates page in query cache immediately without a round-trip
      if (e.data.type === "RT_PAGE_LAYOUT" && e.data.pageId && e.data.layout) {
        queryClient.setQueriesData<PageRead[]>(
          { queryKey: ["rt-pages"] },
          (old) => old?.map((p) =>
            p.id === e.data.pageId ? { ...p, layout: e.data.layout as Record<string, unknown> } : p
          )
        );
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
  const design = (activePage?.layout?.design as DesignConfig | undefined) ?? {};
  const accent = design.accent ?? "#35A7FF";
  const theme = design.theme ?? "light";
  const density = design.density ?? "normal";
  const fontFamily = design.font_family ?? "Inter, sans-serif";
  const entities = entitiesQuery.data ?? [];
  const narrow = viewportW < 520;

  const dark = theme === "dark";
  const colors = {
    bg:        dark ? "#0F1117" : "#F1F6FF",
    surface:   dark ? "#1C1F2B" : "#ffffff",
    border:    dark ? "#2D3144" : "#CBE3FF",
    text:      dark ? "#E8EAF0" : "#00205F",
    textMuted: dark ? "#8891AA" : "#8898AA",
    navActive: dark ? "#2D3560" : "#CBE3FF",
    navHover:  dark ? "#1C1F2B" : "transparent",
  };
  const densityPad = density === "compact" ? "8px 10px" : density === "spacious" ? "16px 20px" : "12px 16px";
  const blockGap   = density === "compact" ? 8 : density === "spacious" ? 24 : 16;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily, transition: "background 0.2s, color 0.2s" }}>
      {/* App bar */}
      <header style={{ height: 56, background: accent, color: "#fff", display: "flex", alignItems: "center", padding: "0 20px", fontWeight: 600, fontSize: 18, flexShrink: 0 }}>
        {app.name}
      </header>

      {/* Horizontal tab nav on narrow screens */}
      {navPages.length > 1 && narrow && (
        <nav style={{ display: "flex", overflowX: "auto", gap: 4, padding: "8px 12px", background: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          {navPages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePageId(p.id)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontSize: 13, whiteSpace: "nowrap",
                background: p.id === activePage?.id ? accent : colors.bg,
                color: p.id === activePage?.id ? "#fff" : colors.text,
                fontWeight: p.id === activePage?.id ? 600 : 400,
              }}
            >
              {p.title}
            </button>
          ))}
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 1100, margin: "0 auto", padding: narrow ? densityPad : densityPad, gap: 16 }}>
        {/* Sidebar nav on wide screens */}
        {navPages.length > 1 && !narrow && (
          <nav style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, background: colors.surface, borderRadius: 10, padding: 8, border: `1px solid ${colors.border}` }}>
            {navPages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePageId(p.id)}
                style={{
                  textAlign: "left", padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 14, background: p.id === activePage?.id ? colors.navActive : colors.navHover,
                  color: p.id === activePage?.id ? accent : colors.text,
                  fontWeight: p.id === activePage?.id ? 600 : 400,
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
            <PageView page={activePage} appId={app.id} entities={entities} accent={accent} colors={colors} blockGap={blockGap} pages={navPages} onNavigate={setActivePageId} />
          )}
        </main>
      </div>
    </div>
  );
}

type AppColors = {
  bg: string; surface: string; border: string;
  text: string; textMuted: string; navActive: string; navHover: string;
};

function PageView({ page, appId, entities, accent, colors, blockGap, onNavigate }: {
  page: PageRead; appId: string; entities: EntityRead[]; accent: string;
  colors: AppColors; blockGap: number;
  pages: PageRead[]; onNavigate: (id: string) => void;
}) {
  const design = (page.layout?.design as DesignConfig | undefined) ?? {};
  const entityId = page.layout?.entity_id as string | undefined;
  const viewType = (page.layout?.view_type as string) ?? "";
  const entity = entities.find((e) => e.id === entityId) ?? null;
  const blocks = (page.blocks ?? []) as unknown as PageBlock[];

  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entity?.id],
    queryFn: () => listRecords(appId, entity!.id, { limit: 50 }),
    enabled: !!entity,
  });
  const records = recordsQuery.data?.items ?? [];
  const cols = (entity?.fields ?? []).filter((f) => !f.is_system);

  const hasDataView = !!viewType && viewType !== "form";

  return (
    <div>
      {(design.show_header ?? true) && (
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: blockGap, color: colors.text }}>{page.title}</h1>
      )}
      {hasDataView && (
        <DataView
          viewType={viewType}
          entity={entity}
          cols={cols}
          records={records}
          accent={accent}
          colors={colors}
        />
      )}
      {blocks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: blockGap, marginTop: hasDataView ? blockGap : 0 }}>
          {blocks.map((b) => (
            <Block
              key={b.id}
              block={b}
              entity={entity}
              cols={cols}
              records={records}
              accent={accent}
              colors={colors}
              appId={appId}
              onNavigate={onNavigate}
              onRecordCreated={() => recordsQuery.refetch()}
            />
          ))}
        </div>
      )}
      {!hasDataView && blocks.length === 0 && <Centered>На этой странице ещё нет блоков.</Centered>}
    </div>
  );
}

function Block({ block, entity, cols, records, accent, colors, appId, onNavigate, onRecordCreated }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  colors: AppColors;
  appId: string;
  onNavigate: (id: string) => void;
  onRecordCreated: () => void;
}) {
  if (block.type === "divider") {
    return <hr style={{ border: "none", borderTop: `1px solid ${colors.border}`, margin: "4px 0" }} />;
  }

  if (block.type === "rich_text") {
    const text = (block.config?.text as string) ?? block.title ?? "";
    return (
      <div style={{ background: colors.bg, borderRadius: 10, padding: 16, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap", color: colors.text, border: `1px solid ${colors.border}` }}>
        {text}
      </div>
    );
  }

  if (block.type === "metric") {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16, background: colors.surface, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, color: colors.textMuted }}>{block.title ?? "Метрика"}</span>
        <span style={{ fontSize: 40, fontWeight: 700, color: accent }}>{(block.config?.value as string) ?? "—"}</span>
      </section>
    );
  }

  if (block.type === "kpi") {
    const value = (block.config?.value as string) || String(records.length);
    const trend = (block.config?.trend as string) ?? "+0%";
    const positive = !trend.trim().startsWith("-");
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16, background: colors.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 13, color: colors.textMuted }}>{block.title ?? "KPI"}</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: colors.text }}>{value}</span>
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
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 14, color: colors.textMuted }}>
          {block.title ?? "Фрейм"}
        </div>
        {src ? (
          <iframe src={src} style={{ width: "100%", height: 320, border: 0 }} title={block.title ?? "iframe"} />
        ) : (
          <div style={{ padding: 20, color: colors.textMuted, fontSize: 13 }}>URL не задан</div>
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
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", color: colors.text }}>
        <span>{block.title ?? entity?.display_name ?? "Таблица"}</span>
        <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: 13 }}>{records.length} записей</span>
      </div>
      {cols.length === 0 ? (
        <p style={{ padding: 14, color: colors.textMuted, fontSize: 14 }}>Таблица не выбрана.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {cols.slice(0, 6).map((f) => (
                  <th key={f.id} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap" }}>{f.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {cols.slice(0, 6).map((f) => (
                    <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{formatCell(rec.payload[f.name], f)}</td>
                  ))}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 14, color: colors.textMuted }}>Нет записей</td></tr>
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

function DataView({ viewType, entity, cols, records, accent, colors }: {
  viewType: string;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  colors: AppColors;
}) {
  const title = entity?.display_name ?? "Таблица";
  const noEntity = (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, background: colors.surface, color: colors.textMuted, fontSize: 14 }}>
      База данных не выбрана.
    </section>
  );

  if (!entity) return noEntity;

  if (viewType === "table") {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", color: colors.text }}>
          <span>{title}</span>
          <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: 13 }}>{records.length} записей</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {cols.slice(0, 6).map((f) => (
                  <th key={f.id} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap" }}>{f.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {cols.slice(0, 6).map((f) => (
                    <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{formatCell(rec.payload[f.name], f)}</td>
                  ))}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 14, color: colors.textMuted }}>Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (viewType === "kanban" || viewType === "deck") {
    const groupField = cols.find((f) => f.field_type === "select");
    const groups: { label: string; items: RecordRead[] }[] = groupField
      ? (() => {
          const choices = (groupField.field_options?.choices as { value: string; label: string }[]) ?? [];
          const result = choices.map((c) => ({
            label: c.label,
            items: records.filter((r) => r.payload[groupField.name] === c.value),
          }));
          const ungrouped = records.filter((r) => !r.payload[groupField.name]);
          if (ungrouped.length > 0) result.push({ label: "Без категории", items: ungrouped });
          return result;
        })()
      : [{ label: title, items: records }];

    const nameField = cols[0];
    return (
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>{title}</div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: 12 }}>
          {groups.map((g) => (
            <div key={g.label} style={{ minWidth: 180, flex: "0 0 180px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, padding: "4px 0" }}>
                {g.label} <span style={{ fontWeight: 400 }}>({g.items.length})</span>
              </div>
              {g.items.map((rec) => (
                <div key={rec.id} style={{ background: colors.bg, borderRadius: 8, padding: "10px 12px", fontSize: 13, border: `1px solid ${colors.border}`, color: colors.text }}>
                  {nameField ? String(rec.payload[nameField.name] ?? "—") : rec.id.slice(0, 8)}
                </div>
              ))}
              {g.items.length === 0 && (
                <div style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", padding: 8 }}>Пусто</div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (viewType === "calendar") {
    const dateField = cols.find((f) => f.field_type === "date");
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const dayMap: Record<number, RecordRead[]> = {};
    if (dateField) {
      records.forEach((r) => {
        const d = r.payload[dateField.name];
        if (d) {
          const day = new Date(String(d)).getDate();
          if (!dayMap[day]) dayMap[day] = [];
          dayMap[day].push(r);
        }
      });
    }
    const monthName = now.toLocaleString("ru-RU", { month: "long", year: "numeric" });
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return (
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>
          {title} — {monthName}
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: colors.textMuted, padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((day, i) => (
              <div key={i} style={{
                minHeight: 40, borderRadius: 6, padding: "4px 6px", fontSize: 12,
                background: day === now.getDate() ? accent + "22" : colors.bg,
                border: day === now.getDate() ? `1px solid ${accent}` : `1px solid ${colors.border}`,
                color: day ? colors.text : "transparent",
              }}>
                <div style={{ fontWeight: 600 }}>{day ?? ""}</div>
                {day && dayMap[day]?.slice(0, 2).map((r) => (
                  <div key={r.id} style={{ background: accent, color: "#fff", borderRadius: 3, padding: "1px 4px", fontSize: 10, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {cols[0] ? String(r.payload[cols[0].name] ?? "•") : "•"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (viewType === "gallery") {
    const imgField = cols.find((f) => f.field_type === "file" || f.field_type === "url");
    const nameField = cols[0];
    return (
      <section style={{ background: "#fff", border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, padding: 12 }}>
          {records.length === 0 && <div style={{ color: "#8898AA", fontSize: 13 }}>Нет записей</div>}
          {records.map((rec) => (
            <div key={rec.id} style={{ background: "#F1F6FF", borderRadius: 8, overflow: "hidden", border: "1px solid #CBE3FF" }}>
              <div style={{ height: 80, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                {imgField && rec.payload[imgField.name] ? "🖼" : "📄"}
              </div>
              <div style={{ padding: "6px 8px", fontSize: 12, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {nameField ? String(rec.payload[nameField.name] ?? "—") : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (viewType === "detail" || viewType === "details" || viewType === "card") {
    return <DetailView title={title} cols={cols} records={records} accent={accent} />;
  }

  if (viewType === "gantt" || viewType === "chart") {
    return <GanttView title={title} cols={cols} records={records} accent={accent} />;
  }

  if (viewType === "map") {
    return <MapView title={title} cols={cols} records={records} accent={accent} />;
  }

  // Unknown view type — basic list
  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, padding: 12, background: "#fff", color: "#5b6b86", fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {records.length === 0 ? (
        <div style={{ color: "#8898AA" }}>Нет записей</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {records.slice(0, 10).map((rec) => (
            <div key={rec.id} style={{ background: "#F1F6FF", borderRadius: 6, padding: "6px 10px" }}>
              {cols[0] ? String(rec.payload[cols[0].name] ?? "—") : rec.id.slice(0, 8)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Detail view: expanded cards for each record ── */
function DetailView({ title, cols, records, accent }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const rec = records[activeIdx];

  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{title}</span>
        {records.length > 1 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              style={{ border: "none", background: "none", cursor: activeIdx === 0 ? "default" : "pointer", opacity: activeIdx === 0 ? 0.3 : 1, fontSize: 16, color: accent, padding: "0 4px" }}
            >‹</button>
            <span style={{ fontSize: 12, color: "#8898AA" }}>{activeIdx + 1} / {records.length}</span>
            <button
              onClick={() => setActiveIdx((i) => Math.min(records.length - 1, i + 1))}
              disabled={activeIdx === records.length - 1}
              style={{ border: "none", background: "none", cursor: activeIdx === records.length - 1 ? "default" : "pointer", opacity: activeIdx === records.length - 1 ? 0.3 : 1, fontSize: 16, color: accent, padding: "0 4px" }}
            >›</button>
          </div>
        )}
      </div>
      {!rec ? (
        <div style={{ padding: 20, color: "#8898AA", fontSize: 14 }}>Нет записей</div>
      ) : (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {cols.map((f) => (
            <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#8898AA", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.display_name}</span>
              <span style={{ fontSize: 14, color: "#00205F", wordBreak: "break-word" }}>{formatCell(rec.payload[f.name], f)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Gantt view: horizontal timeline bars ── */
function GanttView({ title, cols, records, accent }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string;
}) {
  const dateFields = cols.filter((f) => f.field_type === "date");
  const startField = dateFields[0];
  const endField = dateFields[1] ?? dateFields[0];
  const nameField = cols.find((f) => f.field_type !== "date") ?? cols[0];

  const now = new Date();
  const viewStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const viewEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const totalDays = Math.round((viewEnd.getTime() - viewStart.getTime()) / 86400000);

  function dayOffset(d: Date) {
    return Math.max(0, Math.round((d.getTime() - viewStart.getTime()) / 86400000));
  }

  const monthHeaders: { label: string; days: number }[] = [];
  let cur = new Date(viewStart);
  while (cur <= viewEnd) {
    const daysInMon = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const clippedDays = Math.min(daysInMon - cur.getDate() + 1, totalDays - dayOffset(cur));
    monthHeaders.push({ label: cur.toLocaleString("ru-RU", { month: "long", year: "numeric" }), days: clippedDays });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 15 }}>{title}</div>
      {!startField ? (
        <div style={{ padding: 16, color: "#8898AA", fontSize: 13 }}>Добавьте поля типа «Дата» для отображения диаграммы Ганта.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 600, padding: "0 0 12px 0" }}>
            {/* Month header */}
            <div style={{ display: "flex", borderBottom: "1px solid #CBE3FF" }}>
              <div style={{ width: 140, flexShrink: 0, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#5b6b86", borderRight: "1px solid #CBE3FF" }}>Название</div>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ display: "flex" }}>
                  {monthHeaders.map((m) => (
                    <div key={m.label} style={{ flex: m.days, padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "#5b6b86", borderRight: "1px solid #CBE3FF", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Rows */}
            {records.length === 0 && (
              <div style={{ padding: "12px 12px", color: "#8898AA", fontSize: 13 }}>Нет записей</div>
            )}
            {records.map((rec) => {
              const rawStart = rec.payload[startField.name];
              const rawEnd = endField ? rec.payload[endField.name] : rawStart;
              const start = rawStart ? new Date(String(rawStart)) : null;
              const end = rawEnd ? new Date(String(rawEnd)) : start;
              const label = nameField ? String(rec.payload[nameField.name] ?? "—") : "—";
              const left = start ? (dayOffset(start) / totalDays) * 100 : 0;
              const width = (start && end)
                ? (Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) / totalDays) * 100
                : 2;

              return (
                <div key={rec.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F1F6FF", minHeight: 36 }}>
                  <div style={{ width: 140, flexShrink: 0, padding: "0 12px", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", borderRight: "1px solid #CBE3FF", color: "#00205F" }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 36, background: "#F8FBFF" }}>
                    {/* Today line */}
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(dayOffset(now) / totalDays) * 100}%`, width: 1, background: "#F59E0B", zIndex: 2 }} />
                    {start ? (
                      <div style={{
                        position: "absolute", top: 8, height: 20,
                        left: `${Math.min(99, left)}%`,
                        width: `${Math.min(100 - left, width)}%`,
                        background: accent, borderRadius: 4, opacity: 0.85,
                        display: "flex", alignItems: "center", paddingLeft: 6,
                        fontSize: 11, color: "#fff", whiteSpace: "nowrap", overflow: "hidden",
                      }}>
                        {start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        {end && end !== start ? ` – ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}` : ""}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "#8898AA", paddingLeft: 8, lineHeight: "36px" }}>нет даты</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Map view: Leaflet via CDN ── */
function MapView({ title, cols, records }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const latField = cols.find((f) => ["lat","latitude","широта"].includes(f.name.toLowerCase()));
  const lngField = cols.find((f) => ["lng","lon","longitude","долгота"].includes(f.name.toLowerCase()));
  const addrField = cols.find((f) => ["address","addr","адрес"].includes(f.name.toLowerCase()));
  const nameField = cols.find((f) => f.field_type !== "date" && f.field_type !== "number") ?? cols[0];

  const points: { lat: number; lng: number; label: string }[] = [];
  if (latField && lngField) {
    records.forEach((r) => {
      const lat = parseFloat(String(r.payload[latField.name] ?? ""));
      const lng = parseFloat(String(r.payload[lngField.name] ?? ""));
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ lat, lng, label: nameField ? String(r.payload[nameField.name] ?? "—") : "—" });
      }
    });
  }

  const center = points.length > 0
    ? { lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lng: points.reduce((s, p) => s + p.lng, 0) / points.length }
    : { lat: 55.75, lng: 37.62 };

  useEffect(() => {
    let cancelled = false;

    function initMap() {
      if (cancelled || !mapRef.current) return;
      const L = (window as unknown as Record<string, unknown>).L as {
        map: (el: HTMLElement, opts?: unknown) => unknown;
        tileLayer: (url: string, opts?: unknown) => { addTo: (m: unknown) => unknown };
        marker: (pos: [number, number]) => { addTo: (m: unknown) => unknown; bindPopup: (s: string) => unknown };
      };
      if (!L) return;

      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, { zoomControl: true });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (points.length > 0) {
        points.forEach((p) => {
          const m = L.marker([p.lat, p.lng]);
          m.addTo(map);
          m.bindPopup(p.label);
        });
        (map as { setView: (center: [number, number], zoom: number) => void }).setView([center.lat, center.lng], points.length === 1 ? 13 : 10);
      } else {
        (map as { setView: (center: [number, number], zoom: number) => void }).setView([center.lat, center.lng], 10);
      }
    }

    function loadLeaflet() {
      if ((window as unknown as Record<string, unknown>).L) { initMap(); return; }
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => { if (!cancelled) initMap(); };
        document.body.appendChild(script);
      } else {
        setTimeout(initMap, 100);
      }
    }

    loadLeaflet();
    return () => { cancelled = true; };
  }, [records.length, latField?.name, lngField?.name]);

  const hasCoords = !!(latField && lngField);

  return (
    <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 14px", background: "#F1F6FF", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between" }}>
        <span>{title}</span>
        {points.length > 0 && <span style={{ fontSize: 12, color: "#8898AA", fontWeight: 400 }}>{points.length} точек</span>}
      </div>
      {!hasCoords ? (
        <div style={{ padding: 20, color: "#8898AA", fontSize: 13, lineHeight: 1.6 }}>
          Добавьте поля с координатами (названия: <b>lat</b> / <b>lng</b> или <b>latitude</b> / <b>longitude</b>) для отображения на карте.
          {addrField && <><br />Поле «{addrField.display_name}» найдено, но геокодирование не поддерживается без API ключа.</>}
        </div>
      ) : (
        <div>
          <div ref={mapRef} style={{ height: 300, width: "100%" }} />
          {points.length === 0 && records.length > 0 && (
            <div style={{ padding: "8px 14px", fontSize: 12, color: "#8898AA" }}>
              Записей: {records.length}, но координаты не заполнены.
            </div>
          )}
        </div>
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
