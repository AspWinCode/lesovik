import { useState, useEffect, useRef } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/shared/auth/tokens";
import { listApps, type App } from "@/shared/api/apps";
import { listPages, type PageRead } from "@/shared/api/views";
import { listEntities, listRelations, type EntityRead, type FieldRead, type RelationRead } from "@/shared/api/entities";
import { listRecords, createRecord, updateRecord, type RecordRead } from "@/shared/api/records";
import { apiClient } from "@/shared/api/client";

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
  heading_size?: "sm" | "md" | "lg";
  text_size?: "12" | "14" | "16";
  input_style?: "outline" | "filled" | "minimal";
  label_position?: "top" | "inline";
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

  const relationsQuery = useQuery({
    queryKey: ["rt-relations", resolvedAppId],
    queryFn: () => listRelations(resolvedAppId!),
    enabled: authed && !!resolvedAppId,
  });

  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [viewportW, setViewportW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Preselect page from URL param or first page
  const allPages = pagesQuery.data ?? [];
  const publishedPages = allPages.filter((p) => p.is_published);
  const visiblePages = preview
    ? allPages
    : (publishedPages.length > 0 ? publishedPages : allPages);
  // Nav sidebar shows only non-system pages
  const navPages = visiblePages.filter((p) => !p.layout?.is_system);

  function navigateToDetail(entityId: string, recordId: string) {
    const detailPage = allPages.find(
      (p) => p.layout?.is_system && p.layout?.system_type === "detail" && p.layout?.entity_id === entityId,
    );
    if (detailPage) {
      setActiveRecordId(recordId);
      setActivePageId(detailPage.id);
    }
  }

  useEffect(() => {
    const candidates = navPages.length > 0 ? navPages : visiblePages;
    if (candidates.length === 0) return;
    if (pageParam && visiblePages.find((p) => p.id === pageParam)) {
      setActivePageId(pageParam);
    } else if (!activePageId || !visiblePages.find((p) => p.id === activePageId)) {
      setActivePageId(candidates[0].id);
    }
  }, [visiblePages.map((p) => p.id).join(","), pageParam]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const activePage = visiblePages.find((p) => p.id === activePageId) ?? navPages[0] ?? null;
  const design = (activePage?.layout?.design as DesignConfig | undefined) ?? {};
  const accent = design.accent ?? "#35A7FF";
  const theme = design.theme ?? "light";
  const density = design.density ?? "normal";
  const fontFamily = design.font_family ? `${design.font_family}, sans-serif` : "Inter, sans-serif";
  const headingSizePx = design.heading_size === "sm" ? 18 : design.heading_size === "lg" ? 28 : 22;
  const textSizePx = Number(design.text_size ?? "14");
  const inputStyle = design.input_style ?? "outline";
  const labelPosition = design.label_position ?? "top";
  const entities  = entitiesQuery.data  ?? [];
  const relations = relationsQuery.data ?? [];
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
            <>
              {activePage.layout?.is_system && (
                <button
                  onClick={() => { setActiveRecordId(null); setActivePageId(navPages[0]?.id ?? null); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: accent, fontSize: 14, fontWeight: 500, padding: 0 }}
                >
                  ← Назад
                </button>
              )}
              <PageView
                page={activePage}
                appId={app.id}
                entities={entities}
                relations={relations}
                allPages={allPages}
                accent={accent}
                colors={colors}
                blockGap={blockGap}
                headingSizePx={headingSizePx}
                textSizePx={textSizePx}
                inputStyle={inputStyle}
                labelPosition={labelPosition}
                pages={navPages}
                onNavigate={setActivePageId}
                onRowClick={navigateToDetail}
                activeRecordId={activeRecordId}
              />
            </>
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

function PageView({ page, appId, entities, relations, allPages, accent, colors, blockGap, headingSizePx, textSizePx, inputStyle, labelPosition, onNavigate, onRowClick, activeRecordId }: {
  page: PageRead; appId: string; entities: EntityRead[]; relations: RelationRead[]; allPages: PageRead[]; accent: string;
  colors: AppColors; blockGap: number; headingSizePx: number; textSizePx: number;
  inputStyle: string; labelPosition: string;
  pages: PageRead[]; onNavigate: (id: string) => void;
  onRowClick?: (entityId: string, recordId: string) => void;
  activeRecordId?: string | null;
}) {
  const design = (page.layout?.design as DesignConfig | undefined) ?? {};
  const entityId = page.layout?.entity_id as string | undefined;
  const viewType = (page.layout?.view_type as string) ?? "";
  const entity = entities.find((e) => e.id === entityId) ?? null;
  const blocks = (page.blocks ?? []) as unknown as PageBlock[];

  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entity?.id],
    queryFn: () => listRecords(appId, entity!.id, { limit: 200 }),
    enabled: !!entity,
  });
  const records = recordsQuery.data?.items ?? [];
  const hiddenColumns = (page.layout?.hidden_columns as string[] | undefined) ?? [];
  const colOrderMode = (page.layout?.column_order_mode as "auto" | "manual") ?? "auto";
  const columnWidth = (page.layout?.column_width as string) ?? "Средняя";
  const allCols = (entity?.fields ?? []).filter((f) => !f.is_system);
  const cols = colOrderMode === "manual"
    ? allCols.filter((f) => !hiddenColumns.includes(f.name))
    : allCols;

  const hasDataView = !!viewType && viewType !== "form";

  // Page-level form state (shared across text_field / toggle / number_field blocks)
  const [pageFormValues, setPageFormValues] = useState<Record<string, unknown>>({});
  const [pageSaveStatus, setPageSaveStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function setFormField(field: string, value: unknown) {
    setPageFormValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePageFormSave(targetPageId?: string) {
    if (!entity || pageSaveStatus === "submitting") return;
    setPageSaveStatus("submitting");
    try {
      let formVals = { ...pageFormValues };

      // Execute pre_create from save button config (e.g. create a client before saving the order)
      const saveBtn = visibleBlocks.find(
        (b) => b.type === "button" && (b.config?.actionType as string) === "save"
      );
      const preCreate = saveBtn?.config?.pre_create as {
        condition_field?: string;
        entity_id: string;
        field_map?: Record<string, string>; // entityField → formField
        result_field?: string;
      } | undefined;

      if (preCreate?.entity_id) {
        const condField = preCreate.condition_field;
        const shouldCreate =
          !condField ||
          formVals[condField] === true ||
          formVals[condField] === "true";

        if (shouldCreate) {
          const clientPayload: Record<string, unknown> = {};
          for (const [entityField, formField] of Object.entries(preCreate.field_map ?? {})) {
            const val = formVals[formField];
            if (val !== undefined && val !== "") clientPayload[entityField] = val;
          }
          const newRec = await createRecord(appId, preCreate.entity_id, { payload: clientPayload });
          if (preCreate.result_field) {
            formVals = { ...formVals, [preCreate.result_field]: newRec.id };
          }
        }
      }

      const payload: Record<string, unknown> = {};
      const validFields = new Set(allCols.map((f) => f.name));
      Object.entries(formVals).forEach(([k, v]) => {
        if (validFields.has(k) && v !== undefined && v !== "") payload[k] = v;
      });
      await createRecord(appId, entity.id, { payload });
      setPageFormValues({});
      setPageSaveStatus("success");
      if (targetPageId) {
        setTimeout(() => onNavigate(targetPageId), 800);
      } else {
        setTimeout(() => setPageSaveStatus("idle"), 3000);
      }
    } catch {
      setPageSaveStatus("error");
      setTimeout(() => setPageSaveStatus("idle"), 3000);
    }
  }

  // Pick the context record for evaluating block visibility conditions.
  // On detail pages use the active record; otherwise fall back to the first record.
  const contextRecord = activeRecordId
    ? records.find((r) => r.id === activeRecordId)
    : records[0];
  const contextPayload: Record<string, unknown> = { ...contextRecord?.payload ?? {}, ...pageFormValues };

  const visibleBlocks = blocks.filter((b) => {
    const cond = b.config.visibility_condition as VisibilityCond | undefined;
    return evalVisibilityCond(cond, contextPayload);
  });

  return (
    <div style={{ fontSize: textSizePx }}>
      {(design.show_header ?? true) && (
        <h1 style={{ fontSize: headingSizePx, fontWeight: 700, marginBottom: blockGap, color: colors.text }}>{page.title}</h1>
      )}
      {hasDataView && (
        <DataView
          viewType={viewType}
          entity={entity}
          cols={cols}
          records={records}
          accent={accent}
          colors={colors}
          columnWidth={columnWidth}
          appId={appId}
          onRowClick={onRowClick}
          activeRecordId={activeRecordId}
          onRecordUpdated={() => recordsQuery.refetch()}
        />
      )}
      {visibleBlocks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: blockGap, marginTop: hasDataView ? blockGap : 0 }}>
          {visibleBlocks.map((b) => (
            <Block
              key={b.id}
              block={b}
              entity={entity}
              cols={cols}
              records={records}
              accent={accent}
              colors={colors}
              inputStyle={inputStyle}
              labelPosition={labelPosition}
              appId={appId}
              entities={entities}
              onNavigate={onNavigate}
              onRecordCreated={() => recordsQuery.refetch()}
              formValues={pageFormValues}
              onFormChange={setFormField}
              onFormSave={handlePageFormSave}
              formStatus={pageSaveStatus}
            />
          ))}
          {pageSaveStatus === "success" && (
            <p style={{ color: "#15803D", fontSize: 14, fontWeight: 500, padding: "8px 0" }}>✓ Заказ сохранён</p>
          )}
          {pageSaveStatus === "error" && (
            <p style={{ color: "#B91C1C", fontSize: 14, padding: "8px 0" }}>Ошибка при сохранении. Попробуйте ещё раз.</p>
          )}
        </div>
      )}
      {!hasDataView && blocks.length === 0 && <Centered>На этой странице ещё нет блоков.</Centered>}

      {/* Inline sections: child entities related to current entity (shown on _Detail pages) */}
      {page.layout?.system_type === "detail" && entity && activeRecordId && (
        <InlineSections
          appId={appId}
          parentEntityId={entity.id}
          parentRecordId={activeRecordId}
          relations={relations}
          entities={entities}
          allPages={allPages}
          accent={accent}
          colors={colors}
          blockGap={blockGap}
        />
      )}
    </div>
  );
}

