import { createApp } from "vue";
import App from "./App.vue";
import { refreshMe } from "./api.ts";
import { router } from "./router.ts";
import "./style.css";

const app = createApp(App).use(router);
// Wait until the first route is resolved (including the entrance skip) and we know who is
// signed in, so the first screen is already the right one instead of flickering into it.
await Promise.all([router.isReady(), refreshMe()]);
app.mount("#app");
