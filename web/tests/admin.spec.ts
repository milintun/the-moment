import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, test } from "vitest";
import { fakeApi, mountAt, signedInAs } from "./fake.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

beforeEach(() => signedInAs("milin", true));

const button = (wrapper: any, label: string) => wrapper.findAll("button").find((b: any) => b.text() === label)!;

describe("home", () => {
  test("an admin gets a red admin button, apart from sign out", async () => {
    fakeApi({ "/posts/mine": () => ({ mine: { posts: [] } }), "/nominations/mine": () => ({ mine: { nominations: [] } }), "/groups/list": () => ({ list: { groups: [] } }) });
    const { wrapper } = await mountAt("/home");
    const admin = wrapper.find("a.admin-button");
    expect([admin.text(), admin.attributes("href")]).toEqual(["admin", "/home/admin"]);
    expect(admin.element.closest("p")!.textContent).not.toContain("sign out");
  });

  test("anyone else gets no admin button", async () => {
    signedInAs("gigi");
    fakeApi({ "/posts/mine": () => ({ mine: { posts: [] } }), "/nominations/mine": () => ({ mine: { nominations: [] } }), "/groups/list": () => ({ list: { groups: [] } }) });
    const { wrapper } = await mountAt("/home");
    expect(wrapper.find("a.admin-button").exists()).toBe(false);
  });
});

describe("admin sections", () => {
  const emptyAdmin = () =>
    fakeApi({
      "/nominations/categories": () => ({ list: { categories: [] } }),
      "/admin/schedules/list": () => ({ list: { schedules: [] } }),
      "/admin/admins/list": () => ({ list: { admins: [{ user: "milin", owner: true }] } }),
    });

  test("the sidebar shows one section at a time, new schedule first", async () => {
    emptyAdmin();
    const { wrapper, router } = await mountAt("/home/admin");
    expect(wrapper.findAll(".admin-nav a").map((a) => a.text())).toEqual(["new schedule", "schedules", "people"]);
    expect(wrapper.find(".admin-section h2").text()).toBe("New schedule");
    await wrapper.findAll(".admin-nav a")[2]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/home/admin/people");
  });

  test("each section has its own address", async () => {
    emptyAdmin();
    const { wrapper } = await mountAt("/home/admin/schedules");
    expect(wrapper.find(".admin-section h2").text()).toBe("Schedules");
    expect(wrapper.find(".admin-nav a.active").text()).toBe("schedules");
  });

  test("non-admins are turned away", async () => {
    signedInAs("gigi");
    emptyAdmin();
    const { wrapper } = await mountAt("/home/admin");
    expect(wrapper.text()).toContain("only admins can use this page.");
    expect(wrapper.find(".admin-nav").exists()).toBe(false);
  });
});

