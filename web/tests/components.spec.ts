import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { me } from "../api.ts";
import AuthForm from "../components/AuthForm.vue";
import ErrorNote from "../components/ErrorNote.vue";
import { SESSION_ENDED } from "../errors.ts";
import { routes } from "../router.ts";
import { fakeApi, mountAt, signedInAs } from "./fake.ts";

const newRouter = () => createRouter({ history: createMemoryHistory(), routes });

beforeEach(() => {
  signedInAs(null);
  localStorage.clear();
});

describe("AuthForm", () => {
  async function submit(api: Record<string, (input: any) => unknown>, button: "log in" | "register", username = "Gigi") {
    const router = newRouter();
    const calls = fakeApi(api);
    const wrapper = mount(AuthForm, { global: { plugins: [router] } });
    await wrapper.find('input[autocomplete="username"]').setValue(username);
    await wrapper.find('input[type="password"]').setValue("password123");
    if (button === "log in") await wrapper.find("form").trigger("submit");
    else await wrapper.findAll("button").find((b) => b.text() === "register")!.trigger("click");
    await flushPromises();
    return { wrapper, router, calls };
  }

  test("logging in sends what was typed, learns who you are, and goes home", async () => {
    const { router, calls } = await submit(
      {
        "/auth/sign-in": () => ({ username: "Gigi" }),
        "/auth/current": () => ({ username: "Gigi" }),
        "/admin/admins/list": () => ({ error: "FORBIDDEN" }),
      },
      "log in",
    );
    expect(calls.called("/auth/sign-in")).toEqual([{ username: "Gigi", password: "password123" }]);
    expect(me.value).toBe("Gigi");
    expect(router.currentRoute.value.path).toBe("/home");
  });

  test.each([
    ["log in", "Gigi", "/auth/sign-in", "UNAUTHORIZED", "wrong username or password."],
    ["register", "Gigi", "/auth/register", "CONFLICT", "that username is taken."],
    ["register", "Gi", "/auth/register", "INVALID_REQUEST", "usernames need 3 to 32 characters."],
    ["register", "Gigi", "/auth/register", "INVALID_REQUEST", "passwords need 8 to 128 characters."],
  ] as const)("%s as %s refused with %s shows a message and stays put", async (button, username, path, error, message) => {
    const { wrapper, router } = await submit({ [path]: () => ({ error }) }, button, username);
    expect(wrapper.find('[role="alert"]').text()).toBe(message);
    expect(router.currentRoute.value.path).toBe("/");
    expect(me.value).toBe(null);
  });
});

describe("ErrorNote", () => {
  const note = (props: { problem: string | { at: string; message: string } | null; at?: string }) => mount(ErrorNote, { props, global: { plugins: [newRouter()] } });

  test("shows a message, or a problem only at its own spot", () => {
    expect(note({ problem: "nope" }).text()).toBe("nope");
    expect(note({ problem: { at: "p1", message: "nope" }, at: "p1" }).text()).toBe("nope");
    expect(note({ problem: { at: "p1", message: "nope" }, at: "p2" }).find('[role="alert"]').exists()).toBe(false);
    expect(note({ problem: null }).find('[role="alert"]').exists()).toBe(false);
  });

  test("an ended session links to log in", () => {
    expect(note({ problem: SESSION_ENDED }).find('a[href="/auth"]').text()).toBe("log in");
  });
});

describe("routes", () => {
  test("the site's address always opens at the entrance, even after entering before", async () => {
    const first = newRouter();
    await first.push("/");
    await first.push("/map");
    const later = newRouter();
    await later.push("/");
    expect(later.currentRoute.value.path).toBe("/");
  });

  test.each([
    ["/groups/g1#post-p1", "/galleries/g1#post-p1"],
    ["/groups/g1/post", "/galleries/g1/post"],
    ["/login", "/auth"],
    ["/me", "/home"],
    ["/admin", "/home/admin"],
  ])("old address %s goes to %s", async (from, to) => {
    const router = newRouter();
    await router.push(from);
    expect(router.currentRoute.value.fullPath).toBe(to);
  });
});

describe("entrance", () => {
  /** Pretends the screen is wide (the doorway shows) or narrow (the enter button instead). */
  const screen = (wide: boolean) =>
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: !wide, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
    );
  afterEach(() => vi.restoreAllMocks());

  test("on a wide screen, clicking the page does nothing; the doorway goes home", async () => {
    screen(true);
    const { wrapper, router } = await mountAt("/");
    expect(wrapper.find(".enter").exists()).toBe(false);
    await wrapper.find(".entrance").trigger("click");
    await wrapper.find(".entrance-columns p").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    const doorway = wrapper.find('a.doorway-link[aria-label="enter the museum"]');
    expect(doorway.attributes("href")).toBe("/home");
    await doorway.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/home");
  });

  test("on a narrow screen, there's no doorway; the enter button goes home", async () => {
    screen(false);
    const { wrapper, router } = await mountAt("/");
    expect(wrapper.find(".doorway").exists()).toBe(false);
    await wrapper.find(".enter button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/home");
  });

  test("pointing at either half of the figure and blurbs lights up that side, and its blurb", async () => {
    const { wrapper } = await mountAt("/");
    const page = wrapper.find(".entrance-columns"); // happy-dom has no layout, so its box is 0 wide at x 0
    await wrapper.find(".entrance").trigger("pointermove", { clientX: 10, pointerType: "mouse" });
    expect(wrapper.find(".entrance-columns p").classes("active")).toBe(false); // the rest of the page does nothing
    const [visitor, artist] = [wrapper.findAll(".entrance-columns p")[0]!, wrapper.findAll(".entrance-columns p")[1]!];
    const shown = () => wrapper.findAll(".entrance-figure img").map((img) => img.classes().includes("shown"));
    expect([visitor.classes("active"), artist.classes("active")]).toEqual([false, false]);
    expect([visitor.classes("dim"), artist.classes("dim")]).toEqual([false, true]); // the visitor drawing shows first
    await page.trigger("pointermove", { clientX: -10, pointerType: "mouse" });
    expect([visitor.classes("active"), artist.classes("active"), shown()]).toEqual([true, false, [true, false]]);
    await page.trigger("pointermove", { clientX: 10, pointerType: "mouse" });
    expect([visitor.classes("active"), artist.classes("active"), shown()]).toEqual([false, true, [false, true]]);
    expect([visitor.classes("dim"), artist.classes("dim")]).toEqual([true, false]);
    await page.trigger("pointerleave"); // the artist side holds, without the accent
    expect([visitor.classes("dim"), artist.classes("dim"), artist.classes("active"), shown()]).toEqual([true, false, false, [false, true]]);
  });
});

