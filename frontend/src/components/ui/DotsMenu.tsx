import { useState, useRef, useEffect } from "react";

/** Three-dot context menu trigger with dropdown */
export function DotsMenu({
  className,
  onShare,
  onRename,
  onDelete,
}: {
  className?: string;
  onShare?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative shrink-0 ${className ?? ""}`}>
      <button
        className="flex flex-col justify-center items-center gap-[2.67px] w-5 h-5"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Меню"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1 h-1 rounded-full bg-primary" />
        ))}
      </button>

      {open && (
        <div
          className="absolute right-0 top-6 z-40 bg-mainbg rounded-[10px]
                     shadow-[0_4px_12px_rgba(0,32,95,0.15)] overflow-hidden min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setOpen(false); onShare?.(); }}
            className="w-full text-left px-4 py-2 text-meta text-primary hover:bg-cardbg transition-colors"
          >
            Поделиться
          </button>
          <button
            onClick={() => { setOpen(false); onRename?.(); }}
            className="w-full text-left px-4 py-2 text-meta text-primary hover:bg-cardbg transition-colors"
          >
            Переименовать
          </button>
          <button
            onClick={() => { setOpen(false); onDelete?.(); }}
            className="w-full text-left px-4 py-2 text-meta text-[#C22A2A] hover:bg-cardbg transition-colors"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