describe("new schedule", () => {
  const nomination = (id: string, name: string, chosen = false) => ({ nomination: id, name, nominator: "gigi", createdAt: iso(-DAY), votes: 1, chosen });
  // Nominations are in round 3, so round 2 is last week's.
  const page = (handlers: Record<string, (input: any) => unknown> = {}) =>
    fakeApi({
      "/nominations/categories": () => ({
        list: { categories: [{ category: "k", name: "Future galleries", run: 3, runStart: iso(-DAY), runEnd: iso(6 * DAY) }] },
      }),
      "/admin/nominations/round": ({ round }) => ({
        ranking: { nominations: round === 2 ? [nomination("n1", "Hands"), nomination("n2", "Feet", true)] : [nomination("n0", "Rain")] },
      }),
      ...handlers,
    });
  const typeGallery = async (wrapper: any, name: string) => {
    const field = wrapper.findAll("label").find((l: any) => l.text().startsWith("name"))!.find("input");
    await field.setValue(name);
    await button(wrapper, "add gallery").trigger("click");
  };

  test("starts at the next 12 AM by default", async () => {
    page();
    const { wrapper } = await mountAt("/home/admin/new");
    const value = (wrapper.find('input[type="datetime-local"]').element as HTMLInputElement).value;
    const start = new Date(value);
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
    expect(start.getTime()).toBeGreaterThan(Date.now());
    expect(start.getTime() - Date.now()).toBeLessThanOrEqual(DAY);
  });

  test("seasons of 30 days or more say they make wings", async () => {
    page();
    const { wrapper } = await mountAt("/home/admin/new");
    expect(wrapper.text()).not.toContain("make these wings");
    await wrapper.findAll('input[type="number"]')[0]!.setValue(30);
    expect(wrapper.text()).toContain("seasons of 30 days or more make these wings.");
  });

  test("last week's round shows first; older rounds are a click away; chosen ideas are struck and can't be picked", async () => {
    const api = page();
    const { wrapper } = await mountAt("/home/admin/new");
    expect(api.called("/admin/nominations/round")).toEqual([{ category: "k", round: 2 }]);
    expect(wrapper.text()).toContain("(last week)");
    const feet = wrapper.findAll("li.chosen");
    expect(feet.map((li) => li.text())).toEqual([expect.stringContaining("Feet")]);
    expect((feet[0]!.find("input").element as HTMLInputElement).disabled).toBe(true);
    await wrapper.find('button[aria-label="older round"]').trigger("click");
    await flushPromises();
    expect(api.called("/admin/nominations/round")[1]).toEqual({ category: "k", round: 1 });
    expect(wrapper.text()).toContain("Rain");
  });

  test("creates the schedule with typed and picked galleries, then shows the schedules", async () => {
    const api = page({ "/admin/schedules/create": ({ names }) => ({ cycle: "c", groups: names.map((_: string, i: number) => `g${i}`) }) });
    const { wrapper, router } = await mountAt("/home/admin/new");
    await typeGallery(wrapper, "Night Walks");
    await wrapper.findAll('input[type="checkbox"]')[0]!.setValue(true); // Hands
    await button(wrapper, "create schedule").trigger("click");
    await flushPromises();
    const [sent] = api.called("/admin/schedules/create");
    expect(sent).toMatchObject({ period: 7 * DAY, runs: 4, names: ["Night Walks", "Hands"], nominations: ["n1"] });
    expect(new Date(sent.start).getHours()).toBe(0);
    expect(router.currentRoute.value.fullPath).toBe("/home/admin/schedules?made=2");
  });

  test("the page catches no galleries, duplicate names, and a past start before asking the server", async () => {
    const api = page();
    const { wrapper } = await mountAt("/home/admin/new");
    const submit = async () => {
      await wrapper.find("form").trigger("submit");
      await flushPromises();
      return wrapper.find("form [role=alert]").text();
    };
    expect(await submit()).toBe("add at least one gallery.");
    await typeGallery(wrapper, "Night Walks");
    await typeGallery(wrapper, "night  walks");
    expect(await submit()).toBe('two galleries are named "night walks".');
    await button(wrapper, "remove").trigger("click");
    await wrapper.find('input[type="datetime-local"]').setValue("2020-01-01T00:00");
    expect(await submit()).toBe("the start can't be in the past.");
    expect(api.called("/admin/schedules/create")).toEqual([]);
  });

  test("an overlapping schedule is explained", async () => {
    page({ "/admin/schedules/create": () => ({ error: "CONFLICT" }) });
    const { wrapper } = await mountAt("/home/admin/new");
    await typeGallery(wrapper, "Doodles");
    await button(wrapper, "create schedule").trigger("click");
    await flushPromises();
    expect(wrapper.find("form [role=alert]").text()).toBe(
      "a schedule with the same season length and number of seasons already runs during those dates.",
    );
  });

  test("before any round has finished, there's nothing to pick", async () => {
    fakeApi({
      "/nominations/categories": () => ({
        list: { categories: [{ category: "k", name: "Future galleries", run: 0, runStart: iso(-DAY), runEnd: iso(6 * DAY) }] },
      }),
    });
    const { wrapper } = await mountAt("/home/admin/new");
    expect(wrapper.text()).toContain("no nomination round has finished yet.");
  });
});

