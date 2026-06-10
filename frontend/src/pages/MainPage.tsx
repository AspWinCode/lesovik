import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type SidebarTab } from "@/components/layout/Sidebar";
import { PreviewPanel } from "@/components/layout/PreviewPanel";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { ProjectCard, CreateProjectCard, type Project } from "@/components/ui/ProjectCard";
import { InfoCard, type InfoCardData } from "@/components/ui/InfoCard";
import {
  CreateProjectModal,
  NewAppModal,
  ShareModal,
  RolesModal,
} from "@/components/modals/Modals";
import { useApps, useCreateApp } from "@/shared/hooks/useApps";
import { useAuthStore } from "@/shared/auth/store";
import type { App } from "@/shared/api/apps";

type ModalType = "create" | "new-app" | "share" | "roles" | null;

/** Map a backend App into the shape the ProjectCard expects. */
function toProject(app: App, currentUserId?: string): Project {
  return {
    id: app.id,
    name: app.name,
    description: app.description ?? undefined,
    imageUrl: undefined,
    status: app.is_published ? "Опубликовано" : "Прототип",
    owner: currentUserId && app.owner_id === currentUserId ? "Я" : "—",
    lastModified: formatDistanceToNow(new Date(app.updated_at), {
      addSuffix: true,
      locale: ru,
    }),
  };
}

/** Slugify an app name into the [a-z0-9-_] form the backend requires. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safe = base.length >= 2 ? base : `app-${base}`;
  return `${safe}-${Date.now().toString(36)}`;
}

/* ── Mock data for the (not-yet-wired) Databases tab and info cards ── */
const INFO_CARDS_APPS: InfoCardData[] = [
  { id: "data",       content: "11 таблиц\n243 строки данных",  label: "Данные" },
  { id: "interface",  content: "Выполнены 3/7 стр",              label: "Интерфейс" },
  { id: "security",   content: "Защита подключена",              label: "Безопасность" },
  { id: "automation", content: "",                                label: "Автоматизация" },
];

const INFO_CARDS_DB: InfoCardData[] = [
  { id: "t1", content: "11 таблиц\n243 строки данных",  label: "Таблица 1" },
  { id: "t2", content: "Выполнены 3/7 стр",              label: "Таблица 2" },
  { id: "t3", content: "Защита подключена",              label: "Таблица 3" },
  { id: "t4", content: "",                                label: "Таблица 4" },
];

const TOP_TABS = [
  {
    id: "apps",
    label: "Приложения",
    icon: (
      <svg viewBox="0 0 23 23" fill="none" className="w-full h-full">
        <rect x="4" y="1" width="15" height="21" rx="3" stroke="#00205F" strokeWidth="2"/>
        <circle cx="11.5" cy="18.5" r="1" fill="#00205F"/>
      </svg>
    ),
  },
  {
    id: "databases",
    label: "Базы данных",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <ellipse cx="12" cy="6" rx="8" ry="3" stroke="#00205F" strokeWidth="2"/>
        <path d="M4 6 L4 18 C4 19.66 7.58 21 12 21 C16.42 21 20 19.66 20 18 L20 6" stroke="#00205F" strokeWidth="2"/>
        <path d="M4 12 C4 13.66 7.58 15 12 15 C16.42 15 20 13.66 20 12" stroke="#00205F" strokeWidth="2"/>
      </svg>
    ),
  },
];

