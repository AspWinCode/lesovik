import { useEffect, useState, type ReactNode } from "react";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

function useViewportScale() {
  const getScale = () =>
    Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);

  const [scale, setScale] = useState(getScale);

  useEffect(() => {
    const onResize = () => setScale(getScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return scale;
}

/**
 * Масштабирует canvas 1920×1080 под размер окна браузера.
 * Пропорции сохраняются, canvas центрируется.
 */
export function ScaleToFit({ children }: { children: ReactNode }) {
  const scale = useViewportScale();

  const scaledW = DESIGN_W * scale;
  const scaledH = DESIGN_H * scale;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      {/* Центрирующий контейнер */}
      <div
        style={{
          width: scaledW,
          height: scaledH,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Сам canvas */}
        <div
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