describe("schedules", () => {
  const gallery = (group: string, name: string, runs = 3) => ({ group, name, runs });
  const list = (schedules: object[], handlers: Record<string, (input: any) => unknown> = {}) =>
    fakeApi({ "/admin/schedules/list": () => ({ list: { schedules } }), ...handlers });
  // One-week seasons, 3 of them; `started` is how long ago it began.
  const schedule = (cycle: string, started: number, galleries = [gallery("g1", "Doodles"), gallery("g2", "Sketches")]) => ({
    cycle,
    start: iso(-started),
    period: WEEK,
    runs: 3,
    galleries,
  });
  const row = (wrapper: any, name: string) => wrapper.findAll(".schedule li").find((li: any) => li.text().includes(name))!;
  /** Opens edit mode on the nth schedule. */
  const edit = async (wrapper: any, n = 0) => {
    await button(wrapper.findAll(".schedule")[n], "edit").trigger("click");
  };

  test("schedules are read only until edited", async () => {
    list([schedule("c", -DAY)]);
    const { wrapper } = await mountAt("/home/admin/schedules");
    const card = () => wrapper.find(".schedule");
    expect(card().findAll("button").map((b) => b.text())).toEqual(["edit"]);
    expect(card().find("input").exists()).toBe(false);
    await edit(wrapper);
    expect(card().classes()).toContain("editing");
    expect(card().text()).toContain("number of seasons");
    expect(card().text()).toContain("cancel schedule");
    await button(card(), "done").trigger("click");
    expect(card().findAll("button").map((b) => b.text())).toEqual(["edit"]);
  });

  test("galleries can be added to a schedule that hasn't started, typed or picked", async () => {
    const api = list([schedule("c", -DAY)], {
      "/nominations/categories": () => ({
        list: { categories: [{ category: "k", name: "Future galleries", run: 3, runStart: iso(-DAY), runEnd: iso(6 * DAY) }] },
      }),
      "/admin/nominations/round": () => ({
        ranking: { nominations: [{ nomination: "n1", name: "Hands", nominator: "gigi", createdAt: iso(-WEEK), votes: 2, chosen: false }] },
      }),
      "/admin/schedules/add-galleries": ({ names }) => ({ cycle: "c", groups: names }),
    });
    const { wrapper } = await mountAt("/home/admin/schedules");
    await edit(wrapper);
    await flushPromises();
    const name = wrapper.findAll(".schedule label").find((l) => l.text().startsWith("name"))!.find("input");
    await name.setValue("Rain");
    await button(wrapper, "add gallery").trigger("click");
    await wrapper.find('.schedule input[type="checkbox"]').setValue(true);
    await button(wrapper, "add to schedule").trigger("click");
    await flushPromises();
    expect(api.called("/admin/schedules/add-galleries")).toEqual([{ cycle: "c", names: ["Rain", "Hands"], nominations: ["n1"] }]);
    expect(api.called("/admin/schedules/list")).toHaveLength(2); // reloaded
  });

  test("an added name already in the schedule is caught before asking the server", async () => {
    const api = list([schedule("c", -DAY)], { "/nominations/categories": () => ({ list: { categories: [] } }) });
    const { wrapper } = await mountAt("/home/admin/schedules");
    await edit(wrapper);
    const name = wrapper.findAll(".schedule label").find((l) => l.text().startsWith("name"))!.find("input");
    await name.setValue("doodles ");
    await button(wrapper, "add gallery").trigger("click");
    await button(wrapper, "add to schedule").trigger("click");
    await flushPromises();
    expect(wrapper.find(".schedule-form [role=alert]").text()).toBe('two galleries are named "doodles".');
    expect(api.called("/admin/schedules/add-galleries")).toEqual([]);
  });

  test("a running schedule can't gain galleries", async () => {
    list([schedule("c", DAY)]);
    const { wrapper } = await mountAt("/home/admin/schedules");
    await edit(wrapper);
    expect(wrapper.text()).not.toContain("add to schedule");
  });

  test("a running schedule says which season it's in; removing a gallery says it stays this season", async () => {
    const api = list([schedule("c", DAY)], { "/admin/schedules/remove-gallery": () => ({}) });
    const { wrapper } = await mountAt("/home/admin/schedules");
    expect(wrapper.find(".schedule").text()).toContain("7-day seasons × 3 · season 1 of 3");
    await edit(wrapper);
    await button(row(wrapper, "Doodles"), "remove").trigger("click");
    expect(row(wrapper, "Doodles").text()).toContain("remove Doodles? it stays this season and leaves after it.");
    await button(row(wrapper, "Doodles"), "yes, remove").trigger("click");
    await flushPromises();
    expect(api.called("/admin/schedules/remove-gallery")).toEqual([{ cycle: "c", group: "g1" }]);
  });

  test("no removing in the final season, of a gallery already leaving, or of the last one staying", async () => {
    list([
      schedule("final", 2 * WEEK + DAY, [gallery("f1", "Zines"), gallery("f2", "Hands")]),
      schedule("c", DAY, [gallery("g1", "Doodles", 1), gallery("g2", "Sketches")]),
    ]);
    const { wrapper } = await mountAt("/home/admin/schedules");
    await edit(wrapper, 0);
    expect(wrapper.findAll(".schedule")[0]!.text()).not.toContain("remove");
    await edit(wrapper, 1);
    expect(row(wrapper, "Doodles").text()).toContain("leaves after season 1");
    expect(row(wrapper, "Doodles").text()).not.toContain("remove");
    expect(row(wrapper, "Sketches").text()).not.toContain("remove");
  });

  test("an upcoming schedule can be cancelled after confirming", async () => {
    const api = list([schedule("c", -DAY)], { "/admin/schedules/cancel": () => ({}) });
    const { wrapper } = await mountAt("/home/admin/schedules");
    expect(wrapper.find(".schedule").text()).toContain("upcoming");
    await edit(wrapper);
    await button(wrapper, "cancel schedule").trigger("click");
    await button(wrapper, "yes, cancel it").trigger("click");
    await flushPromises();
    expect(api.called("/admin/schedules/cancel")).toEqual([{ cycle: "c" }]);
  });

  test("a running schedule can't be cancelled, and can't end before the season underway", async () => {
    list([schedule("c", WEEK + DAY)], { "/admin/schedules/set-runs": () => ({ error: "CONFLICT" }) });
    const { wrapper } = await mountAt("/home/admin/schedules");
    await edit(wrapper);
    expect(wrapper.text()).not.toContain("cancel schedule");
    const seasons = wrapper.find('.schedule input[type="number"]');
    expect(seasons.attributes("min")).toBe("2");
    await seasons.setValue(1);
    await button(wrapper, "save").trigger("click");
    await flushPromises();
    expect(wrapper.find(".schedule [role=alert]").text()).toBe("it can't end before the season underway finishes.");
  });

  test("finished schedules are tucked away; a new one is announced", async () => {
    list([schedule("old", 4 * WEEK)]);
    const { wrapper } = await mountAt("/home/admin/schedules?made=2");
    expect(wrapper.find(".season-notice").text()).toBe("scheduled 2 galleries.");
    expect(wrapper.find("details summary").text()).toBe("finished schedules (1)");
    expect(wrapper.find('details a[href="/archive/g1"]').exists()).toBe(true);
  });
});

describe("people", () => {
  test("the owner adds an admin; an unregistered name is explained", async () => {
    signedInAs("milin", true);
    const { isOwner } = await import("../api.ts");
    isOwner.value = true;
    fakeApi({
      "/admin/admins/list": () => ({ list: { admins: [{ user: "milin", owner: true }] } }),
      "/admin/admins/add": () => ({ error: "NOT_FOUND" }),
    });
    const { wrapper } = await mountAt("/home/admin/people");
    await wrapper.find("form input").setValue("nobody");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find("form [role=alert]").text()).toBe("nobody has registered that username.");
  });
});
