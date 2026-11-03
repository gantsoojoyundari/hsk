import { update, getState } from "./store.js";

export function applyTheme(theme = getState().settings.theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(theme) {
  update((s) => {
    s.settings.theme = theme;
  });
  applyTheme(theme);
}

if (typeof window !== "undefined") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme());
}
