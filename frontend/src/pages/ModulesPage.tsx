import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { IconRail, type RailModule } from "@/components/layout/IconRail";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { cn } from "@/lib/cn";
import type { ModuleConflict, ModuleRead } from "@/shared/api/modules";
import { useApps } from "@/shared/hooks/useApps";
import { useActiveApp } from "@/shared/hooks/useActiveApp";
import { useInstallModule, useModules, useUninstallModule } from "@/shared/hooks/useModules";

const ALL = "All";

function ModuleCard({
  mod,
  disabled,
  onInstall,
  onRemove,
}: {
  mod: ModuleRead;
  disabled: boolean;
  onInstall: () => void;
  onRemove: () => void;
}) {
  const action = mod.installed ? onRemove : onInstall;
  return (
    <div
      className={cn(
        "bg-white rounded-[8px] border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md",
        mod.installed ? "border-cta/50 shadow-[0_0_0_2px_rgba(53,167,255,0.10)]" : "border-cardbg",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[13px] font-semibold shrink-0"
          style={{ background: `${mod.color ?? "#35A7FF"}20`, color: mod.color ?? "#35A7FF" }}
        >
          {(mod.icon ?? mod.code).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-primary truncate">{mod.name}</span>
            {mod.installed && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cta/10 text-cta">
                Installed
              </span>
            )}
          </div>
          <div className="text-[12px] text-primary/45 mt-1">
            {mod.category ?? "General"} · v{mod.current_version ?? "n/a"}
          </div>
        </div>
      </div>

      <p className="text-[13px] text-primary/65 leading-relaxed min-h-[54px]">
        {mod.description ?? "Business module"}
      </p>

      <div className="text-[12px] text-primary/45 min-h-[34px]">
        {mod.dependencies.length ? `Requires: ${mod.dependencies.join(", ")}` : "No dependencies"}
      </div>

      <button
        onClick={action}
        disabled={disabled}
        className={cn(
          "h-[34px] rounded-[8px] text-[13px] font-medium transition-colors mt-auto disabled:opacity-50 disabled:cursor-not-allowed",
          mod.installed
            ? "border border-cardbg text-primary/65 hover:border-mistake hover:text-mistake"
            : "bg-cta text-white hover:bg-cta/90",
        )}
      >
        {mod.installed ? "Remove module" : "Install"}
      </button>
    </div>
  );
}

const KIND_LABEL: Record<ModuleConflict["kind"], string> = {
  entity: "Сущность",
  field: "Поле",
  page: "Страница",
};

function ConflictsPanel({
  conflicts,
  moduleName,
  onDismiss,
}: {
  conflicts: ModuleConflict[];
  moduleName: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-[8px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-amber-800 mb-2">
            {conflicts.length} коллизий имён при установке «{moduleName}»
          </p>
          <div className="flex flex-col gap-1">
            {conflicts.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-amber-700">
                <span className="px-1.5 py-0.5 rounded bg-amber-200/60 font-medium">
                  {KIND_LABEL[c.kind]}
                </span>
                <code className="font-mono">{c.name}</code>
                {c.entity && <span className="text-amber-500">в {c.entity}</span>}
                <span className="text-amber-500">→</span>
                <span>
                  {c.action === "reused" ? "переиспользована" : "пропущено"}{" "}
                  {c.source
                    ? c.source === "manual"
                      ? "(создана вручную)"
                      : `(модуль «${c.source}»)`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-700 text-[18px] leading-none shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ModulesPage() {
  const [railModule, setRailModule] = useState<RailModule>("documents");
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<{ moduleName: string; conflicts: ModuleConflict[] } | null>(null);

  const appsQuery = useApps();
  const app = useActiveApp(appsQuery.data?.items ?? []);
  const modulesQuery = useModules(app?.id);
  const installMutation = useInstallModule(app?.id);
  const uninstallMutation = useUninstallModule(app?.id);

  const modules = modulesQuery.data ?? [];
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(modules.map((m) => m.category).filter(Boolean) as string[])).sort()],
    [modules],
  );
  const filtered = modules.filter((m) => {
    const q = search.trim().toLowerCase();
    const categoryMatches = category === ALL || m.category === category;
    const textMatches =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      (m.description ?? "").toLowerCase().includes(q);
    return categoryMatches && textMatches;
  });
  const installedCount = modules.filter((m) => m.installed).length;
  const isBusy = installMutation.isPending || uninstallMutation.isPending;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function install(code: string) {
    const result = await installMutation.mutateAsync(code);
    if (result.conflicts.length > 0) {
      setConflictResult({ moduleName: result.module.name, conflicts: result.conflicts });
    }
    const conflictNote = result.conflicts.length > 0 ? `, ${result.conflicts.length} коллизий` : "";
    showToast(
      `Installed ${result.module.name}: ${result.entities_created} entities, ${result.fields_created} fields${conflictNote}`,
    );
  }

  async function remove(code: string, name: string) {
    await uninstallMutation.mutateAsync(code);
    showToast(`Removed ${name}`);
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar />
      <IconRail active={railModule} onChange={setRailModule} />

      <main
        className="absolute bg-mainbg overflow-y-auto"
        style={{ left: 85, top: 70, width: 1425, height: 1010 }}
      >
        <div className="px-[48px] py-[32px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[28px] font-bold text-primary">Module catalog</h1>
              <p className="text-[15px] text-primary/50 mt-1">
                Install business modules into the active app. Dependencies are added automatically.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-primary/45">
              <span className="font-medium text-primary">{installedCount}</span> installed of {modules.length}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules"
              className="h-[38px] w-[260px] border border-cardbg rounded-[8px] px-3 text-[14px] bg-white focus:outline-none focus:border-cta"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "h-[34px] px-4 rounded-full text-[13px] font-medium transition-colors border",
                    category === cat
                      ? "bg-cta text-white border-cta"
                      : "bg-white text-primary/60 border-cardbg hover:border-cta hover:text-cta",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {conflictResult && (
            <ConflictsPanel
              conflicts={conflictResult.conflicts}
              moduleName={conflictResult.moduleName}
              onDismiss={() => setConflictResult(null)}
            />
          )}

          {!app && (
            <div className="bg-white border border-cardbg rounded-[8px] p-5 text-[14px] text-primary/60">
              Create or select an app before installing modules.
            </div>
          )}

          {modulesQuery.isLoading ? (
            <div className="text-[14px] text-primary/50">Loading modules...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-[17px] font-semibold text-primary mb-2">No modules found</p>
              <p className="text-[14px] text-primary/40">Change search or category filter</p>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {filtered.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  disabled={!app || isBusy}
                  onInstall={() => void install(mod.code)}
                  onRemove={() => void remove(mod.code, mod.name)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <PreviewPanel projectName={app?.name ?? "Lesovik"} />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[14px] px-5 py-3 rounded-[8px] shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
