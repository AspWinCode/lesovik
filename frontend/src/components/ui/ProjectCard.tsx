import { cn } from "@/lib/cn";
import { DotsMenu } from "./DotsMenu";

export interface Project {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  status: string;
  owner: string;
  lastModified: string;
  tablesCount?: number;
}

interface ProjectCardProps {
  project: Project;
  variant: "apps" | "databases";
  isSelected?: boolean;
  onClick?: () => void;
  onShareClick?: () => void;
}

export function ProjectCard({ project, variant, isSelected, onClick, onShareClick }: ProjectCardProps) {
  const isApps = variant === "apps";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-card border-2 cursor-pointer transition-all shrink-0 overflow-hidden",
        isSelected
          ? "border-active bg-cardbg"
          : "border-primary hover:border-active",
        isApps ? "w-[380px] h-[284px]" : "w-[263px] h-[284px]"
      )}
    >
      <div className="flex flex-col h-full py-[23px] gap-[15px]">

        {/* Header: name + dots */}
        <div className="flex items-center justify-between px-[30px] h-[30px] shrink-0">
          <span className="text-card-h text-primary flex-1 truncate">{project.name}</span>
          <DotsMenu onShare={onShareClick} />
        </div>

        {/* Body */}
        <div className="flex items-stretch justify-between px-[30px] flex-1 gap-[15px] overflow-hidden">

          {/* Apps: image placeholder on the left */}
          {isApps && (
            <div
              className="shrink-0 rounded-xl bg-cardbg overflow-hidden"
              style={{ width: 89, height: 188 }}
            >
              {project.imageUrl ? (
                <img
                  src={project.imageUrl}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* phone outline placeholder */
                <div className="w-full h-full flex items-center justify-center">
                  <svg viewBox="0 0 40 70" fill="none" className="w-[40px] h-[60px] opacity-30">
                    <rect x="2" y="2" width="36" height="66" rx="6" stroke="#00205F" strokeWidth="2"/>
                    <circle cx="20" cy="59" r="2" fill="#00205F"/>
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Right column: description (apps) or tablesCount (databases) + stats */}
          <div className="flex flex-col justify-between flex-1 min-w-0">

            {/* Top: description or tables */}
            {isApps && project.description && (
              <p className="text-meta text-primary leading-[120%] line-clamp-4">
                {project.description}
              </p>
            )}
            {!isApps && project.tablesCount !== undefined && (
              <span className="text-meta text-primary">
                Таблиц: {project.tablesCount}
              </span>
            )}

            {/* Bottom: status / owner / date */}
            <div className="flex flex-col gap-[5px]">
              <span className="text-meta text-primary">Статус: {project.status}</span>
              <span className="text-meta text-primary">Владелец: {project.owner}</span>
              <span className="text-meta text-primary leading-[120%]">
                Последнее изменение: {project.lastModified}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Создать проект" card */
export function CreateProjectCard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="w-[150px] h-[284px] rounded-card border-2 border-primary cursor-pointer
                 hover:bg-mainbg transition-colors flex items-center justify-center shrink-0"
    >
      <div className="flex flex-col items-center gap-[5px] text-center">
        <div className="w-[35px] h-[35px] flex items-center justify-center">
          <svg viewBox="0 0 35 35" fill="none" className="w-full h-full">
            <line x1="17.5" y1="4"   x2="17.5" y2="31"  stroke="#00205F" strokeWidth="3" strokeLinecap="round"/>
            <line x1="4"    y1="17.5" x2="31"   y2="17.5" stroke="#00205F" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-card-h text-primary leading-[150%] w-[84px] text-center">
          Создать проект
        </span>
      </div>
    </div>
  );
}
