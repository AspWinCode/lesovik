import { useState, useEffect, useRef } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { isAuthenticated } from "@/shared/auth/tokens";
import { listApps, type App } from "@/shared/api/apps";
import { listPages, listViews, type PageRead, type ViewRead } from "@/shared/api/views";
import { listEntities, listRelations, type EntityRead, type FieldRead, type RelationRead } from "@/shared/api/entities";
import { listRecords, createRecord, updateRecord, type RecordRead } from "@/shared/api/records";
import { apiClient } from "@/shared/api/client";
import { fetchMe } from "@/shared/api/auth";
import { parseStaticOptions, groupRecordsByField, buildRecordTree } from "./blockHelpers";

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
  nav_position?: "top" | "bottom";
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
    } else if (!activePageId || !allPages.find((p) => p.id === activePageId)) {
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

  const activePage = allPages.find((p) => p.id === activePageId) ?? navPages[0] ?? null;
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
  const navPosition = design.nav_position ?? "top";

  const horizontalNav = navPages.length > 1 && narrow ? (
    <nav
      style={{
        display: "flex", overflowX: "auto", gap: 4, padding: "8px 12px", background: colors.surface,
        borderBottom: navPosition === "top" ? `1px solid ${colors.border}` : "none",
        borderTop: navPosition === "bottom" ? `1px solid ${colors.border}` : "none",
        position: navPosition === "bottom" ? "sticky" : "static",
        bottom: navPosition === "bottom" ? 0 : undefined,
        zIndex: navPosition === "bottom" ? 10 : undefined,
      }}
    >
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
  ) : null;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily, transition: "background 0.2s, color 0.2s", display: "flex", flexDirection: "column" }}>
      {/* App bar */}
      <header style={{ height: 56, background: accent, color: "#fff", display: "flex", alignItems: "center", padding: "0 20px", fontWeight: 600, fontSize: 18, flexShrink: 0 }}>
        {app.name}
      </header>

      {/* Horizontal tab nav on narrow screens — top placement */}
      {navPosition === "top" && horizontalNav}

      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 1100, margin: "0 auto", width: "100%", flex: 1, padding: narrow ? densityPad : densityPad, gap: 16, boxSizing: "border-box" }}>
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

      {/* Horizontal tab nav on narrow screens — bottom placement */}
      {navPosition === "bottom" && horizontalNav}
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
  const qc = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entity?.id],
    queryFn: () => listRecords(appId, entity!.id, { limit: 200 }),
    enabled: !!entity,
  });
  const allRecords = recordsQuery.data?.items ?? [];
  // On a detail page, show only the active record
  const records = (page.layout?.system_type === "detail" && activeRecordId)
    ? allRecords.filter((r) => r.id === activeRecordId)
    : allRecords;
  // Entity-scoped saved views + switcher state
  const viewsQuery = useQuery({
    queryKey: ["rt-views", appId, entityId],
    queryFn: () => listViews(appId, entityId!),
    enabled: !!entityId && !!entity,
  });
  const savedViews: ViewRead[] = viewsQuery.data ?? [];
  const defaultView = savedViews.find((v) => v.is_default);
  const [activeViewId, setActiveViewId] = useState<string | null>(defaultView?.id ?? null);
  const activeView = savedViews.find((v) => v.id === activeViewId);

  const hiddenColumns = (activeView?.config?.hidden_columns as string[] | undefined) ?? (page.layout?.hidden_columns as string[] | undefined) ?? [];
  const visibleSystemColumns = (activeView?.config?.visible_system_columns as string[] | undefined) ?? (page.layout?.visible_system_columns as string[] | undefined) ?? [];
  const colOrderMode = (page.layout?.column_order_mode as "auto" | "manual") ?? "auto";
  const columnWidth = (activeView?.config?.column_width as string) ?? (page.layout?.column_width as string) ?? "Средняя";
  // System fields stay excluded by default (matches prior behavior); manual
  // mode can opt individual ones back in via visibleSystemColumns.
  const allCols = colOrderMode === "manual"
    ? (entity?.fields ?? []).filter((f) => !f.is_system || visibleSystemColumns.includes(f.name))
    : (entity?.fields ?? []).filter((f) => !f.is_system);
  const cols = colOrderMode === "manual"
    ? allCols.filter((f) => !hiddenColumns.includes(f.name))
    : allCols;

  const hasDataView = !!viewType && viewType !== "form";

  // Filter panel: active per-field filters, applied to this page's own bound records
  // (blocks/views that share the page's entity — see filteredRecords below).
  const [pageFilters, setPageFilters] = useState<Record<string, string>>({});
  const filterPanelBlock = blocks.find((b) => b.type === "filter_panel");
  const filterEntityMatches = !!entity && (filterPanelBlock?.config?.entity_id as string | undefined) === entity.id;
  const filteredRecords = filterEntityMatches
    ? records.filter((r) =>
        Object.entries(pageFilters).every(([field, val]) => {
          if (!val) return true;
          return String(r.payload[field] ?? "").toLowerCase().includes(val.toLowerCase());
        })
      )
    : records;

  // Page-level form state (shared across text_field / toggle / number_field blocks)
  const [pageFormValues, setPageFormValues] = useState<Record<string, unknown>>({});
  const [pageFileValues, setPageFileValues] = useState<Record<string, File[]>>({});
  const [pageSaveStatus, setPageSaveStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function setFormField(field: string, value: unknown) {
    setPageFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function setFormFile(field: string, files: File[]) {
    setPageFileValues((prev) => {
      if (files.length === 0) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: files };
    });
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

      // Compute totals from positions picker and inject into entity payload
      const positions = (formVals._positions as Array<{ catalog_id: string; nazvanie: string; kolichestvo: number; cena: number; edinica: string; extra_ids?: Record<string, string> }>) ?? [];
      const pickerBlock = visibleBlocks.find((b) => b.type === "positions_picker");
      const pickerCfg = pickerBlock?.config as {
        positions_entity_id?: string; parent_field?: string; item_field?: string;
        qty_field?: string; price_field?: string; name_field?: string; unit_field?: string;
        row_total_field?: string; total_field?: string;
      } | undefined;
      const pickerExtras = pickerBlock ? getPositionsPickerExtras(pickerBlock.config) : [];
      if (positions.length > 0) {
        const posTotal = positions.reduce((s, p) => s + p.kolichestvo * p.cena, 0);
        if (validFields.has("summa_tovarov")) payload["summa_tovarov"] = posTotal;
        if (validFields.has("itogo")) {
          const discountPct = formVals.skidka_primenena ? Number(formVals.skidka_proc ?? 0) : 0;
          payload["itogo"] = Math.round(posTotal * (1 - discountPct / 100));
        }
        if (pickerCfg?.total_field && validFields.has(pickerCfg.total_field)) {
          payload[pickerCfg.total_field] = Math.round(posTotal);
        }
      }

      const newRec = await createRecord(appId, entity.id, { payload });
      if (pickerCfg?.positions_entity_id && positions.length > 0) {
        const destEntity = entities?.find((e) => e.id === pickerCfg.positions_entity_id);
        const destFieldNames = new Set((destEntity?.fields ?? []).map((f) => f.name));
        await Promise.all(positions.map((pos) => {
          const childPayload: Record<string, unknown> = {
            [pickerCfg.parent_field ?? "zakaz_svaz"]: newRec.id,
            [pickerCfg.item_field ?? "torar_usluga"]: pos.catalog_id,
            [pickerCfg.qty_field ?? "kolichestvo"]: pos.kolichestvo,
          };
          const priceField = pickerCfg.price_field ?? "cena_z_ed";
          if (destFieldNames.has(priceField)) childPayload[priceField] = pos.cena;
          const nameField = pickerCfg.name_field ?? "nazvanie_tovara";
          if (destFieldNames.has(nameField)) childPayload[nameField] = pos.nazvanie;
          const unitField = pickerCfg.unit_field ?? "edinica";
          if (destFieldNames.has(unitField)) childPayload[unitField] = pos.edinica;
          for (const extra of pickerExtras) {
            const extraId = pos.extra_ids?.[extra.field];
            if (extra.field && extraId && destFieldNames.has(extra.field)) {
              childPayload[extra.field] = extraId;
            }
          }
          if (pickerCfg.row_total_field && destFieldNames.has(pickerCfg.row_total_field)) {
            childPayload[pickerCfg.row_total_field] = Math.round(pos.kolichestvo * pos.cena);
          }
          return createRecord(appId, pickerCfg.positions_entity_id!, { payload: childPayload });
        }));
      }

      for (const [fieldName, files] of Object.entries(pageFileValues)) {
        if (!validFields.has(fieldName)) continue;
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          await apiClient.post(
            `/apps/${appId}/entities/${entity.id}/records/${newRec.id}/files?field_name=${encodeURIComponent(fieldName)}`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
        }
      }

      qc.invalidateQueries({ queryKey: ["rt-records", appId] });
      setPageFormValues({});
      setPageFileValues({});
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
      {hasDataView && savedViews.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveViewId(null)}
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${colors.border}`, background: activeViewId === null ? accent : colors.surface, color: activeViewId === null ? "#fff" : colors.text }}
          >
            По умолчанию
          </button>
          {savedViews.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveViewId(v.id)}
              style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${colors.border}`, background: activeViewId === v.id ? accent : colors.surface, color: activeViewId === v.id ? "#fff" : colors.text }}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
      {hasDataView && (
        <DataView
          viewType={viewType}
          entity={entity}
          cols={cols}
          records={filteredRecords}
          accent={accent}
          colors={colors}
          columnWidth={columnWidth}
          appId={appId}
          entities={entities}
          relations={relations}
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
              records={filteredRecords}
              accent={accent}
              colors={colors}
              inputStyle={inputStyle}
              labelPosition={labelPosition}
              appId={appId}
              entities={entities}
              relations={relations}
              onNavigate={onNavigate}
              onRecordCreated={() => recordsQuery.refetch()}
              formValues={pageFormValues}
              onFormChange={setFormField}
              fileValues={pageFileValues}
              onFileChange={setFormFile}
              filterValues={pageFilters}
              onFilterChange={(field, val) => setPageFilters((prev) => ({ ...prev, [field]: val }))}
              onFormSave={handlePageFormSave}
              formStatus={pageSaveStatus}
              onRowClick={onRowClick}
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
            entities={entities}
            relations={relations}
          />
        );
      })}
    </div>
  );
}

