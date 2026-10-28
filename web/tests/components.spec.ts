import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { ENTERED_KEY, me } from "../api.ts";
import AuthForm from "../components/AuthForm.vue";
import ErrorNote from "../components/ErrorNote.vue";
import { SESSION_ENDED } from "../errors.ts";
import RoomList from "../components/RoomList.vue";
import type { Room } from "../museum.ts";
import { routes } from "../router.ts";
import { fakeApi, mountAt, signedInAs } from "./fake.ts";

const newRouter = () => createRouter({ history: createMemoryHistory(), routes });

beforeEach(() => {
  signedInAs(null);
  localStorage.clear();
});

describe("RoomList", () => {
  const all: Room[] = [
    { id: "home", kind: "home", label: "home", to: "/home" },
    { id: "g1", kind: "gallery", label: "doodles", to: "/galleries/g1" },
    { id: "w1", kind: "wing", label: "still life", to: "/galleries/w1" },
  ];
  const list = (props: object) => mount(RoomList, { props: { rooms: all, ...props }, global: { plugins: [newRouter()] } });

  test("each room links to where it goes, labelled with its kind", () => {
    const rooms = list({}).findAll("li");
    expect(rooms.map((r) => r.find("a").attributes("href"))).toEqual(["/home", "/galleries/g1", "/galleries/w1"]);
    expect(rooms.map((r) => r.text())).toEqual(["home", "doodles gallery", "still life wing"]);
  });

  test("clicking a room enters it", async () => {
    const router = newRouter();
    fakeApi({ "/posts/mine": () => ({ error: "UNAUTHORIZED" }) });
    const wrapper = mount(RoomList, { props: { rooms: all }, global: { plugins: [router] } });
    await wrapper.findAll("a")[1]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/galleries/g1");
  });
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
  test("the first visit opens at the entrance; after entering once, visits skip to the map", async () => {
    const first = newRouter();
    await first.push("/");
    expect(first.currentRoute.value.path).toBe("/");
    localStorage.setItem(ENTERED_KEY, "yes");
    const later = newRouter();
    await later.push("/");
    expect(later.currentRoute.value.path).toBe("/map");
  });

  test("the entrance stays reachable by link after entering", async () => {
    localStorage.setItem(ENTERED_KEY, "yes");
    const router = newRouter();
    await router.push("/archive");
    await router.push("/");
    expect(router.currentRoute.value.path).toBe("/");
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
  test("the half of the page the pointer is on lights up that side of the figure, and its column", async () => {
    const { wrapper } = await mountAt("/");
    const page = wrapper.find(".entrance");
    const [visitor, artist] = [wrapper.findAll(".entrance-columns p")[0]!, wrapper.findAll(".entrance-columns p")[1]!];
    const shown = () => wrapper.findAll(".entrance-figure img").map((img) => img.classes().includes("shown"));
    expect([visitor.classes("active"), artist.classes("active")]).toEqual([false, false]);
    await page.trigger("pointermove", { clientX: 10, pointerType: "mouse" });
    expect([visitor.classes("active"), artist.classes("active"), shown()]).toEqual([true, false, [true, false]]);
    await page.trigger("pointermove", { clientX: window.innerWidth - 10, pointerType: "mouse" });
    expect([visitor.classes("active"), artist.classes("active"), shown()]).toEqual([false, true, [false, true]]);
    await page.trigger("pointerleave");
    expect(artist.classes("active")).toBe(false);
  });
});

