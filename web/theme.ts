// Light or dark: the device's setting, unless the corner switch has picked one, which this
// browser remembers. The choice is data-theme on <html> (index.html sets it before the first
// paint; style.css redefines the colours for dark).
import { computed, ref } from "vue";

export type Theme = "light" | "dark";
const KEY = "the-moment.theme";

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage unavailable: just follow the device
  }
}

const device = window.matchMedia?.("(prefers-color-scheme: dark)");
const system = ref<Theme>(device?.matches ? "dark" : "light");
device?.addEventListener?.("change", (e) => (system.value = e.matches ? "dark" : "light"));
const chosen = ref<Theme | null>(stored());

/** The theme showing now. */
export const theme = computed<Theme>(() => chosen.value ?? system.value);

/** Switches to the other theme, and remembers it. */
export function toggleTheme() {
  chosen.value = theme.value === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = chosen.value;
  try {
    localStorage.setItem(KEY, chosen.value);
  } catch {
    // storage unavailable: it lasts until the page reloads
  }
}