/* ── Inline sections shown inside _Detail for related child entities ── */
function InlineSections({ appId, parentEntityId, parentRecordId, relations, entities, allPages, accent, colors, blockGap }: {
  appId: string; parentEntityId: string; parentRecordId: string;
  relations: RelationRead[]; entities: EntityRead[]; allPages: PageRead[];
  accent: string; colors: AppColors; blockGap: number;
}) {
  // Find entities that reference parentEntity (child side of one-to-many)
  const childRelations = relations.filter(
    (r) => r.to_entity_id === parentEntityId && r.relation_type === "one_to_many",
  );

  if (childRelations.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: blockGap, marginTop: blockGap }}>
      {childRelations.map((rel) => {
        const childEntity = entities.find((e) => e.id === rel.from_entity_id);
        if (!childEntity) return null;
        const inlinePage = allPages.find(
          (p) => p.layout?.is_system && p.layout?.system_type === "inline" && p.layout?.entity_id === childEntity.id,
        );
        return (
          <InlineBlock
            key={rel.id}
            appId={appId}
            entity={childEntity}
            relation={rel}
            parentRecordId={parentRecordId}
            inlineTitle={inlinePage?.title ?? `${childEntity.display_name}_Inline`}
            accent={accent}
            colors={colors}
          />
        );
      })}
    </div>
  );
}

