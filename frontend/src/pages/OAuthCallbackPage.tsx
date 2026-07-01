import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { yandexCallback, vkCallback } from "@/shared/api/auth";
import { setTokens } from "@/shared/auth/tokens";
import { useAuthStore } from "@/shared/auth/store";

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      navigate("/signin?error=oauth_denied", { replace: true });
      return;
    }

    const isVk = location.pathname.includes("/vk/");
    const exchange = isVk ? vkCallback(code) : yandexCallback(code);

    exchange
      .then(async (tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token);
        await bootstrap();
        navigate("/", { replace: true });
      })
      .catch(() => {
        navigate("/signin?error=oauth_failed", { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <span className="text-[96px] font-medium text-primary leading-[150%] select-none">OI</span>
      <p className="text-[18px] text-primary/60">Выполняем вход…</p>
      <svg className="animate-spin w-8 h-8 text-cta" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
      </svg>
    </div>
  );
}
