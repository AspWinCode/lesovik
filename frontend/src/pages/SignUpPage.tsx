import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

/**
 * Self-service registration is intentionally NOT available on this platform —
 * accounts are provisioned by an administrator (invite flow in /admin). The
 * backend exposes no public `/auth/register` endpoint, so this page validates
 * input and then explains the invite-only policy instead of faking a signup.
 */
export function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Введите корректный e-mail";
    if (password.length < 8) return "Пароль должен быть не короче 8 символов";
    if (password !== confirm) return "Пароли не совпадают";
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(false);
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    // No public registration endpoint — surface the real policy honestly.
    setNotice(true);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      {/* Logo */}
      <span className="text-[96px] font-medium text-primary leading-[150%] select-none">
        OI
      </span>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-mainbg rounded-card"
        style={{ width: 500, height: 600 }}
      >
        {/* Title */}
        <h1
          className="absolute text-[32px] font-bold text-primary leading-[150%] flex items-center"
          style={{ left: "calc(50% - 104.5px)", top: 25 }}
        >
          Регистрация
        </h1>

        {/* Email */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 100, width: 350 }}
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
          style={{ left: "calc(50% - 175px)", top: 210, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Пароль
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Confirm password */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 320, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Повторите пароль
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Error / notice */}
        {error && (
          <p
            className="absolute text-[14px] text-mistake w-[350px]"
            style={{ left: "calc(50% - 175px)", top: 418 }}
          >
            {error}
          </p>
        )}
        {notice && !error && (
          <p
            className="absolute text-[13px] text-primary/80 w-[350px] leading-snug"
            style={{ left: "calc(50% - 175px)", top: 410 }}
          >
            Самостоятельная регистрация недоступна. Учётные записи создаёт
            администратор — обратитесь к нему для получения приглашения.
          </p>
        )}

        {/* Sign-in link */}
        <Link
          to="/signin"
          className="absolute text-[12px] font-medium text-primary/75 hover:text-primary transition-colors"
          style={{ left: "calc(50% - 55.5px + 119.5px)", top: 470 }}
        >
          Уже есть аккаунт?
        </Link>

        {/* Submit */}
        <button
          type="submit"
          className="absolute flex items-center justify-center
                     bg-cta rounded-btn text-[24px] font-medium text-white
                     hover:bg-active transition-colors cursor-pointer"
          style={{ left: "calc(50% - 175px + 4px)", bottom: 39, width: 350, height: 50 }}
        >
          Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