function InlineBlock({ appId, entity, relation, parentRecordId, inlineTitle, accent, colors }: {
  appId: string; entity: EntityRead; relation: RelationRead; parentRecordId: string;
  inlineTitle: string; accent: string; colors: AppColors;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entity.id],
    queryFn: () => listRecords(appId, entity.id, { limit: 50 }),
    enabled: true,
  });
  const allRecords = recordsQuery.data?.items ?? [];
  // Filter child records by FK field that references the parent record
  const fkName = relation.from_field_name;
  const records = fkName
    ? allRecords.filter((r) => String(r.payload[fkName]) === parentRecordId)
    : allRecords;

  const cols = (entity.fields ?? []).filter((f) => !f.is_system);

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "8px 14px", background: colors.bg, fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", color: colors.text }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, background: accent, color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>Inline</span>
          {inlineTitle}
        </span>
        <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 400 }}>{records.length} записей</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {cols.map((f) => (
                <th key={f.id} style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap" }}>{f.display_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                {cols.map((f) => (
                  <td key={f.id} style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>{String(rec.payload[f.name] ?? "—")}</td>
                ))}
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={cols.length || 1} style={{ padding: 12, color: colors.textMuted }}>Нет связанных записей</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Block({ block, entity, cols, records, accent, colors, inputStyle, labelPosition, appId, entities, onNavigate, onRecordCreated, formValues, onFormChange, onFormSave, formStatus }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  colors: AppColors;
  inputStyle: string;
  labelPosition: string;
  appId: string;
  entities?: EntityRead[];
  onNavigate: (id: string) => void;
  onRecordCreated: () => void;
  formValues?: Record<string, unknown>;
  onFormChange?: (field: string, value: unknown) => void;
  onFormSave?: (targetPageId?: string) => Promise<void>;
  formStatus?: "idle" | "submitting" | "success" | "error";
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

  if (block.type === "text_field") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    const label = (cfg.label as string) ?? block.title ?? "";
    const placeholder = (cfg.placeholder as string) ?? "";
    const inputSt: React.CSSProperties = {
      height: 38, padding: "0 12px", fontSize: 14, borderRadius: 8,
      border: `1px solid ${colors.border}`, background: colors.surface,
      color: colors.text, outline: "none", width: "100%", boxSizing: "border-box",
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
        <input
          type="text"
          value={fieldName ? String(formValues?.[fieldName] ?? "") : ""}
          onChange={(e) => fieldName && onFormChange?.(fieldName, e.target.value)}
          placeholder={placeholder}
          style={inputSt}
        />
      </div>
    );
  }

  if (block.type === "toggle") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    const label = (cfg.label as string) ?? block.title ?? "";
    const checked = fieldName
      ? formValues?.[fieldName] === true || formValues?.[fieldName] === "true"
      : Boolean(cfg.default_value);
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", fontSize: 14, color: colors.text }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => fieldName && onFormChange?.(fieldName, e.target.checked)}
          style={{ width: 18, height: 18, cursor: "pointer", accentColor: accent }}
        />
        {label}
      </label>
    );
  }

  if (block.type === "number_field") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    const label = (cfg.label as string) ?? block.title ?? "";
    const unit = (cfg.unit as string) ?? "";
    const inputSt: React.CSSProperties = {
      height: 38, padding: "0 12px", fontSize: 14, borderRadius: 8,
      border: `1px solid ${colors.border}`, background: colors.surface,
      color: colors.text, outline: "none", width: "100%", boxSizing: "border-box",
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}{unit ? ` (${unit})` : ""}</label>}
        <input
          type="number"
          value={fieldName ? String(formValues?.[fieldName] ?? "") : ""}
          onChange={(e) => {
            if (!fieldName) return;
            onFormChange?.(fieldName, e.target.value === "" ? "" : Number(e.target.value));
          }}
          style={inputSt}
        />
      </div>
    );
  }

  if (block.type === "lookup") {
    const cfg = block.config ?? {};
    const refEntityId = (cfg.entity_id as string) ?? "";
    const displayField = (cfg.display_field as string) ?? "id";
    const fieldName = (cfg.field_name as string) ?? "";
    const label = (cfg.label as string) ?? block.title ?? "";
    return (
      <LookupBlock
        appId={appId}
        refEntityId={refEntityId}
        displayField={displayField}
        fieldName={fieldName}
        label={label}
        value={fieldName ? String(formValues?.[fieldName] ?? "") : ""}
        onChange={(v) => fieldName && onFormChange?.(fieldName, v)}
        colors={colors}
      />
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
      if (actionType === "save") {
        void onFormSave?.(targetPageId || undefined);
      } else if (actionType === "page" && targetPageId) {
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
    const isSaving = actionType === "save" && formStatus === "submitting";
    return (
      <button style={{ ...style, opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "not-allowed" : "pointer" }} onClick={handleClick} disabled={isSaving}>
        {isSaving ? "Сохранение…" : (block.title ?? "Кнопка")}
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
        colors={colors}
        inputStyle={inputStyle}
        labelPosition={labelPosition}
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
                {cols.map((f) => (
                  <th key={f.id} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap" }}>{f.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {cols.map((f) => (
                    <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{formatCell(rec.payload[f.name], f)}</td>
                  ))}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={cols.length || 1} style={{ padding: 14, color: colors.textMuted }}>Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LookupBlock({ appId, refEntityId, displayField, fieldName, label, value, onChange, colors }: {
  appId: string; refEntityId: string; displayField: string;
  fieldName: string; label: string; value: string;
  onChange: (v: string) => void; colors: AppColors;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, refEntityId],
    queryFn: () => listRecords(appId, refEntityId, { limit: 200 }),
    enabled: !!refEntityId,
  });
  const options = recordsQuery.data?.items ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 38, padding: "0 12px", fontSize: 14, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, outline: "none", width: "100%", boxSizing: "border-box" }}
      >
        <option value="">— выберите —</option>
        {options.map((r) => (
          <option key={r.id} value={r.id}>{String(r.payload[displayField] ?? r.id)}</option>
        ))}
      </select>
    </div>
  );
}

