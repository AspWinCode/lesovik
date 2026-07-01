import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click",
] as const;

interface Options {
  timeoutMs: number;
  warnBeforeMs?: number;
  onWarn?: () => void;
  onExpire: () => void;
  enabled?: boolean;
}

export function useIdleTimer({
  timeoutMs,
  warnBeforeMs = 2 * 60 * 1000,
  onWarn,
  onExpire,
  enabled = true,
}: Options) {
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warned = useRef(false);

  const reset = useCallback(() => {
    if (!enabled) return;

    if (expireTimer.current) clearTimeout(expireTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warned.current = false;

    const warnAt = timeoutMs - warnBeforeMs;
    if (warnAt > 0 && onWarn) {
      warnTimer.current = setTimeout(() => {
        warned.current = true;
        onWarn();
      }, warnAt);
    }

    expireTimer.current = setTimeout(() => {
      onExpire();
    }, timeoutMs);
  }, [enabled, timeoutMs, warnBeforeMs, onWarn, onExpire]);

  useEffect(() => {
    if (!enabled) return;

    reset();

    const handler = () => {
      if (warned.current) {
        warned.current = false;
      }
      reset();
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handler, { passive: true });
    }

    return () => {
      if (expireTimer.current) clearTimeout(expireTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handler);
      }
    };
  }, [enabled, reset]);

  return { reset };
}
