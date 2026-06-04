import { Link } from "react-router-dom";

export function SignUpPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      {/* Logo */}
      <span className="text-[96px] font-medium text-primary leading-[150%] select-none">
        OI
      </span>

      {/* Card — no border per design */}
      <div
        className="relative bg-mainbg rounded-card"
        style={{ width: 500, height: 570 }}
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
          style={{ left: "calc(50% - 175px)", top: 110, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Почта
          </label>
          <input
            type="email"
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
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Confirm password */}
        <div
          className="absolute flex flex-col gap-[5px]"
          style={{ left: "calc(50% - 175px)", top: 336, width: 350 }}
        >
          <label className="text-[22px] font-medium text-primary leading-[150%]">
            Повторите пароль
          </label>
          <input
            type="password"
            className="w-full h-[50px] bg-cardbg rounded-[10px] border-none outline-none px-4
                       text-base text-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Sign-in link */}
        <Link
          to="/signin"
          className="absolute text-[12px] font-medium text-primary/75 hover:text-primary transition-colors"
          style={{ left: "calc(50% - 55.5px + 119.5px)", top: 426 }}
        >
          Уже есть аккаунт?
        </Link>

        {/* Submit — filled blue, pill shape, white text */}
        <button
          className="absolute flex items-center justify-center
                     bg-cta rounded-btn text-[24px] font-medium text-white
                     hover:bg-active transition-colors cursor-pointer"
          style={{ left: "calc(50% - 175px + 4px)", bottom: 39, width: 350, height: 50 }}
        >
          Зарегистрироваться
        </button>
      </div>
    </div>
  );
}