function FormBlock({ block, entity, cols, appId, accent, colors, inputStyle, labelPosition, onSuccess }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  appId: string;
  accent: string;
  colors: AppColors;
  inputStyle: string;
  labelPosition: string;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entity || status === "submitting") return;
    setStatus("submitting");
    try {
      const payload: Record<string, unknown> = {};
      cols.forEach((f) => {
        if (f.field_type === "file") return;
        const v = values[f.name];
        if (v !== undefined && v !== "") payload[f.name] = v;
      });
      const created = await createRecord(appId, entity.id, { payload });

      for (const [fieldName, file] of Object.entries(fileValues)) {
        const fd = new FormData();
        fd.append("file", file);
        await apiClient.post(
          `/apps/${appId}/entities/${entity.id}/records/${created.id}/files?field_name=${encodeURIComponent(fieldName)}`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      }

      setValues({});
      setFileValues({});
      setStatus("success");
      onSuccess();
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  function inputStyleCss(): React.CSSProperties {
    const base: React.CSSProperties = { height: 38, padding: "0 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", color: colors.text, background: "transparent" };
    if (inputStyle === "filled") return { ...base, borderRadius: 8, border: "none", background: colors.bg };
    if (inputStyle === "minimal") return { ...base, borderRadius: 0, border: "none", borderBottom: `2px solid ${colors.border}` };
    return { ...base, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface };
  }

  const inline = labelPosition === "inline";
  const fieldConditions = (block.config?.field_conditions ?? {}) as Record<string, VisibilityCond | null>;

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16, background: colors.surface }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: colors.text }}>{block.title ?? "Форма"}</h3>
      {cols.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>Таблица не выбрана.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cols.map((f) => {
            const fieldCond = fieldConditions[f.name];
            if (!evalVisibilityCond(fieldCond, values as Record<string, unknown>)) return null;
            return (
            <label key={f.id} style={{ display: "flex", flexDirection: inline ? "row" : "column", alignItems: inline ? "center" : "stretch", gap: inline ? 12 : 4, fontSize: 13, color: colors.textMuted }}>
              <span style={{ flexShrink: 0, minWidth: inline ? 120 : undefined }}>{f.display_name}{f.is_required && " *"}</span>
              {f.field_type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={values[f.name] === "true"}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked ? "true" : "false" }))}
                  style={{ width: 20, height: 20, cursor: "pointer" }}
                />
              ) : f.field_type === "file" ? (
                <div>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFileValues((v) => ({ ...v, [f.name]: file }));
                      else setFileValues((v) => { const n = { ...v }; delete n[f.name]; return n; });
                    }}
                    style={{ fontSize: 13, color: colors.text }}
                  />
                  {fileValues[f.name] && (
                    <span style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, display: "block" }}>
                      {fileValues[f.name].name} ({(fileValues[f.name].size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
              ) : (f.field_type === "select" || f.field_type === "multi_select") ? (
                <select
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  required={f.is_required}
                  style={{ ...inputStyleCss(), cursor: "pointer" }}
                >
                  <option value="">— выберите —</option>
                  {((f.field_options?.choices as { value: string; label: string }[]) ?? []).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={labelPosition === "inline" ? "" : `Введите ${f.display_name.toLowerCase()}`}
                  required={f.is_required}
                  style={inputStyleCss()}
                />
              )}
            </label>
            );
          })}

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

