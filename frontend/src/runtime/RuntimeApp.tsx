import { useState } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listApps, type App } from "@/shared/api/apps";
import { listPages, type PageRead } from "@/shared/api/views";
import { listEntities, type EntityRead, type FieldRead } from "@/shared/api/entities";
import { listRecords, type RecordRead } from "@/shared/api/records";

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

/** End-user runtime: renders an app's published pages from the backend. */
function RuntimeShell() {
  const [params] = useSearchParams();
  const appId = params.get("app");

  const appsQuery = useQuery({ queryKey: ["rt-apps"], queryFn: () => listApps() });
  const app: App | undefined = appId
    ? appsQuery.data?.items.find((a) => a.id === appId)
    : appsQuery.data?.items[0];
  const resolvedAppId = app?.id;

  const pagesQuery = useQuery({
    queryKey: ["rt-pages", resolvedAppId],
    queryFn: () => listPages(resolvedAppId!),
    enabled: !!resolvedAppId,
  });
  const entitiesQuery = useQuery({
    queryKey: ["rt-entities", resolvedAppId],
    queryFn: () => listEntities(resolvedAppId!),
    enabled: !!resolvedAppId,
  });

  const [activePageId, setActivePageId] = useState<string | null>(null);

  if (appsQuery.isLoading || (resolvedAppId && (pagesQuery.isLoading || entitiesQuery.isLoading))) {
    return <Centered>Загрузка приложения…</Centered>;
  }
  if (!app) {
    return <Centered>Приложение не найдено. Откройте его из конструктора.</Centered>;
  }

  const pages = pagesQuery.data ?? [];
  // Prefer published pages; fall back to all so a freshly-built app still shows.
  const visible = pages.filter((p) => p.is_published);
  const navPages = visible.length > 0 ? visible : pages;
  const activePage =
    navPages.find((p) => p.id === activePageId) ?? navPages[0] ?? null;

  const accent = (activePage?.layout?.design as DesignConfig | undefined)?.accent ?? "#35A7FF";
  const entities = entitiesQuery.data ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#F1F6FF", color: "#00205F", fontFamily: "Inter, sans-serif" }}>
      {/* App bar */}
      <header style={{ height: 56, background: accent, color: "#fff", display: "flex", alignItems: "center", padding: "0 20px", fontWeight: 600, fontSize: 18 }}>
        {app.name}
      </header>

      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 1100, margin: "0 auto", padding: 16, gap: 16 }}>
        {/* Page nav */}
        {navPages.length > 1 && (
          <nav style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
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
            <PageView page={activePage} appId={app.id} entities={entities} accent={accent} />
          )}
        </main>
      </div>
    </div>
  );
}

function PageView({ page, appId, entities, accent }: {
  page: PageRead; appId: string; entities: EntityRead[]; accent: string;
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
          <Block key={b.id} block={b} entity={entity} cols={cols} records={records} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function Block({ block, entity, cols, records, accent }: {
  block: PageBlock; entity: EntityRead | null; cols: FieldRead[]; records: RecordRead[]; accent: string;
}) {
  if (block.type === "button") {
    return (
      <button style={{ alignSelf: "flex-start", background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
        {block.title ?? "Кнопка"}
      </button>
    );
  }

  if (block.type === "form") {
    return (
      <section style={{ border: "1px solid #CBE3FF", borderRadius: 10, padding: 16, background: "#fff" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{block.title ?? "Форма"}</h3>
        {cols.length === 0 ? (
          <p style={{ color: "#8898AA", fontSize: 14 }}>Таблица не выбрана.</p>
        ) : (
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => e.preventDefault()}>
            {cols.slice(0, 8).map((f) => (
              <label key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#5b6b86" }}>
                {f.display_name}{f.is_required && " *"}
                <input
                  disabled
                  placeholder={`Введите ${f.display_name.toLowerCase()}`}
                  style={{ height: 36, borderRadius: 8, border: "1px solid #CBE3FF", padding: "0 12px", background: "#F1F6FF" }}
                />
              </label>
            ))}
            <button style={{ alignSelf: "flex-start", background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", marginTop: 4 }}>
              Сохранить
            </button>
          </form>
        )}
      </section>
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
