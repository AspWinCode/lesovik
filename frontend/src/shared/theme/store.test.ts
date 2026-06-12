import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useThemeStore, applyTheme } from "./store";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("theme-dark");
  useThemeStore.setState({ theme: "light" });
});

afterEach(() => {
  document.documentElement.classList.remove("theme-dark");
});

describe("theme store", () => {
  it("toggles between light and dark", () => {
    expect(useThemeStore.getState().theme).toBe("light");
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("dark");
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("persists the selection to localStorage", () => {
    useThemeStore.getState().set("dark");
    expect(localStorage.getItem("oi-theme")).toBe("dark");
  });

  it("reflects dark mode onto <html> via the theme-dark class", () => {
    useThemeStore.getState().set("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    useThemeStore.getState().set("light");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
  });

  it("applyTheme is a no-op-safe direct DOM helper", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
  });
});
