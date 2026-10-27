// Test helpers: a fake backend (every API call is a POST of JSON, so a stubbed fetch is enough)
// and mounting a page at an address on its own in-memory router.
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { isAdmin, isOwner, me } from "../api.ts";
import App from "../App.vue";
import { routes } from "../router.ts";
import { backend } from "./setup.ts";

type Handler = (input: any) => unknown;

/** Answers API calls from `handlers` by path (without /api); unknown paths answer NOT_FOUND. */
export function fakeApi(handlers: Record<string, Handler>) {
  const calls: Array<{ path: string; input: any }> = [];
  backend.fetch = (async (url: string, init: RequestInit) => {
    const path = new URL(url, location.href).pathname.replace(/^\/api/, "");
    const input = JSON.parse(String(init.body ?? "{}"));
    calls.push({ path, input });
    const handler = handlers[path];
    const output = (handler ? await handler(input) : { error: "NOT_FOUND" }) as object;
    return Response.json(output, { status: "error" in output ? 400 : 200 });
  }) as typeof fetch;
  return { calls, called: (path: string) => calls.filter((c) => c.path === path).map((c) => c.input) };
}

/** Who the page thinks is signed in, as refreshMe() would have set it. */
export function signedInAs(username: string | null, admin = false) {
  me.value = username;
  isAdmin.value = admin;
  isOwner.value = false;
}

/** Mounts the app's page for `path`, waits for it to load, and gives the wrapper and router. */
export async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { wrapper, router };
}

/** Like mountAt, but the whole app: top bar, and the mini map and neighbours of a room's page. */
export async function mountAppAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { wrapper, router };
}

const HOUR = 60 * 60 * 1000;

/** A /groups/list row for an open gallery (1-hour seasons) or, with run null, a closed one. */
export function groupRow(group: string, name: string, extra: Partial<Record<string, unknown>> = {}) {
  const start = new Date(Date.now() - HOUR / 2).toISOString();
  return { group, name, cycle: "c1", start, period: HOUR, runs: 3, run: 0, runStart: start, runEnd: new Date(Date.now() + HOUR / 2).toISOString(), ...extra };
}
