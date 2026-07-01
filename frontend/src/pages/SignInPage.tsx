import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuthStore } from "@/shared/auth/store";
import { ldapLogin as apiLdapLogin, type TokenPair } from "@/shared/api/auth";
import { setTokens } from "@/shared/auth/tokens";

function extractError(err: unknown, isLdap = false): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.response?.status === 401) return isLdap ? "Неверные корпоративные данные" : "Неверная почта или пароль";
    if (err.response?.status === 403) return "Доступ заблокирован";
    if (!err.response) return "Сервер недоступен";
  }
  return "Не удалось войти. Попробуйте ещё раз";
}

type LoginMode = "standard" | "ldap";

export function SignInPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [mode, setMode] = useState<LoginMode>("standard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(m: LoginMode) {
    setMode(m);
    setError(null);
    setTotpRequired(false);
    setTotpCode("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "ldap") {
        const tokens: TokenPair = await apiLdapLogin({ email, password });
        setTokens(tokens.access_token, tokens.refresh_token);
        await bootstrap();
      } else {
        await login({
          email,
          password,
          totp_code: totpRequired && totpCode ? totpCode : undefined,
        });
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msg = extractError(err, mode === "ldap");
      if (mode === "standard" && msg.toLowerCase().includes("totp")) {
        setTotpRequired(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const showTotp = mode === "standard" && totpRequired;
  const cardHeight = showTotp ? 580 : 500;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      {/* Logo */}
      <span className="text-[96px] font-medium text-primary leading-[150%] select-none">
        OI
      </span>

      {/* Card — with border per design */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-mainbg rounded-card border-2 border-primary"
        style={{ width: 500, height: cardHeight }}
      >
        {/* Title */}
        <h1
          className="absolute text-[32px] font-bold text-primary leading-[150%] flex items-center"
          style={{ left: "calc(50% - 40px)", top: 25 }}
        >
          Вход
        </h1>

        {/* Mode tabs */}
        <div
          className="absolute flex rounded-[10px] overflow-hidden border border-primary/20"
          style={{ left: "calc(50% - 175px)", top: 80, width: 350, height: 36 }}
        >
          <button
            type="button"
            onClick={() => switchMode("standard")}
            className={`flex-1 text-[13px] font-medium transition-colors ${
              mode === "standard"
                ? "bg-primary text-white"
                : "bg-cardbg text-primary hover:bg-primary/10"
            }`}
          >
            Пароль
          </button>
          <button
            type="button"
            onClick={() => switchMode("ldap")}
            className={`flex-1 text-[13px] font-medium transition-colors ${
              mode === "ldap"
                ? "bg-primary text-white"
                : "bg-cardbg text-primary hover:bg-primary/10"
            }`}
          >
            Корпоративный (LDAP)
          </button>
        </div>

        {/* Email */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 133, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            {mode === "ldap" ? "Логин / Почта" : "Почта"}
          </label>
          <input
            type={mode === "ldap" ? "text" : "email"}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Password */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 246, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Пароль
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* TOTP (standard mode only, revealed when the backend requires it) */}
        {showTotp && (
          <div
            className="absolute flex flex-col gap-[5px]"
            style={{ left: "calc(50% - 175px)", top: 320, width: 350 }}
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="Код 2FA из приложения"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="w-full h-[44px] bg-cardbg rounded-[10px] border-none outline-none px-4
                         text-base text-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* LDAP hint */}
        {mode === "ldap" && (
          <p
            className="absolute text-[12px] text-primary/50 text-center w-[350px]"
            style={{ left: "calc(50% - 175px)", top: 320 }}
          >
            Используйте учётные данные корпоративного LDAP / Active Directory
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            className="absolute text-[14px] text-mistake text-center w-[350px]"
            style={{ left: "calc(50% - 175px)", top: showTotp ? 378 : 348 }}
          >
            {error}
          </p>
        )}

        {/* Forgot password link (standard only) */}
        {mode === "standard" && (
          <Link
            to="/forgot-password"
            className="absolute text-[12px] font-medium text-primary/75 hover:text-primary transition-colors"
            style={{ left: "calc(50% - 175px)", top: showTotp ? 418 : 378 }}
          >
            Забыли пароль?
          </Link>
        )}

        {/* Sign-up link (standard only) */}
        {mode === "standard" && (
          <Link
            to="/signup"
            className="absolute text-[12px] font-medium text-primary/75 hover:text-primary transition-colors"
            style={{ left: "calc(50% - 56px + 75px)", top: showTotp ? 418 : 378 }}
          >
            Ещё нет аккаунта?
          </Link>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="absolute flex items-center justify-center
                     bg-cta rounded-btn text-[24px] font-medium text-white
                     hover:bg-active transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
          style={{ left: "calc(50% - 175px + 4px)", bottom: 39, width: 350, height: 50 }}
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
