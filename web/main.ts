import { createApp } from "vue";
import App from "./App.vue";
import { refreshMe } from "./api.ts";
import { router } from "./router.ts";
import "./style.css";

// Trying fonts in development: ?font=Some+Font&title=Other+Font loads them from Google Fonts
// and uses them for this tab (kept as you click around; ?font=&title= goes back to the defaults).
if (import.meta.env.DEV) {
  const asked = new URLSearchParams(location.search);
  for (const [param, variable] of [["font", "--font"], ["title", "--title-font"]] as const) {
    if (asked.has(param)) sessionStorage.setItem(param, asked.get(param)!);
    const family = sessionStorage.getItem(param);
    if (!family) continue;
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet" });
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
    document.head.append(link);
    document.documentElement.style.setProperty(variable, `"${family}"`);
  }
}

const app = createApp(App).use(router);
// Wait until the first route is resolved (including the entrance skip) and we know who is
// signed in, so the first screen is already the right one instead of flickering into it.
await Promise.all([router.isReady(), refreshMe()]);
app.mount("#app");
