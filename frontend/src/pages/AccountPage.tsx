import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/shared/auth/store";
import { changePassword } from "@/shared/api/auth";

export function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwError, setPwError] = useState("");

  async function handleChangePassword() {
    if (pwNew !== pwConfirm) { setPwError("Новые пароли не совпадают"); return; }
    if (pwNew.length < 10) { setPwError("Минимум 10 символов"); return; }
    setPwStatus("loading"); setPwError("");
    try {
      await changePassword(pwCurrent, pwNew);
      setPwStatus("success");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setTimeout(() => { setPwStatus("idle"); setShowChangePassword(false); }, 2000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Ошибка смены пароля";
      setPwError(typeof msg === "string" ? msg : "Ошибка смены пароля");
      setPwStatus("error");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="relative w-[1920px] h-[1080px] bg-white overflow-hidden flex flex-col">
      {/* ── Top navbar (same pattern as ProfilePage) ── */}
      <header className="h-[56px] shrink-0 flex items-center px-6 gap-6 bg-white border-b border-cardbg">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold text-primary">OI</span>
          <span className="text-[18px] text-primary font-medium">Дикая Сибирь</span>
        </div>
        <div className="ml-auto flex items-center gap-6 text-[14px] text-primary">
          <span className="text-primary/60">{user?.email ?? "exampleemail@gmail.com"}</span>
          <button onClick={() => navigate("/")} className="hover:underline">Мои приложения</button>
          <button onClick={() => navigate("/account")} className="flex items-center gap-1 font-medium text-cta">
            Аккаунт
            <Chevron />
          </button>
          <button onClick={() => navigate("/templates")} className="hover:underline">Шаблоны</button>
          <button onClick={() => navigate("/learning")} className="flex items-center gap-1 hover:underline">
            Помощь
            <Chevron />
          </button>
          <button disabled title="В разработке" className="flex items-center gap-1 text-primary/40 cursor-not-allowed">
            Больше
            <Chevron />
          </button>
        </div>
      </header>

      {/* ── Account header ── */}
      <div className="px-[120px] pt-8 pb-5 bg-white border-b border-cardbg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-primary mb-1">Аккаунт</h1>
            <p className="text-[14px] text-primary/60">
              {user?.email ?? "exampleemail@gmail.com"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[14px] text-mistake hover:underline"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Выйти
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-[120px] pt-8">
        <div className="max-w-[800px] flex flex-col gap-10">

          {/* ── Section 1: Политика ── */}
          <Section title="Политика">
            <div className="flex flex-col gap-3">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[15px] text-cta hover:underline"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0">
                  <path d="M10 2h4v4M14 2L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Политика конфиденциальности
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[15px] text-cta hover:underline"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0">
                  <path d="M10 2h4v4M14 2L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Условия использования
              </a>
            </div>
          </Section>

          {/* ── Section 2: Мой аккаунт ── */}
          <Section title="Мой аккаунт">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between py-3 border-b border-cardbg">
                <span className="text-[14px] text-primary/60">Email</span>
                <span className="text-[15px] text-primary font-medium">{user?.email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-cardbg">
                <span className="text-[14px] text-primary/60">Тарифный план</span>
                <span className={cn(
                  "text-[13px] font-medium px-3 py-1 rounded-[20px]",
                  "bg-[#EBF4FF] text-cta"
                )}>
                  Бесплатный
                </span>
              </div>
              <div className="flex flex-col gap-4 pt-1">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setShowChangePassword((v) => !v); setPwError(""); setPwStatus("idle"); }}
                    className="px-5 py-[3px] h-[34px] border-2 border-cta rounded-btn text-cta text-[14px] font-medium hover:bg-cta/10 transition-colors"
                  >
                    Изменить пароль
                  </button>
                  <button
                    disabled
                    title="В разработке"
                    className="px-5 py-[3px] h-[34px] border-2 border-mistake/40 rounded-btn text-mistake/40 text-[14px] font-medium cursor-not-allowed"
                  >
                    Удалить аккаунт
                  </button>
                </div>

                {showChangePassword && (
                  <div className="flex flex-col gap-3 p-5 bg-mainbg rounded-[10px] max-w-[420px]">
                    <h3 className="text-[15px] font-semibold text-primary">Смена пароля</h3>
                    {(["Текущий пароль", "Новый пароль", "Повторите новый"] as const).map((label, i) => {
                      const vals = [pwCurrent, pwNew, pwConfirm];
                      const setters = [setPwCurrent, setPwNew, setPwConfirm];
                      return (
                        <div key={label} className="flex flex-col gap-1">
                          <span className="text-[13px] text-primary/60">{label}</span>
                          <input
                            type="password"
                            value={vals[i]}
                            onChange={(e) => setters[i](e.target.value)}
                            className="h-[38px] px-3 rounded-[8px] border border-cardbg bg-white text-[14px] text-primary outline-none focus:border-cta"
                            disabled={pwStatus === "loading"}
                          />
                        </div>
                      );
                    })}
                    {pwError && <p className="text-[13px] text-mistake">{pwError}</p>}
                    {pwStatus === "success" && <p className="text-[13px] text-green-600">Пароль успешно изменён ✓</p>}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleChangePassword}
                        disabled={pwStatus === "loading" || !pwCurrent || !pwNew || !pwConfirm}
                        className="px-5 h-[34px] rounded-btn bg-cta text-white text-[14px] font-medium disabled:opacity-50 hover:bg-active transition-colors"
                      >
                        {pwStatus === "loading" ? "Сохранение…" : "Сохранить"}
                      </button>
                      <button
                        onClick={() => { setShowChangePassword(false); setPwError(""); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
                        className="px-5 h-[34px] rounded-btn border border-cardbg text-[14px] text-primary hover:bg-cardbg transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ── Section 3: Моя команда ── */}
          <Section title="Моя команда">
            <div className="flex items-center gap-3 px-5 py-4 bg-mainbg rounded-[10px]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-cta/60">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-[14px] text-primary/60">
                Функция доступна на корпоративном плане
              </p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[18px] font-bold text-primary border-b border-cardbg pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
      <path d="M2 4l4 4 4-4H2z" />
    </svg>
  );
}
