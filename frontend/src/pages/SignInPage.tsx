import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuthStore } from "@/shared/auth/store";

function extractError(err: unknown): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.response?.status === 401) return "Неверная почта или пароль";
    if (!err.response) return "Сервер недоступен";
  }
  return "Не удалось войти. Попробуйте ещё раз";
}

export function SignInPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({
        email,
        password,
        totp_code: totpRequired && totpCode ? totpCode : undefined,
      });
      navigate("/", { replace: true });
    } catch (err) {
      const msg = extractError(err);
      if (msg.toLowerCase().includes("totp")) {
        setTotpRequired(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
        style={{ width: 500, height: 457 }}
      >
        {/* Title */}
        <h1
          className="absolute text-[32px] font-bold text-primary leading-[150%] flex items-center"
          style={{ left: "calc(50% - 40px)", top: 25 }}
        >
          Вход
        </h1>

        {/* Email */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 110, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Почта
          </label>
          <input
            type="email"
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
          style={{ left: "calc(50% - 175px)", top: 223, width: 350 }}
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

        {/* TOTP (revealed only when the backend requires it) */}
        {totpRequired && (
          <div
            className="absolute flex flex-col gap-[5px]"
            style={{ left: "calc(50% - 175px)", top: 300, width: 350 }}
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

        {/* Error message */}
        {error && (
          <p
            className="absolute text-[14px] text-mistake text-center w-[350px]"
            style={{ left: "calc(50% - 175px)", top: 283 }}
          >
            {error}
          </p>
        )}

        {/* Sign-up link */}
        <Link
          to="/signup"
          className="absolute text-[12px] font-medium text-primary/75 hover:text-primary transition-colors"
          style={{ left: "calc(50% - 56px + 119px)", top: 313 }}
        >
          Ещё нет аккаунта?
        </Link>

        {/* Submit — filled blue, pill shape, white text */}
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
