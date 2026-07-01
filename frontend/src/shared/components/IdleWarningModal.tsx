import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/shared/auth/store";
import { useIdleTimer } from "@/shared/hooks/useIdleTimer";
import { saveFormDraft } from "@/shared/hooks/useFormDraft";
import { useSessionPolicy } from "@/shared/hooks/useSessions";
import { apiClient } from "@/shared/api/client";

const WARN_BEFORE_MS = 2 * 60 * 1000; // warn 2 min before timeout

export function IdleWarningModal() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const { data: policy } = useSessionPolicy();
  const timeoutMs = (policy?.timeout_minutes ?? 30) * 60 * 1000;

  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const countdownRef = { current: null as ReturnType<typeof setInterval> | null };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleExpire = useCallback(() => {
    stopCountdown();
    // Save any open form drafts (callers write to sessionStorage before this fires)
    saveFormDraft("__idle_page__", { url: window.location.href, ts: Date.now() });
    void logout();
  }, [logout]);

  const handleWarn = useCallback(() => {
    setVisible(true);
    setSecondsLeft(Math.round(WARN_BEFORE_MS / 1000));
    stopCountdown();
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopCountdown();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const { reset } = useIdleTimer({
    timeoutMs,
    warnBeforeMs: WARN_BEFORE_MS,
    onWarn: handleWarn,
    onExpire: handleExpire,
    enabled: isAuthenticated && timeoutMs > 0,
  });

  const handleContinue = useCallback(async () => {
    setVisible(false);
    stopCountdown();
    // Proactively refresh access token so backend sees activity
    try {
      const { getRefreshToken } = await import("@/shared/auth/tokens");
      const raw = getRefreshToken();
      if (raw) {
        const { data } = await apiClient.post("/auth/refresh", { refresh_token: raw });
        const { setTokens } = await import("@/shared/auth/tokens");
        setTokens(data.access_token, data.refresh_token);
      }
    } catch {
      // refresh failed — next API call will 401 and trigger logout
    }
    reset();
  }, [reset]);

  // Dismiss modal and reset timer when user becomes active again on their own
  useEffect(() => {
    if (!visible) return;
    const handler = () => {
      setVisible(false);
      stopCountdown();
    };
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("mousedown", handler, { once: true });
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("mousedown", handler);
    };
  }, [visible]);

  if (!visible || !isAuthenticated) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`;
  const progress = secondsLeft / (WARN_BEFORE_MS / 1000);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,32,95,0.35)" }}
    >
      <div
        className="bg-white flex flex-col items-center gap-5 px-10 py-8"
        style={{ borderRadius: 20, width: 420, boxShadow: "0 8px 40px rgba(0,32,95,0.18)" }}
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-[#FFF3CD] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#F59E0B]" fill="none">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="text-center">
          <h3 className="text-[20px] font-bold text-primary mb-1">Сессия истекает</h3>
          <p className="text-[14px] text-primary/60">
            Из-за бездействия сессия завершится через
          </p>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-[42px] font-bold text-cta tabular-nums">{countdown}</span>
          <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cta transition-all duration-1000 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <p className="text-[13px] text-primary/50 text-center">
          Незавершённые данные будут сохранены и восстановлены после повторного входа.
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => void handleContinue()}
            className="flex-1 h-[44px] bg-cta text-white text-[15px] font-medium rounded-btn hover:bg-active transition-colors"
          >
            Продолжить работу
          </button>
          <button
            onClick={() => void logout()}
            className="flex-1 h-[44px] border border-primary/20 text-primary text-[15px] font-medium rounded-btn hover:bg-mainbg transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
