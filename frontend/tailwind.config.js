/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:   "#00205F",
        mainbg:    "#F1F6FF",
        cardbg:    "#CBE3FF",
        active:    "#1B9CFF",
        cta:       "#35A7FF",
        selected:  "#CBE3FF",
        mistake:   "#C22A2A",
      },
      borderRadius: {
        card:   "20px",
        badge:  "40px",
        phone:  "60px",
        btn:    "30px",
        nav:    "10px",
        tab:    "36px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        "nav":    ["20px", { lineHeight: "150%", fontWeight: "600" }],
        "title":  ["24px", { lineHeight: "150%", fontWeight: "600" }],
        "logo":   ["48px", { lineHeight: "150%", fontWeight: "500" }],
        "brand":  ["28px", { lineHeight: "150%", fontWeight: "700" }],
        "card-h": ["20px", { lineHeight: "150%", fontWeight: "600" }],
        "meta":   ["16px", { lineHeight: "120%", fontWeight: "500" }],
        "info":   ["18px", { lineHeight: "120%", fontWeight: "500" }],
        "cta-lg": ["24px", { lineHeight: "150%", fontWeight: "500" }],
      },
      width: { sidebar: "280px", preview: "580px", content: "1045px" },
      height: { navbar: "70px", sidebar: "1010px" },
      boxShadow: {
        card: "0 2px 12px rgba(0, 32, 95, 0.08)",
        "card-active": "0 2px 12px rgba(27, 156, 255, 0.20)",
      },
    },
  },
  plugins: [],
};
