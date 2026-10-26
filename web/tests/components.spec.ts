import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { ENTERED_KEY, me } from "../api.ts";
import AuthForm from "../components/AuthForm.vue";
import RoomList from "../components/RoomList.vue";
import type { Room } from "../museum.ts";
import { routes } from "../router.ts";
import { fakeApi, signedInAs } from "./fake.ts";

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

  test("marks the room you are in; compact leaves out kinds", () => {
    const rooms = list({ current: "g1", compact: true }).findAll("li");
    expect(rooms[1]!.classes()).toContain("here");
    expect(rooms.map((r) => r.text().replace(/\s+/g, " "))).toEqual(["home", "doodles (you are here)", "still life"]);
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
  async function submit(api: Record<string, (input: any) => unknown>, button: "log in" | "register") {
    const router = newRouter();
    const calls = fakeApi(api);
    const wrapper = mount(AuthForm, { global: { plugins: [router] } });
    await wrapper.find('input[autocomplete="username"]').setValue("Gigi");
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
    ["log in", "/auth/sign-in", "UNAUTHORIZED", "wrong username or password."],
    ["register", "/auth/register", "CONFLICT", "that username is taken."],
    ["register", "/auth/register", "INVALID_REQUEST", "usernames need 3 to 32 characters, passwords 8 to 128."],
  ] as const)("%s refused with %s shows a message and stays put", async (button, path, error, message) => {
    const { wrapper, router } = await submit({ [path]: () => ({ error }) }, button);
    expect(wrapper.find(".error").text()).toBe(message);
    expect(router.currentRoute.value.path).toBe("/");
    expect(me.value).toBe(null);
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