export function MainPage() {
  const [sidebarTab, setSidebarTab]    = useState<SidebarTab>("all");
  const [topTab, setTopTab]            = useState<"apps" | "databases">("apps");
  const [selectedProject, setSelected] = useState<string | null>(null);
  const [modal, setModal]              = useState<ModalType>(null);

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useApps();
  const createApp = useCreateApp();

  const apps = data?.items ?? [];
  const projects = apps.map((a) => toProject(a, currentUser?.id));

  const isApps = topTab === "apps";
  const infoCards = isApps ? INFO_CARDS_APPS : INFO_CARDS_DB;
  const infoTitle = isApps ? "Информация о проекте" : "Информация о базе данных";

  // Selection defaults to the first app once loaded.
  const effectiveSelected = selectedProject ?? projects[0]?.id ?? null;
  const selected = projects.find((p) => p.id === effectiveSelected);

  async function handleCreateApp(name: string) {
    await createApp.mutateAsync({ name, slug: slugify(name) });
    setModal(null);
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden">
      <Navbar onGroupAddClick={() => setModal("roles")} />
      <Sidebar active={sidebarTab} onChange={setSidebarTab} />

      {/* Main content area */}
      <main
        className="absolute top-[70px] bg-mainbg overflow-hidden"
        style={{
          left: 280,
          width: 1045,
          height: 1000,
          borderRadius: "20px 5px 5px 20px",
        }}
      >
        {/* Header: title + tabs */}
        <div className="absolute left-[40px] top-[7px] flex items-center gap-[53px]">
          <h1 className="text-title font-semibold text-primary whitespace-nowrap">
            Выберите проект
          </h1>
          <TabSwitcher
            tabs={TOP_TABS}
            activeId={topTab}
            onChange={(id) => setTopTab(id as "apps" | "databases")}
          />
        </div>

        {/* Project cards row */}
        <div className="absolute left-[40px] top-[86px] flex items-center gap-[30px]">
          <CreateProjectCard onClick={() => setModal("create")} />

          {isApps && isLoading && (
            <div className="flex items-center text-primary/60 text-lg h-[284px] px-6">
              Загрузка приложений…
            </div>
          )}

          {isApps && isError && (
            <div className="flex flex-col items-start justify-center gap-2 h-[284px] px-6">
              <span className="text-mistake text-lg">Не удалось загрузить приложения</span>
              <button
                onClick={() => refetch()}
                className="text-cta hover:text-active underline text-base"
              >
                Повторить
              </button>
            </div>
          )}

          {isApps && !isLoading && !isError && projects.length === 0 && (
            <div className="flex items-center text-primary/60 text-lg h-[284px] px-6">
              Пока нет приложений — создайте первое.
            </div>
          )}

          {isApps &&
            projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                variant="apps"
                isSelected={p.id === effectiveSelected}
                onClick={() => setSelected(p.id)}
                onShareClick={() => { setSelected(p.id); setModal("share"); }}
              />
            ))}

          {!isApps && (
            <div className="flex items-center text-primary/60 text-lg h-[284px] px-6">
              Базы данных появятся здесь.
            </div>
          )}
        </div>

        {/* Section title */}
        <h2 className="absolute left-[40px] top-[396px] text-title font-semibold text-primary">
          {infoTitle}
        </h2>

        {/* Info cards row */}
        <div className="absolute left-[40px] top-[452px] flex gap-[65px]">
          {infoCards.map((card) => (
            <InfoCard key={card.id} card={card} />
          ))}
        </div>

        {/* Scroll-arrow — right edge of info cards row */}
        <div
          className="absolute flex items-center justify-center
                     bg-[rgba(152,155,159,0.4)] rounded-full cursor-pointer
                     hover:bg-[rgba(152,155,159,0.6)] transition-colors"
          style={{ left: 985, top: 629, width: 45, height: 45 }}
        >
          <svg viewBox="0 0 22 31" fill="none" className="w-[14px] h-[20px]">
            <path d="M4 2 L18 15.5 L4 29" stroke="rgba(64,64,64,0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Bottom CTA */}
        <button
          onClick={() => navigate("/data")}
          className="absolute flex items-center justify-center gap-5
                     bg-cta rounded-btn text-[24px] font-medium text-white
                     hover:bg-active transition-colors cursor-pointer"
          style={{ left: "calc(50% - 165.5px)", top: 919, width: 331, height: 50 }}
        >
          Приступить к работе
        </button>
      </main>

      <PreviewPanel
        projectName={selected?.name ?? "Fitness App"}
      />

      {/* Modals */}
      {modal === "create"  && (
        <CreateProjectModal
          onClose={() => setModal(null)}
          onAppOption={() => setModal("new-app")}
        />
      )}
      {modal === "new-app" && (
        <NewAppModal
          onClose={() => setModal(null)}
          onConfirm={handleCreateApp}
          isSubmitting={createApp.isPending}
        />
      )}
      {modal === "share"   && (
        <ShareModal onClose={() => setModal(null)} />
      )}
      {modal === "roles"   && (
        <RolesModal
          onClose={() => setModal(null)}
          projectName={selected?.name ?? "Дикая Сибирь"}
        />
      )}
    </div>
  );
}