function InlineBlock({ appId, entity, relation, parentRecordId, inlineTitle, accent, colors, entities, relations }: {
  appId: string; entity: EntityRead; relation: RelationRead; parentRecordId: string;
  inlineTitle: string; accent: string; colors: AppColors;
  entities: EntityRead[]; relations: RelationRead[];
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
                {cols.map((f) => {
                  if (f.field_type === "relation") {
                    const rel = relations.find((r) => r.from_entity_id === entity.id && r.from_field_name === f.name);
                    return (
                      <td key={f.id} style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                        <RelationCell
                          appId={appId}
                          relatedEntityId={rel?.to_entity_id ?? null}
                          recordId={String(rec.payload[f.name] ?? "")}
                          entities={entities}
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={f.id} style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                      {f.is_system && f.name === "author_id" ? <AuthorCell userId={String(fieldValue(rec, f) ?? "")} /> : formatCell(fieldValue(rec, f), f)}
                    </td>
                  );
                })}
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

function ImportBlock({ block, appId, entityId, parseCSV, accent, colors, onDone }: {
  block: PageBlock; appId: string; entityId: string;
  parseCSV: (text: string) => Record<string, string>[];
  accent: string; colors: AppColors; onDone: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!entityId) return;
    setStatus("loading");
    const text = await file.text();
    const rows = parseCSV(text);
    setProgress({ done: 0, total: rows.length });
    let done = 0;
    for (const row of rows) {
      try {
        await createRecord(appId, entityId, { payload: row });
      } catch { /* skip bad row */ }
      done++;
      setProgress({ done, total: rows.length });
    }
    setStatus("done");
    onDone();
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input ref={inputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={status === "loading" || !entityId}
          style={{ padding: "8px 20px", borderRadius: 8, background: accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: (status === "loading" || !entityId) ? "not-allowed" : "pointer", opacity: (status === "loading" || !entityId) ? 0.6 : 1 }}
        >
          {block.title || "Загрузить CSV"}
        </button>
        {status === "loading" && <span style={{ fontSize: 13, color: colors.textMuted }}>{progress.done} / {progress.total}</span>}
        {status === "done" && <span style={{ fontSize: 13, color: "#22C55E" }}>Импорт завершён ✓</span>}
        {status === "error" && <span style={{ fontSize: 13, color: "#EF4444" }}>Ошибка импорта</span>}
        {!entityId && <span style={{ fontSize: 13, color: colors.textMuted }}>Таблица не выбрана</span>}
      </div>
      <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Формат: CSV с заголовком. Столбцы должны соответствовать именам полей таблицы.</p>
    </div>
  );
}

function aggregate(values: number[], agg: string): number {
  if (values.length === 0) return 0;
  if (agg === "sum") return values.reduce((a, b) => a + b, 0);
  if (agg === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (agg === "min") return Math.min(...values);
  if (agg === "max") return Math.max(...values);
  return values.length; // count
}

function fieldLabel(f: FieldRead | undefined, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (f?.field_type === "select") {
    const choices = normalizeChoices(f.field_options?.choices);
    return choices.find((c) => c.value === raw)?.label ?? String(raw);
  }
  return String(raw);
}

function PivotBlock({ appId, entities, title, entityId, rowField, colField, valueField, agg, colors }: {
  appId: string; entities: EntityRead[]; title?: string | null; entityId: string;
  rowField: string; colField: string; valueField: string; agg: string; colors: AppColors;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entityId, "pivot"],
    queryFn: () => listRecords(appId, entityId, { limit: 200 }),
    enabled: !!entityId,
  });
  const pivotEntity = entities.find((e) => e.id === entityId);
  const rowFieldDef = pivotEntity?.fields.find((f) => f.name === rowField);
  const colFieldDef = pivotEntity?.fields.find((f) => f.name === colField);
  const records = recordsQuery.data?.items ?? [];

  const rowTargetEntityId = rowFieldDef?.field_type === "relation" ? (rowFieldDef.field_options?.target_entity_id as string | undefined) : undefined;
  const rowRelQuery = useQuery({
    queryKey: ["rt-records", appId, rowTargetEntityId, "pivot-rel"],
    queryFn: () => listRecords(appId, rowTargetEntityId!, { limit: 200 }),
    enabled: !!rowTargetEntityId,
  });
  const rowRelEntity = entities.find((e) => e.id === rowTargetEntityId);
  const rowRelDisplayField = rowRelEntity?.fields.find((f) => !f.is_system && f.field_type === "text")?.name;

  function resolveLabel(def: FieldRead | undefined, raw: string): string {
    if (def?.field_type === "relation" && rowRelDisplayField) {
      const rec = rowRelQuery.data?.items.find((r) => r.id === raw);
      return rec ? String(rec.payload[rowRelDisplayField] ?? "—") : (raw ? raw.slice(0, 8) : "—");
    }
    return fieldLabel(def, raw);
  }

  if (!entityId || !rowField) {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, background: colors.surface, color: colors.textMuted, fontSize: 14 }}>
        Сводная таблица не настроена.
      </section>
    );
  }

  const rowKeys = Array.from(new Set(records.map((r) => String(r.payload[rowField] ?? "")))).sort();
  const colKeys = colField ? Array.from(new Set(records.map((r) => String(r.payload[colField] ?? "")))).sort() : ["_all"];

  function cellValue(rowKey: string, colKey: string): number {
    const bucket = records.filter((r) =>
      String(r.payload[rowField] ?? "") === rowKey &&
      (colField ? String(r.payload[colField] ?? "") === colKey : true)
    );
    const nums = bucket.map((r) => Number(r.payload[valueField]) || 0);
    return aggregate(nums, agg);
  }

  const aggLabel: Record<string, string> = { count: "Кол-во", sum: "Сумма", avg: "Среднее", min: "Минимум", max: "Максимум" };

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", color: colors.text }}>
        <span>{title ?? "Сводная таблица"}</span>
        <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: 13 }}>{aggLabel[agg] ?? agg}{valueField ? ` · ${pivotEntity?.fields.find((f) => f.name === valueField)?.display_name ?? valueField}` : ""}</span>
      </div>
      {rowKeys.length === 0 ? (
        <p style={{ padding: 14, color: colors.textMuted, fontSize: 14 }}>Нет данных.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: colors.textMuted }}>
                  {rowFieldDef?.display_name ?? rowField}
                </th>
                {colKeys.map((ck) => (
                  <th key={ck} style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: colors.textMuted, whiteSpace: "nowrap" }}>
                    {colField ? fieldLabel(colFieldDef, ck) : (aggLabel[agg] ?? agg)}
                  </th>
                ))}
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: colors.textMuted }}>Итого</th>
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((rk) => {
                const rowVals = colKeys.map((ck) => cellValue(rk, ck));
                const rowTotal = colField ? aggregate(rowVals, agg === "count" || agg === "sum" ? "sum" : agg) : rowVals[0];
                return (
                  <tr key={rk} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{resolveLabel(rowFieldDef, rk)}</td>
                    {rowVals.map((v, i) => (
                      <td key={colKeys[i]} style={{ padding: "8px 12px", textAlign: "right" }}>{Number.isFinite(v) ? v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—"}</td>
                    ))}
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{Number.isFinite(rowTotal) ? rowTotal.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GanttBlock({ appId, entities, title, entityId, startFieldName, endFieldName, titleFieldName, accent }: {
  appId: string; entities: EntityRead[]; title: string; entityId: string;
  startFieldName: string; endFieldName: string; titleFieldName: string; accent: string;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entityId, "gantt"],
    queryFn: () => listRecords(appId, entityId, { limit: 200 }),
    enabled: !!entityId,
  });
  const ganttEntity = entities.find((e) => e.id === entityId);
  const cols = (ganttEntity?.fields ?? []).filter((f) => !f.is_system);
  const startField = cols.find((f) => f.name === startFieldName);
  const endField = cols.find((f) => f.name === endFieldName) ?? startField;
  const titleFieldDef = cols.find((f) => f.name === titleFieldName);

  return (
    <GanttView
      title={title}
      cols={cols}
      records={recordsQuery.data?.items ?? []}
      accent={accent}
      startField={startField}
      endField={endField}
      nameField={titleFieldDef}
    />
  );
}

function TreeBlock({ appId, entities, title, entityId, labelFieldName, parentFieldName, colors, onRowClick }: {
  appId: string; entities: EntityRead[]; title: string; entityId: string;
  labelFieldName: string; parentFieldName: string; colors: AppColors;
  onRowClick?: (entityId: string, recordId: string) => void;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entityId, "tree"],
    queryFn: () => listRecords(appId, entityId, { limit: 500 }),
    enabled: !!entityId,
  });
  const treeEntity = entities.find((e) => e.id === entityId);
  const labelField = (treeEntity?.fields ?? []).find((f) => f.name === labelFieldName)
    ?? (treeEntity?.fields ?? []).find((f) => !f.is_system);
  const records = recordsQuery.data?.items ?? [];

  if (!entityId || !parentFieldName) {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, background: colors.surface, color: colors.textMuted, fontSize: 14 }}>
        Дерево не настроено: выберите сущность и поле «Родитель».
      </section>
    );
  }

  const tree = buildRecordTree(records, parentFieldName);

  function TreeRow({ node, depth }: { node: ReturnType<typeof buildRecordTree>[number]; depth: number }) {
    return (
      <>
        <div
          onClick={() => onRowClick?.(entityId, node.record.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
            paddingLeft: 10 + depth * 20, fontSize: 13, color: colors.text,
            cursor: onRowClick ? "pointer" : "default",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ color: colors.textMuted, fontSize: 11, width: 14, flexShrink: 0 }}>
            {node.children.length > 0 ? "▾" : "·"}
          </span>
          {labelField ? String(node.record.payload[labelField.name] ?? "—") : node.record.id.slice(0, 8)}
        </div>
        {node.children.map((child) => (
          <TreeRow key={child.record.id} node={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>{title}</div>
      {tree.length === 0 ? (
        <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>Нет записей.</div>
      ) : (
        <div>
          {tree.map((node) => (
            <TreeRow key={node.record.id} node={node} depth={0} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChartBlock({ title, chartType, records, labelField, valueField, colors, accent }: {
  title?: string | null; chartType: string; records: RecordRead[];
  labelField: string; valueField: string; colors: AppColors; accent: string;
}) {
  const points = records.map((r) => ({
    label: String(r.payload[labelField] ?? ""),
    value: Number(r.payload[valueField]) || 0,
  }));
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>
        {title ?? "Диаграмма"}
      </div>
      {points.length === 0 || !valueField ? (
        <p style={{ padding: 14, color: colors.textMuted, fontSize: 14 }}>Нет данных для отображения.</p>
      ) : chartType === "line" ? (
        <svg viewBox={`0 0 ${Math.max(100, points.length * 60)} 160`} style={{ width: "100%", height: 180, display: "block" }} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={accent}
            strokeWidth={2}
            points={points.map((p, i) => `${i * 60 + 30},${140 - (p.value / max) * 120}`).join(" ")}
          />
          {points.map((p, i) => (
            <circle key={i} cx={i * 60 + 30} cy={140 - (p.value / max) * 120} r={3} fill={accent} />
          ))}
        </svg>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, padding: 16, height: 180, overflowX: "auto" }}>
          {points.map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 48 }}>
              <span style={{ fontSize: 12, color: colors.text }}>{p.value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</span>
              <div style={{ width: 32, height: Math.max(2, (p.value / max) * 120), background: accent, borderRadius: "4px 4px 0 0" }} />
              <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: "nowrap", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis" }} title={p.label}>{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TableBlock({ appId, entities, relations, title, entityId, visibleSystemColumns, colors, onRowClick }: {
  appId: string; entities?: EntityRead[]; relations?: RelationRead[]; title?: string | null;
  entityId: string; visibleSystemColumns?: string[]; colors: AppColors; onRowClick?: (entityId: string, recordId: string) => void;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, entityId, "table-block"],
    queryFn: () => listRecords(appId, entityId, { limit: 200 }),
    enabled: !!entityId,
  });
  const tableEntity = entities?.find((e) => e.id === entityId) ?? null;
  const records = recordsQuery.data?.items ?? [];
  const cols = (tableEntity?.fields ?? []).filter((f) => !f.is_system || (visibleSystemColumns ?? []).includes(f.name));

  if (!tableEntity) {
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, background: colors.surface, color: colors.textMuted, fontSize: 14 }}>
        Таблица не выбрана.
      </section>
    );
  }

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", color: colors.text }}>
        <span>{title ?? tableEntity.display_name ?? "Таблица"}</span>
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
                <tr
                  key={rec.id}
                  style={{ borderBottom: `1px solid ${colors.border}`, cursor: onRowClick ? "pointer" : "default" }}
                  onClick={onRowClick ? () => onRowClick(tableEntity.id, rec.id) : undefined}
                >
                  {cols.map((f) => {
                    if (f.field_type === "relation") {
                      const rel = relations?.find((r) => r.from_entity_id === tableEntity.id && r.from_field_name === f.name);
                      return (
                        <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          <RelationCell appId={appId} relatedEntityId={rel?.to_entity_id ?? null} recordId={String(rec.payload[f.name] ?? "")} entities={entities ?? []} />
                        </td>
                      );
                    }
                    return (
                      <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {f.is_system && f.name === "author_id" ? <AuthorCell userId={String(fieldValue(rec, f) ?? "")} /> : formatCell(fieldValue(rec, f), f)}
                      </td>
                    );
                  })}
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

function Block({ block, entity, cols, records, accent, colors, inputStyle, labelPosition, appId, entities, relations, onNavigate, onRecordCreated, formValues, onFormChange, fileValues, onFileChange, filterValues, onFilterChange, onFormSave, formStatus, onRowClick }: {
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
  relations?: RelationRead[];
  onNavigate: (id: string) => void;
  onRecordCreated: () => void;
  formValues?: Record<string, unknown>;
  onFormChange?: (field: string, value: unknown) => void;
  fileValues?: Record<string, File[]>;
  onFileChange?: (field: string, files: File[]) => void;
  filterValues?: Record<string, string>;
  onFilterChange?: (field: string, value: string) => void;
  onFormSave?: (targetPageId?: string) => Promise<void>;
  formStatus?: "idle" | "submitting" | "success" | "error";
  onRowClick?: (entityId: string, recordId: string) => void;
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
    const dynamicField = block.config?.dynamic_field as string | undefined;
    const displayValue = dynamicField && formValues?.[dynamicField] !== undefined
      ? String(formValues[dynamicField])
      : (block.config?.value as string) ?? "—";
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16, background: colors.surface, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, color: colors.textMuted }}>{block.title ?? "Метрика"}</span>
        <span style={{ fontSize: 40, fontWeight: 700, color: accent }}>{displayValue}</span>
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

  if (block.type === "modal") {
    const cfg = block.config ?? {};
    return (
      <ModalBlock
        title={(cfg.title as string) ?? "Диалог"}
        triggerLabel={(cfg.trigger_label as string) || "Открыть"}
        variant={(cfg.trigger_variant as string) ?? "primary"}
        content={(cfg.content as string) ?? ""}
        accent={accent}
        colors={colors}
      />
    );
  }

  if (block.type === "tabs") {
    const cfg = block.config ?? {};
    return (
      <TabsBlock
        tabs={(cfg.tabs as { id: string; label: string; content?: string }[] | undefined) ?? []}
        accent={accent}
        colors={colors}
      />
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

  if (block.type === "toggle" || block.type === "checkbox") {
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

  if (block.type === "file_upload") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    return (
      <FileUploadBlock
        label={(cfg.label as string) ?? block.title ?? ""}
        accept={(cfg.accept as string) ?? "*"}
        maxSizeMb={Number(cfg.max_size_mb ?? 10)}
        multiple={Boolean(cfg.multiple)}
        files={(fieldName ? fileValues?.[fieldName] : undefined) ?? []}
        onChange={(files) => fieldName && onFileChange?.(fieldName, files)}
        colors={colors}
      />
    );
  }

  if (block.type === "dropdown") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    return (
      <DropdownBlock
        appId={appId}
        label={(cfg.label as string) ?? block.title ?? ""}
        source={(cfg.source as string) ?? "static"}
        staticOptions={(cfg.options as string) ?? ""}
        entityId={(cfg.entity_id as string) ?? ""}
        displayField={(cfg.display_field as string) || "nazvanie"}
        multiple={Boolean(cfg.multiple)}
        value={fieldName ? formValues?.[fieldName] : undefined}
        onChange={(v) => fieldName && onFormChange?.(fieldName, v)}
        colors={colors}
      />
    );
  }

  if (block.type === "date_field") {
    const cfg = block.config ?? {};
    const fieldName = (cfg.field_name as string) ?? "";
    return (
      <DateFieldBlock
        label={(cfg.label as string) ?? block.title ?? ""}
        mode={(cfg.mode as string) ?? "single"}
        defaultToday={Boolean(cfg.default_today)}
        value={fieldName ? formValues?.[fieldName] : undefined}
        onChange={(v) => fieldName && onFormChange?.(fieldName, v)}
        colors={colors}
      />
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
    const refEntity = entities?.find((e) => e.id === refEntityId);
    const autoDisplayField = refEntity?.fields?.find((f) => !f.is_system)?.name ?? "id";
    const displayField = (cfg.display_field as string) || autoDisplayField;
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

  if (block.type === "responsible") {
    const cfg = block.config ?? {};
    const refEntityId = (cfg.entity_id as string) ?? "";
    const refEntity = entities?.find((e) => e.id === refEntityId);
    const autoDisplayField = refEntity?.fields?.find((f) => !f.is_system)?.name ?? "id";
    const displayField = (cfg.display_field as string) || autoDisplayField;
    const matchField = (cfg.match_field as string) || displayField;
    const fieldName = (cfg.field_name as string) ?? "";
    const label = (cfg.label as string) ?? block.title ?? "";
    return (
      <ResponsibleBlock
        appId={appId}
        refEntityId={refEntityId}
        displayField={displayField}
        matchField={matchField}
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
    const formEntityId = block.config?.entity_id as string | undefined;
    const formEntity = formEntityId ? (entities?.find((e) => e.id === formEntityId) ?? entity) : entity;
    const formCols = formEntityId ? (formEntity?.fields ?? []).filter((f) => !f.is_system) : cols;
    return (
      <FormBlock
        block={block}
        entity={formEntity}
        cols={formCols}
        appId={appId}
        accent={accent}
        colors={colors}
        inputStyle={inputStyle}
        labelPosition={labelPosition}
        entities={entities ?? []}
        onSuccess={onRecordCreated}
      />
    );
  }

  if (block.type === "positions_picker") {
    return (
      <PositionsPicker
        block={block}
        appId={appId}
        formValues={formValues}
        onFormChange={onFormChange}
        colors={colors}
        accent={accent}
      />
    );
  }

  if (block.type === "record_card") {
    const cfg = block.config ?? {};
    const showFields = (cfg.fields as string[] | undefined) ?? cols.map((f) => f.name);
    const rec = records[0];
    const visibleCols = cols.filter((f) => showFields.length === 0 || showFields.includes(f.name));
    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
        {block.title && (
          <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>
            {block.title}
          </div>
        )}
        {!rec ? (
          <p style={{ padding: 14, color: colors.textMuted, fontSize: 14 }}>Запись не найдена.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: colors.border }}>
            {visibleCols.map((f) => (
              <div key={f.id} style={{ background: colors.surface, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.display_name}</div>
                <div style={{ fontSize: 14, color: colors.text, fontWeight: 500 }}>
                  {f.field_type === "relation" ? (
                    <RelationCell
                      appId={appId}
                      relatedEntityId={(relations ?? []).find((r) => r.from_entity_id === entity?.id && r.from_field_name === f.name)?.to_entity_id ?? null}
                      recordId={String(rec.payload[f.name] ?? "")}
                      entities={entities ?? []}
                    />
                  ) : f.is_system && f.name === "author_id" ? (
                    <AuthorCell userId={String(fieldValue(rec, f) ?? "")} />
                  ) : (
                    String(fieldValue(rec, f) ?? "—")
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (block.type === "calendar") {
    const cfg = block.config ?? {};
    const dateField = cols.find((f) => f.name === cfg.date_field) ?? cols.find((f) => f.field_type === "date");
    const titleField = cols.find((f) => f.name === cfg.title_field) ?? cols[0];
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
          {block.title ?? "Календарь"} — {monthName}
        </div>
        {!dateField ? (
          <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>Выберите поле даты в настройках блока.</div>
        ) : (
          <div style={{ padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
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
                      {titleField ? String(r.payload[titleField.name] ?? "•") : "•"}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (block.type === "kanban") {
    const cfg = block.config ?? {};
    const groupField = cols.find((f) => f.name === cfg.group_by) ?? cols.find((f) => f.field_type === "select");
    const cardTitleField = cols.find((f) => f.name === cfg.card_title) ?? cols[0];
    const groups = groupField ? groupRecordsByField(records, groupField.name) : [];
    return (
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, color: colors.text }}>{block.title ?? "Kanban"}</div>
        {!groupField ? (
          <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>Выберите поле группировки в настройках блока.</div>
        ) : (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: 12 }}>
            {groups.map((g) => (
              <div key={g.key} style={{ minWidth: 180, flex: "0 0 180px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, padding: "4px 0" }}>
                  {fieldLabel(groupField, g.key)} <span style={{ fontWeight: 400 }}>({g.items.length})</span>
                </div>
                {g.items.map((rec) => (
                  <div key={rec.id} style={{ background: colors.bg, borderRadius: 8, padding: "10px 12px", fontSize: 13, border: `1px solid ${colors.border}`, color: colors.text }}>
                    {cardTitleField ? String(rec.payload[cardTitleField.name] ?? "—") : rec.id.slice(0, 8)}
                  </div>
                ))}
                {g.items.length === 0 && (
                  <div style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", padding: 8 }}>Пусто</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (block.type === "gantt") {
    const cfg = block.config ?? {};
    return (
      <GanttBlock
        appId={appId}
        entities={entities ?? []}
        title={block.title ?? "Диаграмма Ганта"}
        entityId={(cfg.entity_id as string) || entity?.id || ""}
        startFieldName={(cfg.start_field as string) ?? ""}
        endFieldName={(cfg.end_field as string) ?? ""}
        titleFieldName={(cfg.title_field as string) ?? ""}
        accent={accent}
      />
    );
  }

  if (block.type === "tree") {
    const cfg = block.config ?? {};
    return (
      <TreeBlock
        appId={appId}
        entities={entities ?? []}
        title={block.title ?? "Дерево данных"}
        entityId={(cfg.entity_id as string) || entity?.id || ""}
        labelFieldName={(cfg.label_field as string) ?? ""}
        parentFieldName={(cfg.parent_field as string) ?? ""}
        colors={colors}
        onRowClick={onRowClick}
      />
    );
  }

  if (block.type === "filter_panel") {
    const cfg = block.config ?? {};
    const targetEntityId = (cfg.entity_id as string) || entity?.id || "";
    const position = (cfg.position as string) ?? "top";
    const panelEntity = entities?.find((e) => e.id === targetEntityId);
    const filterFields = (panelEntity?.fields ?? cols).filter((f) => !f.is_system);
    const onSamePageEntity = targetEntityId === entity?.id;

    return (
      <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, background: colors.surface }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flexDirection: position === "side" ? "column" : "row" }}>
          {filterFields.length === 0 ? (
            <span style={{ fontSize: 13, color: colors.textMuted }}>Сущность не выбрана.</span>
          ) : (
            filterFields.map((f) => (
              <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 140 }}>
                <label style={{ fontSize: 11, color: colors.textMuted }}>{f.display_name}</label>
                {f.field_type === "select" ? (
                  <select
                    value={filterValues?.[f.name] ?? ""}
                    onChange={(e) => onFilterChange?.(f.name, e.target.value)}
                    style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, outline: "none" }}
                  >
                    <option value="">Все</option>
                    {normalizeChoices(f.field_options?.choices).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filterValues?.[f.name] ?? ""}
                    onChange={(e) => onFilterChange?.(f.name, e.target.value)}
                    placeholder="Поиск…"
                    style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, outline: "none" }}
                  />
                )}
              </div>
            ))
          )}
        </div>
        {!onSamePageEntity && targetEntityId && (
          <p style={{ marginTop: 8, fontSize: 11, color: colors.textMuted }}>
            Сущность фильтра отличается от источника данных страницы — фильтр не применяется ни к одному блоку.
          </p>
        )}
      </section>
    );
  }

  if (block.type === "export") {
    const cfg = block.config ?? {};
    const filename = (cfg.filename as string) || entity?.display_name || "export";

    function handleExport() {
      if (!cols.length || !records.length) return;
      const header = cols.map((f) => f.display_name).join(",");
      const rows = records.map((r) =>
        cols.map((f) => {
          const v = fieldValue(r, f);
          const s = v == null ? "" : String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleExport}
          disabled={!records.length}
          style={{ padding: "8px 20px", borderRadius: 8, background: accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: records.length ? "pointer" : "not-allowed", opacity: records.length ? 1 : 0.5 }}
        >
          {block.title || "Выгрузить CSV"}
        </button>
        {records.length > 0 && (
          <span style={{ fontSize: 12, color: colors.textMuted }}>{records.length} записей</span>
        )}
      </div>
    );
  }

  if (block.type === "pivot") {
    const cfg = block.config ?? {};
    return (
      <PivotBlock
        appId={appId}
        entities={entities ?? []}
        title={block.title}
        entityId={(cfg.entity_id as string) || entity?.id || ""}
        rowField={(cfg.row_field as string) ?? ""}
        colField={(cfg.col_field as string) ?? ""}
        valueField={(cfg.value_field as string) ?? ""}
        agg={(cfg.agg as string) ?? "count"}
        colors={colors}
      />
    );
  }

  if (block.type === "chart") {
    const cfg = block.config ?? {};
    const valueField = (cfg.value_field as string) ?? "";
    const labelField = cols.find((f) => f.field_type === "text")?.name ?? cols[0]?.name ?? "id";
    return (
      <ChartBlock
        title={block.title}
        chartType={(cfg.chart_type as string) ?? "bar"}
        records={records}
        labelField={labelField}
        valueField={valueField}
        colors={colors}
        accent={accent}
      />
    );
  }

  if (block.type === "import") {
    const cfg = block.config ?? {};
    const targetEntityId = (cfg.entity_id as string) || entity?.id || "";
    const hasHeader = (cfg.has_header as boolean) ?? true;

    function parseCSV(text: string): Record<string, string>[] {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return [];
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      return lines.slice(hasHeader ? 1 : 0).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      });
    }

    return (
      <ImportBlock
        block={block}
        appId={appId}
        entityId={targetEntityId}
        parseCSV={parseCSV}
        accent={accent}
        colors={colors}
        onDone={onRecordCreated}
      />
    );
  }

  // table (default)
  const tableEntityId = (block.config?.entity_id as string) || "";
  if (tableEntityId && tableEntityId !== entity?.id) {
    return (
      <TableBlock
        appId={appId}
        entities={entities}
        relations={relations}
        title={block.title}
        entityId={tableEntityId}
        visibleSystemColumns={block.config?.visible_system_columns as string[] | undefined}
        colors={colors}
        onRowClick={onRowClick}
      />
    );
  }
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
                <tr
                  key={rec.id}
                  style={{ borderBottom: `1px solid ${colors.border}`, cursor: (onRowClick && entity) ? "pointer" : "default" }}
                  onClick={(onRowClick && entity) ? () => onRowClick(entity.id, rec.id) : undefined}
                >
                  {cols.map((f) => {
                    if (f.field_type === "relation") {
                      const rel = relations?.find((r) => r.from_entity_id === entity?.id && r.from_field_name === f.name);
                      return (
                        <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          <RelationCell
                            appId={appId}
                            relatedEntityId={rel?.to_entity_id ?? null}
                            recordId={String(rec.payload[f.name] ?? "")}
                            entities={entities ?? []}
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={f.id} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {f.is_system && f.name === "author_id" ? <AuthorCell userId={String(fieldValue(rec, f) ?? "")} /> : formatCell(fieldValue(rec, f), f)}
                      </td>
                    );
                  })}
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

interface PositionRow {
  id: string;
  catalog_id: string;
  nazvanie: string;
  kolichestvo: number;
  cena: number;
  edinica: string;
  extra_ids?: Record<string, string>;
  extra_labels?: Record<string, string>;
}

interface PositionsPickerExtra {
  entity_id: string;
  display_field: string;
  label: string;
  field: string;
}

/** extras: [] on new blocks; old blocks stored a single extra_lookup_* + extra_field set directly on config. */
function getPositionsPickerExtras(config: Record<string, unknown>): PositionsPickerExtra[] {
  if (Array.isArray(config.extras)) return config.extras as PositionsPickerExtra[];
  if (config.extra_lookup_entity_id) {
    return [{
      entity_id: config.extra_lookup_entity_id as string,
      display_field: (config.extra_lookup_display_field as string) ?? "",
      label: (config.extra_lookup_label as string) ?? "Раздел",
      field: (config.extra_field as string) ?? "",
    }];
  }
  return [];
}

function PositionsPicker({ block, appId, formValues, onFormChange, colors, accent }: {
  block: PageBlock; appId: string;
  formValues?: Record<string, unknown>;
  onFormChange?: (field: string, value: unknown) => void;
  colors: AppColors; accent: string;
}) {
  const cfg = block.config;
  const catalogEntityId = (cfg.catalog_entity_id as string) ?? "";
  const displayField = (cfg.catalog_display_field as string) ?? "nazvanie";
  const priceField = (cfg.catalog_price_field as string) ?? "cena";
  const unitField = (cfg.catalog_unit_field as string) ?? "edinica";
  const extras = getPositionsPickerExtras(cfg);

  const catalogQuery = useQuery({
    queryKey: ["rt-records", appId, catalogEntityId],
    queryFn: () => listRecords(appId, catalogEntityId, { limit: 200 }),
    enabled: !!catalogEntityId,
  });
  const catalogItems = catalogQuery.data?.items ?? [];

  const extraQueries = useQueries({
    queries: extras.map((ex) => ({
      queryKey: ["rt-records", appId, ex.entity_id, "picker-extra"],
      queryFn: () => listRecords(appId, ex.entity_id, { limit: 200 }),
      enabled: !!ex.entity_id,
    })),
  });
  const extraItemsByField = Object.fromEntries(
    extras.map((ex, i) => [ex.field || `_extra_${i}`, extraQueries[i]?.data?.items ?? []])
  );

  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingExtraIds, setPendingExtraIds] = useState<Record<string, string>>({});

  const positions = ((formValues?._positions ?? []) as PositionRow[]);

  function setPositions(next: PositionRow[]) {
    const total = next.reduce((s, p) => s + p.kolichestvo * p.cena, 0);
    onFormChange?.("_positions", next);
    onFormChange?.("_positions_total", Math.round(total).toLocaleString("ru-RU") + " ₽");
  }

  function addItem(item: { id: string; payload: Record<string, unknown> }) {
    const extraIds: Record<string, string> = {};
    const extraLabels: Record<string, string> = {};
    for (const ex of extras) {
      const key = ex.field || ex.entity_id;
      const selectedId = pendingExtraIds[key];
      if (!selectedId) continue;
      const extraItem = extraItemsByField[key]?.find((e) => e.id === selectedId);
      extraIds[key] = selectedId;
      if (extraItem) extraLabels[key] = String(extraItem.payload[ex.display_field] ?? "");
    }
    const row: PositionRow = {
      id: Math.random().toString(36).slice(2),
      catalog_id: item.id,
      nazvanie: String(item.payload[displayField] ?? ""),
      kolichestvo: 1,
      cena: Number(item.payload[priceField] ?? 0),
      edinica: String(item.payload[unitField] ?? ""),
      extra_ids: extraIds,
      extra_labels: extraLabels,
    };
    setPositions([...positions, row]);
    setShowDropdown(false);
    setPendingExtraIds({});
  }

  function updateQty(rowId: string, qty: number) {
    setPositions(positions.map((p) => p.id === rowId ? { ...p, kolichestvo: Math.max(1, qty) } : p));
  }

  function removeRow(rowId: string) {
    setPositions(positions.filter((p) => p.id !== rowId));
  }

  const total = positions.reduce((s, p) => s + p.kolichestvo * p.cena, 0);
  const label = (cfg.label as string) ?? "Позиции заказа";
  const canAdd = extras.every((ex) => !!pendingExtraIds[ex.field || ex.entity_id]);
  const selectSt: React.CSSProperties = {
    height: 34, padding: "0 10px", fontSize: 13, borderRadius: 6,
    border: `1px solid ${colors.border}`, background: colors.surface,
    color: colors.text, outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ padding: "10px 14px", background: colors.bg, fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center", color: colors.text }}>
        <span>{label}</span>
        <button
          onClick={() => setShowDropdown((v) => !v)}
          style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "4px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
        >
          + Добавить
        </button>
      </div>

      {showDropdown && (
        <div style={{ borderBottom: `1px solid ${colors.border}` }}>
          {extras.map((ex, i) => {
            const key = ex.field || ex.entity_id;
            return (
              <div key={key + i} style={{ padding: "10px 14px", borderBottom: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: 12, color: colors.textMuted, display: "block", marginBottom: 4 }}>{ex.label}</label>
                <select
                  value={pendingExtraIds[key] ?? ""}
                  onChange={(e) => setPendingExtraIds((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={selectSt}
                >
                  <option value="">— выберите —</option>
                  {(extraItemsByField[key] ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{String(item.payload[ex.display_field] ?? item.id)}</option>
                  ))}
                </select>
              </div>
            );
          })}
          <div style={{ maxHeight: 220, overflowY: "auto", opacity: canAdd ? 1 : 0.5, pointerEvents: canAdd ? "auto" : "none" }}>
            {catalogItems.length === 0 && (
              <div style={{ padding: "10px 14px", color: colors.textMuted, fontSize: 13 }}>Каталог пуст</div>
            )}
            {catalogItems.map((item) => (
              <div
                key={item.id}
                onClick={() => canAdd && addItem(item)}
                style={{ padding: "9px 14px", cursor: canAdd ? "pointer" : "default", fontSize: 13, color: colors.text, borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={(e) => { if (canAdd) (e.currentTarget as HTMLDivElement).style.background = colors.bg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
              >
                <span style={{ fontWeight: 500 }}>{String(item.payload[displayField] ?? "—")}</span>
                <span style={{ color: colors.textMuted, fontSize: 12 }}>
                  {Number(item.payload[priceField] ?? 0).toLocaleString("ru-RU")} ₽ / {String(item.payload[unitField] ?? "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {positions.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {extras.map((ex, i) => (
                  <th key={(ex.field || ex.entity_id) + i} style={{ padding: "7px 12px", textAlign: "left", color: colors.textMuted, fontWeight: 600 }}>{ex.label}</th>
                ))}
                <th style={{ padding: "7px 12px", textAlign: "left", color: colors.textMuted, fontWeight: 600 }}>Наименование</th>
                <th style={{ padding: "7px 8px", textAlign: "left", color: colors.textMuted, fontWeight: 600 }}>Ед.</th>
                <th style={{ padding: "7px 8px", textAlign: "right", color: colors.textMuted, fontWeight: 600 }}>Кол-во</th>
                <th style={{ padding: "7px 12px", textAlign: "right", color: colors.textMuted, fontWeight: 600 }}>Цена</th>
                <th style={{ padding: "7px 12px", textAlign: "right", color: colors.textMuted, fontWeight: 600 }}>Сумма</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {extras.map((ex, i) => {
                    const key = ex.field || ex.entity_id;
                    return <td key={key + i} style={{ padding: "7px 12px" }}>{p.extra_labels?.[key] ?? "—"}</td>;
                  })}
                  <td style={{ padding: "7px 12px" }}>{p.nazvanie}</td>
                  <td style={{ padding: "7px 8px", color: colors.textMuted }}>{p.edinica}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    <input
                      type="number" min={1} value={p.kolichestvo}
                      onChange={(e) => updateQty(p.id, Number(e.target.value))}
                      style={{ width: 60, textAlign: "right", height: 28, padding: "0 6px", fontSize: 13, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, color: colors.text, outline: "none" }}
                    />
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right" }}>{Number(p.cena).toLocaleString("ru-RU")} ₽</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600 }}>{(p.kolichestvo * p.cena).toLocaleString("ru-RU")} ₽</td>
                  <td style={{ padding: "4px", textAlign: "center" }}>
                    <button
                      onClick={() => removeRow(p.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: 18, lineHeight: 1, padding: "2px 6px" }}
                    >×</button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${colors.border}` }}>
                <td colSpan={extras.length + 4} style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: colors.textMuted, fontSize: 12 }}>ИТОГО:</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: accent, fontSize: 16 }}>
                  {Math.round(total).toLocaleString("ru-RU")} ₽
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>
          Нет позиций. Нажмите «+ Добавить» чтобы выбрать из каталога.
        </div>
      )}
    </section>
  );
}

function LookupBlock({ appId, refEntityId, displayField, fieldName: _fieldName, label, value, onChange, colors }: {
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

function ResponsibleBlock({ appId, refEntityId, displayField, matchField, label, value, onChange, colors }: {
  appId: string; refEntityId: string; displayField: string; matchField: string;
  label: string; value: string; onChange: (v: string) => void; colors: AppColors;
}) {
  const recordsQuery = useQuery({
    queryKey: ["rt-records", appId, refEntityId],
    queryFn: () => listRecords(appId, refEntityId, { limit: 200 }),
    enabled: !!refEntityId,
  });
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });
  const options = recordsQuery.data?.items ?? [];

  // Auto-select once: match the logged-in account's display name against
  // matchField, exact + case-insensitive. Never overrides a value already
  // present (user's own pick, or an existing record being edited).
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || value || !currentUserQuery.data || options.length === 0) return;
    autoSelected.current = true;
    const target = currentUserQuery.data.display_name.trim().toLowerCase();
    const match = options.find((r) => String(r.payload[matchField] ?? "").trim().toLowerCase() === target);
    if (match) onChange(match.id);
  }, [value, currentUserQuery.data, options, matchField, onChange]);

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

function DateFieldBlock({ label, mode, defaultToday, value, onChange, colors }: {
  label: string; mode: string; defaultToday: boolean;
  value: unknown; onChange: (v: string) => void; colors: AppColors;
}) {
  const inputSt: React.CSSProperties = {
    height: 38, padding: "0 12px", fontSize: 14, borderRadius: 8,
    border: `1px solid ${colors.border}`, background: colors.surface,
    color: colors.text, outline: "none", width: "100%", boxSizing: "border-box",
  };

  // Auto-fill today's date once on mount, only if the field is still empty -
  // never overwrites a value the user already typed or that came from an
  // existing record.
  useEffect(() => {
    if (!defaultToday || (value !== undefined && value !== "")) return;
    const today = new Date().toISOString().slice(0, 10);
    onChange(mode === "range" ? `${today}|` : today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === "range") {
    const rawValue = value;
    const [fromValue, toValue] = typeof rawValue === "string" ? rawValue.split("|") : ["", ""];
    const setRange = (from: string, to: string) => onChange(`${from}|${to}`);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={fromValue ?? ""} onChange={(e) => setRange(e.target.value, toValue ?? "")} style={inputSt} />
          <input type="date" value={toValue ?? ""} onChange={(e) => setRange(fromValue ?? "", e.target.value)} style={inputSt} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
      <input
        type="date"
        value={value ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputSt}
      />
    </div>
  );
}

function DropdownBlock({ appId, label, source, staticOptions, entityId, displayField, multiple, value, onChange, colors }: {
  appId: string; label: string; source: string; staticOptions: string;
  entityId: string; displayField: string; multiple: boolean;
  value: unknown; onChange: (v: unknown) => void; colors: AppColors;
}) {
  const entityQuery = useQuery({
    queryKey: ["rt-records", appId, entityId],
    queryFn: () => listRecords(appId, entityId, { limit: 200 }),
    enabled: source === "entity" && !!entityId,
  });

  const options: { value: string; label: string }[] = source === "entity"
    ? (entityQuery.data?.items ?? []).map((r) => ({ value: r.id, label: String(r.payload[displayField] ?? r.id) }))
    : parseStaticOptions(staticOptions).map((o) => ({ value: o, label: o }));

  const selectSt: React.CSSProperties = {
    height: multiple ? 100 : 38, padding: multiple ? 6 : "0 12px", fontSize: 14, borderRadius: 8,
    border: `1px solid ${colors.border}`, background: colors.surface,
    color: colors.text, outline: "none", width: "100%", boxSizing: "border-box",
  };

  if (multiple) {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
        <select
          multiple
          value={selected}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
          style={selectSt}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
      <select value={value ? String(value) : ""} onChange={(e) => onChange(e.target.value)} style={selectSt}>
        <option value="">— выберите —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FileUploadBlock({ label, accept, maxSizeMb, multiple, files, onChange, colors }: {
  label: string; accept: string; maxSizeMb: number; multiple: boolean;
  files: File[]; onChange: (files: File[]) => void; colors: AppColors;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 13, color: colors.textMuted }}>{label}</label>}
      <input
        type="file"
        accept={accept === "*" ? undefined : accept}
        multiple={multiple}
        onChange={(e) => {
          setError(null);
          const picked = Array.from(e.target.files ?? []);
          const tooBig = picked.find((f) => f.size > maxSizeMb * 1024 * 1024);
          if (tooBig) {
            setError(`«${tooBig.name}» больше ${maxSizeMb} МБ`);
            onChange([]);
            return;
          }
          onChange(picked);
        }}
        style={{ fontSize: 13, color: colors.text }}
      />
      {files.length > 0 && (
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {files.map((f) => `${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join(", ")}
        </span>
      )}
      {error && <span style={{ fontSize: 11, color: "#B91C1C" }}>{error}</span>}
    </div>
  );
}

function ModalBlock({ title, triggerLabel, variant, content, accent, colors }: {
  title: string; triggerLabel: string; variant: string; content: string;
  accent: string; colors: AppColors;
}) {
  const [open, setOpen] = useState(false);
  const variantSt: React.CSSProperties =
    variant === "secondary"
      ? { background: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }
      : variant === "link"
      ? { background: "transparent", color: accent, border: "none", textDecoration: "underline", padding: 0 }
      : { background: accent, color: "#fff", border: "none" };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ ...variantSt, borderRadius: 8, padding: variant === "link" ? 0 : "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.surface, borderRadius: 12, padding: 20, minWidth: 320, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>{title}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: colors.textMuted, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 14, color: colors.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{content}</div>
          </div>
        </div>
      )}
    </>
  );
}

function TabsBlock({ tabs, accent, colors }: {
  tabs: { id: string; label: string; content?: string }[]; accent: string; colors: AppColors;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  if (tabs.length === 0) {
    return <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>Вкладки не настроены.</div>;
  }

  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", background: colors.surface }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
              background: "none", border: "none", cursor: "pointer",
              color: t.id === (active?.id ?? tabs[0].id) ? accent : colors.textMuted,
              borderBottom: t.id === (active?.id ?? tabs[0].id) ? `2px solid ${accent}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 16, fontSize: 14, color: colors.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {active?.content || <span style={{ color: colors.textMuted }}>Пусто</span>}
      </div>
    </section>
  );
}

function FormBlock({ block, entity, cols, appId, accent, colors, inputStyle, labelPosition, entities, onSuccess }: {
  block: PageBlock;
  entity: EntityRead | null;
  cols: FieldRead[];
  appId: string;
  accent: string;
  colors: AppColors;
  inputStyle: string;
  labelPosition: string;
  entities: EntityRead[];
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
                  {normalizeChoices(f.field_options?.choices).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              ) : f.field_type === "relation" ? (
                <RelationSelect
                  appId={appId}
                  targetEntityId={(f.field_options?.target_entity_id as string | undefined) ?? null}
                  entities={entities}
                  value={values[f.name] ?? ""}
                  required={f.is_required}
                  style={{ ...inputStyleCss(), cursor: "pointer" }}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                />
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

function RelationSelect({ appId, targetEntityId, entities, value, required, style, onChange }: {
  appId: string; targetEntityId: string | null; entities: EntityRead[];
  value: string; required?: boolean; style: React.CSSProperties; onChange: (v: string) => void;
}) {
  const relEnt = targetEntityId ? entities.find((e) => e.id === targetEntityId) : null;
  const nonSysFields = relEnt?.fields?.filter((f) => !f.is_system) ?? [];
  const displayField = (
    nonSysFields.find((f) => f.field_type === "text") ??
    nonSysFields.find((f) => ["phone", "email"].includes(f.field_type)) ??
    nonSysFields.find((f) => ["number", "currency"].includes(f.field_type))
  )?.name ?? "";

  const q = useQuery({
    queryKey: ["rt-records", appId, targetEntityId, "rel-select"],
    queryFn: () => listRecords(appId, targetEntityId!, { limit: 200 }),
    enabled: !!targetEntityId,
  });
  const options = q.data?.items ?? [];

  if (!targetEntityId) {
    return <input disabled placeholder="Связь не настроена" style={style} />;
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} style={style}>
      <option value="">— выберите —</option>
      {options.map((r) => (
        <option key={r.id} value={r.id}>
          {displayField ? String(r.payload[displayField] ?? r.id.slice(0, 8)) : r.id.slice(0, 8)}
        </option>
      ))}
    </select>
  );
}

function RelationCell({ appId, relatedEntityId, recordId, entities }: {
  appId: string; relatedEntityId: string | null; recordId: string; entities: EntityRead[];
}) {
  const relEnt = relatedEntityId ? entities.find((e) => e.id === relatedEntityId) : null;
  const nonSysFields = relEnt?.fields?.filter((f) => !f.is_system) ?? [];
  const displayField = (
    nonSysFields.find((f) => f.field_type === "text") ??
    nonSysFields.find((f) => ["phone", "email"].includes(f.field_type)) ??
    nonSysFields.find((f) => ["number", "currency"].includes(f.field_type))
  )?.name ?? "";

  const q = useQuery({
    queryKey: ["rt-records", appId, relatedEntityId],
    queryFn: () => listRecords(appId, relatedEntityId!, { limit: 200 }),
    enabled: !!relatedEntityId && !!recordId,
  });

  if (!recordId || recordId === "" || recordId === "undefined") return <>—</>;
  if (!relatedEntityId) return <>{recordId.slice(0, 8)}</>;
  if (q.isLoading) return <>…</>;
  const rec = q.data?.items.find((r) => r.id === recordId);
  if (!rec || !displayField) return <>{recordId.slice(0, 8)}</>;
  return <>{String(rec.payload[displayField] ?? "—")}</>;
}

/** Resolves the "Автор" system field (a platform account id) to that
 * account's display name. GET /users/{id} 404s for accounts other than the
 * viewer unless the viewer has an elevated role - falls back to a shortened
 * id in that case rather than showing an error. */
function AuthorCell({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["rt-user", userId],
    queryFn: () => apiClient.get<{ display_name: string }>(`/users/${userId}`).then((r) => r.data),
    enabled: !!userId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  if (!userId) return <>—</>;
  if (q.isLoading) return <>…</>;
  if (q.data?.display_name) return <>{q.data.display_name}</>;
  return <>{userId.slice(0, 8)}…</>;
}

function DataView({ viewType, entity, cols, records, accent, colors, columnWidth, appId, entities, relations, onRowClick, activeRecordId, onRecordUpdated }: {
  viewType: string;
  entity: EntityRead | null;
  cols: FieldRead[];
  records: RecordRead[];
  accent: string;
  colors: AppColors;
  columnWidth?: string;
  appId: string;
  entities: EntityRead[];
  relations: RelationRead[];
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

  function getRelatedEntityId(fieldName: string): string | null {
    const rel = relations.find((r) => r.from_entity_id === entity?.id && r.from_field_name === fieldName);
    return rel?.to_entity_id ?? null;
  }

  function startEdit(rec: RecordRead) {
    const vals: Record<string, string> = {};
    cols.forEach((f) => {
      if (f.is_system) return;
      vals[f.name] = rec.payload[f.name] != null ? String(rec.payload[f.name]) : "";
    });
    setEditValues(vals);
    setEditRowId(rec.id);
  }

  async function saveEdit() {
    if (!editRowId || !entity) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      cols.forEach((f) => {
        if (f.is_system) return;
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
      ? records.filter((r) => cols.some((f) => String(fieldValue(r, f) ?? "").toLowerCase().includes(q)))
      : records;

    const sortFieldDef = cols.find((f) => f.name === sortField);
    const sorted = sortField
      ? [...filtered].sort((a, b) => {
          const av = String((sortFieldDef ? fieldValue(a, sortFieldDef) : a.payload[sortField]) ?? "");
          const bv = String((sortFieldDef ? fieldValue(b, sortFieldDef) : b.payload[sortField]) ?? "");
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
                        {isEditing && !f.is_system ? (
                          (f.field_type === "select" || f.field_type === "multi_select") ? (
                            <select
                              value={editValues[f.name] ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, [f.name]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              style={{ height: 26, padding: "0 4px", fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, color: colors.text, outline: "none", minWidth: 80 }}
                            >
                              <option value="">—</option>
                              {normalizeChoices(f.field_options?.choices).map((c) => (
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
                        ) : f.field_type === "relation" ? (
                          <RelationCell
                            appId={appId}
                            relatedEntityId={getRelatedEntityId(f.name)}
                            recordId={String(rec.payload[f.name] ?? "")}
                            entities={entities}
                          />
                        ) : f.is_system && f.name === "author_id" ? (
                          <AuthorCell userId={String(fieldValue(rec, f) ?? "")} />
                        ) : (
                          formatCell(fieldValue(rec, f), f)
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
          const choices = normalizeChoices(groupField.field_options?.choices);
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
                        const val = fieldValue(rec, f);
                        if (val === null || val === undefined || val === "") return null;
                        return (
                          <span key={f.id} style={{ fontSize: 12, color: colors.textMuted }}>
                            <span style={{ fontWeight: 500 }}>{f.display_name}:</span>{" "}
                            {f.is_system && f.name === "author_id" ? <AuthorCell userId={String(val ?? "")} /> : formatCell(val, f)}
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
              <span style={{ fontSize: 14, color: "#00205F", wordBreak: "break-word" }}>
                {f.is_system && f.name === "author_id" ? <AuthorCell userId={String(fieldValue(rec, f) ?? "")} /> : formatCell(fieldValue(rec, f), f)}
              </span>
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
function GanttView({ title, cols, records, accent, startField: startFieldProp, endField: endFieldProp, nameField: nameFieldProp }: {
  title: string; cols: FieldRead[]; records: RecordRead[]; accent: string;
  startField?: FieldRead; endField?: FieldRead; nameField?: FieldRead;
}) {
  const dateFields = cols.filter((f) => f.field_type === "date");
  const startField = startFieldProp ?? dateFields[0];
  const endField = endFieldProp ?? dateFields[1] ?? dateFields[0];
  const nameField = nameFieldProp ?? cols.find((f) => f.field_type !== "date") ?? cols[0];

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

function normalizeChoices(raw: unknown): { value: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) =>
    typeof c === "string" ? { value: c, label: c } : (c as { value: string; label: string })
  );
}

/** System fields (id, created_at, updated_at, author_id, is_deleted) live as
 * top-level RecordRead properties, not inside payload - reading
 * rec.payload[f.name] for them is always undefined. */
function fieldValue(rec: RecordRead, f: FieldRead): unknown {
  if (!f.is_system) return rec.payload[f.name];
  switch (f.name) {
    case "id": return rec.id;
    case "created_at": return rec.created_at;
    case "updated_at": return rec.updated_at;
    case "author_id": return rec.created_by;
    case "is_deleted": return rec.is_deleted;
    default: return rec.payload[f.name];
  }
}

function formatCell(value: unknown, field: FieldRead): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "boolean") return value ? "✓" : "✗";
  if (field.field_type === "relation") return "—";
  if (field.field_type === "select") {
    const choices = normalizeChoices(field.field_options?.choices);
    return choices.find((c) => c.value === value)?.label ?? String(value);
  }
  if (field.field_type === "currency" || field.field_type === "formula") {
    const num = Number(value);
    if (!isNaN(num)) return num.toLocaleString("ru-RU") + " ₽";
  }
  if (field.field_type === "date" || field.field_type === "datetime") {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return field.field_type === "date"
        ? d.toLocaleDateString("ru-RU")
        : d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  }
  // System id-like fields (record id, author id) are UUIDs - too long to be
  // useful in a table cell, shorten to a recognizable prefix.
  if (field.is_system && (field.name === "id" || field.name === "author_id")) {
    const s = String(value);
    return s.length > 12 ? `${s.slice(0, 8)}…` : s;
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