function DataView({ viewType, entity, cols, records, accent, colors, columnWidth, appId, onRowClick, activeRecordId, onRecordUpdated }: {
  viewType: string;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  colors: AppColors;
  columnWidth?: string;
  appId: string;
  onRowClick?: (entityId: string, recordId: string) => void;
  activeRecordId?: string | null;
  onRecordUpdated?: () => void;
}) {
  const qc = useQueryClient();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function startEdit(rec: RecordRead) {
    const vals: Record<string, string> = {};
    cols.forEach((f) => { vals[f.name] = rec.payload[f.name] != null ? String(rec.payload[f.name]) : ""; });
    setEditValues(vals);
    setEditRowId(rec.id);
  }

  async function saveEdit() {
    if (!editRowId || !entity) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      cols.forEach((f) => {
        const v = editValues[f.name];
        if (v !== undefined) {
          if (f.field_type === "number" || f.field_type === "decimal") payload[f.name] = v === "" ? null : Number(v);
          else if (f.field_type === "boolean") payload[f.name] = v === "true";
          else payload[f.name] = v === "" ? null : v;
        }
      });
      await updateRecord(appId, entity.id, editRowId, { payload });
      qc.invalidateQueries({ queryKey: ["rt-records", appId, entity.id] });
      onRecordUpdated?.();
    } finally {
      setSaving(false);
      setEditRowId(null);
      setEditValues({});
    }
  }

  function cancelEdit() { setEditRowId(null); setEditValues({}); }

  const colPadding = columnWidth === "Узкая" ? "5px 8px" : columnWidth === "Широкая" ? "10px 20px" : "8px 12px";
  const colMinWidth = columnWidth === "Узкая" ? 60 : columnWidth === "Широкая" ? 160 : 100;
  const canDrill = !!onRowClick && !!entity;
  const title = entity?.display_name ?? "Таблица";
  const noEntity = (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, background: colors.surface, color: colors.textMuted, fontSize: 14 }}>
      База данных не выбрана.
    </section>
  );

  if (!entity) return noEntity;

  if (viewType === "table") {
    const q = filterText.toLowerCase();
    const filtered = q
      ? records.filter((r) => cols.some((f) => String(r.payload[f.name] ?? "").toLowerCase().includes(q)))
      : records;

    const sorted = sortField
      ? [...filtered].sort((a, b) => {
          const av = String(a.payload[sortField] ?? "");
          const bv = String(b.payload[sortField] ?? "");
          return sortDir === "asc" ? av.localeCompare(bv, "ru") : bv.localeCompare(av, "ru");
        })
      : filtered;

    function toggleSort(fieldName: string) {
      if (sortField === fieldName) {
        if (sortDir === "asc") setSortDir("desc");
        else { setSortField(null); setSortDir("asc"); }
      } else {
        setSortField(fieldName);
        setSortDir("asc");
      }
    }

    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: colors.text }}>
          <span>{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Поиск..."
                style={{
                  height: 28, paddingLeft: 28, paddingRight: 8, fontSize: 12,
                  border: `1px solid ${colors.border}`, borderRadius: 6,
                  background: colors.surface, color: colors.text, outline: "none",
                  width: 160,
                }}
              />
              <svg viewBox="0 0 16 16" fill="none" stroke={colors.textMuted} strokeWidth="1.6"
                style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, pointerEvents: "none" }}>
                <circle cx="6.5" cy="6.5" r="4" /><path d="M10.5 10.5l3 3" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: 12 }}>
              {sorted.length}{filterText ? `/${records.length}` : ""} записей
            </span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {cols.map((f) => (
                  <th
                    key={f.id}
                    onClick={() => toggleSort(f.name)}
                    style={{ textAlign: "left", padding: colPadding, fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap", minWidth: colMinWidth, cursor: "pointer", userSelect: "none" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {f.display_name}
                      {sortField === f.name ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </th>
                ))}
                <th style={{ padding: colPadding, width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((rec) => {
                const isEditing = editRowId === rec.id;
                return (
                  <tr
                    key={rec.id}
                    onClick={!isEditing && canDrill ? () => onRowClick!(entity!.id, rec.id) : undefined}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      cursor: !isEditing && canDrill ? "pointer" : "default",
                      background: isEditing ? colors.navActive : rec.id === activeRecordId ? colors.navActive : undefined,
                    }}
                    onMouseEnter={(e) => { if (!isEditing && canDrill) (e.currentTarget as HTMLTableRowElement).style.background = colors.border; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isEditing || rec.id === activeRecordId ? colors.navActive : ""; }}
                  >
                    {cols.map((f) => (
                      <td key={f.id} style={{ padding: colPadding, whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          (f.field_type === "select" || f.field_type === "multi_select") ? (
                            <select
                              value={editValues[f.name] ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, [f.name]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              style={{ height: 26, padding: "0 4px", fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, color: colors.text, outline: "none", minWidth: 80 }}
                            >
                              <option value="">—</option>
                              {((f.field_options?.choices as { value: string; label: string }[]) ?? []).map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                          <input
                            value={editValues[f.name] ?? ""}
                            onChange={(e) => setEditValues((v) => ({ ...v, [f.name]: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                            style={{ height: 26, padding: "0 6px", fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, color: colors.text, outline: "none", minWidth: 80 }}
                          />
                          )
                        ) : (
                          formatCell(rec.payload[f.name], f)
                        )}
                      </td>
                    ))}
                    <td style={{ padding: colPadding, width: 40 }} onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            disabled={saving}
                            onClick={() => void saveEdit()}
                            style={{ height: 22, padding: "0 6px", fontSize: 11, background: accent, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                          >
                            {saving ? "…" : "✓"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{ height: 22, padding: "0 6px", fontSize: 11, background: colors.border, color: colors.text, border: "none", borderRadius: 4, cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rec)}
                          title="Редактировать"
                          style={{ height: 22, padding: "0 6px", fontSize: 11, background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: "pointer", opacity: 0.6 }}
                        >
                          ✎
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={cols.length + 1} style={{ padding: 14, color: colors.textMuted }}>
                  {filterText ? "Ничего не найдено" : "Нет записей"}
                </td></tr>
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

  if (viewType === "list") {
    return <ListView title={title} cols={cols} records={records} accent={accent} colors={colors} onRowClick={canDrill ? (recordId) => onRowClick!(entity!.id, recordId) : undefined} />;
  }

  if (viewType === "detail" || viewType === "details" || viewType === "card") {
    return <DetailView title={title} cols={cols} records={records} accent={accent} initialRecordId={activeRecordId} />;
  }

  if (viewType === "chart") {
    return <ChartView title={title} cols={cols} records={records} accent={accent} colors={colors} />;
  }

  if (viewType === "gantt") {
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

/* ── List view: scrollable card list ── */
function ListView({ title, cols, records, accent, colors, onRowClick }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string; colors: AppColors;
  onRowClick?: (recordId: string) => void;
}) {
  const labelCol = cols[0];
  const subCols = cols.slice(1, 4);

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{title}</span>
        <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400 }}>{records.length} записей</span>
      </div>
      {records.length === 0 ? (
        <div style={{ padding: 24, color: colors.textMuted, fontSize: 14, textAlign: "center" }}>Нет записей</div>
      ) : (
        <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {records.map((rec, idx) => {
            const label = labelCol ? String(rec.payload[labelCol.name] ?? "—") : rec.id.slice(0, 8);
            return (
              <div
                key={rec.id}
                onClick={() => onRowClick?.(rec.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px",
                  borderTop: idx > 0 ? `1px solid ${colors.border}` : undefined,
                  cursor: onRowClick ? "pointer" : "default",
                  background: "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLDivElement).style.background = colors.bg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: accent }}>
                  {label.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                  {subCols.length > 0 && (
                    <div style={{ display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
                      {subCols.map((f) => {
                        const val = rec.payload[f.name];
                        if (val === null || val === undefined || val === "") return null;
                        return (
                          <span key={f.id} style={{ fontSize: 12, color: colors.textMuted }}>
                            <span style={{ fontWeight: 500 }}>{f.display_name}:</span>{" "}
                            {formatCell(val, f)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                {onRowClick && (
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, color: colors.textMuted, flexShrink: 0 }} stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Detail view: expanded cards for each record ── */
function DetailView({ title, cols, records, accent, initialRecordId }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string; initialRecordId?: string | null;
}) {
  const startIdx = initialRecordId ? Math.max(0, records.findIndex((r) => r.id === initialRecordId)) : 0;
  const [activeIdx, setActiveIdx] = useState(startIdx);
  useEffect(() => {
    if (initialRecordId) {
      const idx = records.findIndex((r) => r.id === initialRecordId);
      if (idx >= 0) setActiveIdx(idx);
    }
  }, [initialRecordId, records.length]); // eslint-disable-line react-hooks/exhaustive-deps
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

/* ── Chart view: horizontal bar chart ── */
function ChartView({ title, cols, records, accent, colors }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string; colors: AppColors;
}) {
  const catField = cols.find((f) => f.field_type === "select" || f.field_type === "text" || f.field_type === "relation");
  const numField = cols.find((f) => f.field_type === "number" || f.field_type === "decimal");

  if (!catField) {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24, background: colors.surface, color: colors.textMuted, textAlign: "center" }}>
        Для диаграммы нужно поле типа «Список» или «Текст».
      </section>
    );
  }

  type Bucket = { label: string; value: number };
  const bucketMap = new Map<string, Bucket>();
  records.forEach((r) => {
    const label = String(r.payload[catField.name] ?? "—") || "—";
    const num = numField ? Number(r.payload[numField.name] ?? 0) || 0 : 1;
    if (!bucketMap.has(label)) bucketMap.set(label, { label, value: 0 });
    bucketMap.get(label)!.value += num;
  });
  const buckets = [...bucketMap.values()].sort((a, b) => b.value - a.value).slice(0, 20);
  const maxVal = Math.max(...buckets.map((b) => b.value), 1);

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>
        {title}
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {buckets.map((b) => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <div style={{ width: 120, flexShrink: 0, textAlign: "right", color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.label}>
              {b.label}
            </div>
            <div style={{ flex: 1, height: 22, background: colors.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(b.value / maxVal) * 100}%`, height: "100%", background: accent, borderRadius: 4, minWidth: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ width: 40, flexShrink: 0, color: colors.text, fontWeight: 600, fontSize: 12 }}>
              {b.value % 1 === 0 ? b.value : b.value.toFixed(1)}
            </div>
          </div>
        ))}
        {buckets.length === 0 && <span style={{ color: colors.textMuted }}>Нет данных</span>}
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
          {numField ? `Сумма: ${numField.display_name}` : "Количество записей"}
          {" · "}
          Группировка: {catField.display_name}
        </div>
      </div>
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

/* ── Visibility condition evaluation ── */
type VisibilityCond = { field: string; op: string; value: string };

function evalVisibilityCond(cond: VisibilityCond | null | undefined, payload: Record<string, unknown>): boolean {
  if (!cond || !cond.field || !cond.op) return true;
  const raw = payload[cond.field];
  const strVal = raw !== null && raw !== undefined ? String(raw) : "";
  switch (cond.op) {
    case "eq":        return strVal === cond.value;
    case "neq":       return strVal !== cond.value;
    case "contains":  return strVal.toLowerCase().includes((cond.value ?? "").toLowerCase());
    case "empty":     return strVal === "" || raw === null || raw === undefined;
    case "not_empty": return strVal !== "" && raw !== null && raw !== undefined;
    case "gt":        return Number(strVal) > Number(cond.value);
    case "lt":        return Number(strVal) < Number(cond.value);
    default:          return true;
  }
}

function formatCell(value: unknown, field: FieldRead): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "boolean") return value ? "✓" : "✗";
  if (field.field_type === "relation") return "—";
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
