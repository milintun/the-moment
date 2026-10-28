import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { dayAndHour } from "../api.ts";
import { fakeApi, groupRow, mountAppAt, mountAt, signedInAs } from "./fake.ts";

beforeEach(() => signedInAs(null));

const post = (id: string, owner: string, votes = 0) => ({
  post: id,
  owner,
  content: `u-${id}`,
  caption: `caption ${id}`,
  createdAt: new Date().toISOString(),
  votes,
});

describe("gallery view", () => {
  let posts: ReturnType<typeof post>[];
  let votes: string[];
  beforeEach(() => {
    posts = [post("p1", "gigi", 2), post("p2", "sid")];
    votes = [];
  });
  const gallery = (extra: Record<string, (input: any) => unknown> = {}, open = true) =>
    fakeApi({
      "/groups/list": () => ({ list: { groups: [groupRow("g1", "Doodles", open ? {} : { run: null, runStart: null, runEnd: null })] } }),
      "/groups/feed": () => ({ feed: { posts } }),
      "/posts/my-votes": () => ({ votes: { posts: votes.map((p) => ({ post: p })) } }),
      ...extra,
    });
  // The text buttons under an artwork (the artwork itself, a button for voting, isn't one of them).
  const buttons = (wrapper: any, id: string) =>
    wrapper.find(`#post-${id}`).findAll("figcaption button").map((b: any) => b.text());
  const art = (wrapper: any, id: string) => wrapper.find(`#post-${id} .art-button`);
  const vote = async (wrapper: any, id: string) => {
    await art(wrapper, id).trigger("click");
    await flushPromises();
  };
  const click = async (wrapper: any, id: string, label: string) => {
    await wrapper.find(`#post-${id}`).findAll("button").find((b: any) => b.text() === label)!.trigger("click");
    await flushPromises();
  };

  test("shows each artwork with its caption, owner, votes, and image", async () => {
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(wrapper.find("h1").text()).toBe("Doodles");
    const art = wrapper.find("#post-p1");
    expect(art.find("img").attributes("src")).toBe("/api/images/u-p1");
    expect(art.text()).toContain("caption p1");
    expect(art.findAll("figcaption .meta").map((m) => m.text())).toEqual(["by gigi", "2 votes"]);
  });

  test("signed out: no buttons on the art, and a link to log in to post and vote", async () => {
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(buttons(wrapper, "p1")).toEqual([]);
    expect(wrapper.find('a[href="/auth"]').text()).toBe("log in to post and vote");
    expect(wrapper.text()).not.toContain("post here");
  });

  test("signed in: POST + above the wall opens the post form over the gallery, which × closes", async () => {
    signedInAs("sasha");
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(wrapper.text()).not.toContain("log in to post and vote");
    const dialog = () => wrapper.find("dialog.post-overlay").element as HTMLDialogElement;
    expect(dialog().open).toBe(false);
    await wrapper.find(".wall button.post-button").trigger("click");
    expect(dialog().open).toBe(true);
    expect(wrapper.find("dialog .post-form").exists()).toBe(true);
    await wrapper.find('dialog button[aria-label="close"]').trigger("click");
    expect(dialog().open).toBe(false);
  });

  test("posting from the window closes it and reloads the wall in place", async () => {
    signedInAs("sasha");
    const api = gallery({
      "/uploads/request": () => ({ upload: "u9", uploadUrl: "https://storage.test/u9" }),
      "/posts/create": () => ({ post: "p9" }),
    });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) =>
      String(url).startsWith("https://storage.test") ? new Response(null, { status: 200 }) : realFetch(url, init)) as typeof fetch;
    try {
      const { wrapper, router } = await mountAt("/galleries/g1");
      await wrapper.find(".wall button.post-button").trigger("click");
      const file = new File(["x"], "art.png", { type: "image/png" });
      const input = wrapper.find('dialog input[type="file"]');
      Object.defineProperty(input.element, "files", { value: [file] });
      await input.trigger("change");
      await flushPromises();
      await wrapper.find("dialog form").trigger("submit");
      await flushPromises();
      expect(api.called("/posts/create")).toEqual([{ group: "g1", content: "u9", caption: "" }]);
      expect((wrapper.find("dialog.post-overlay").element as HTMLDialogElement).open).toBe(false);
      expect(router.currentRoute.value.fullPath).toBe("/galleries/g1"); // stayed on the gallery
      expect(api.called("/groups/feed").length).toBeGreaterThan(1); // reloaded
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("a closed gallery offers no posting", async () => {
    signedInAs("sasha");
    gallery({}, false);
    const { wrapper } = await mountAt("/galleries/g1");
    expect(wrapper.text()).toContain("closed");
    expect(wrapper.text()).not.toContain("post here");
  });

  test("an empty wall says so", async () => {
    posts = [];
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(wrapper.find(".empty").exists()).toBe(true);
  });

  test("clicking someone's art upvotes it; clicking again takes the vote back", async () => {
    signedInAs("sasha");
    const api = gallery({
      "/posts/vote": ({ post }) => (votes.push(post), {}),
      "/posts/unvote": ({ post }) => ((votes = votes.filter((v) => v !== post)), {}),
    });
    const { wrapper } = await mountAt("/galleries/g1");
    expect([art(wrapper, "p1").attributes("data-action"), art(wrapper, "p1").attributes("aria-pressed")]).toEqual(["upvote", "false"]);
    await vote(wrapper, "p1");
    expect(api.called("/posts/vote")).toEqual([{ post: "p1" }]);
    expect([art(wrapper, "p1").attributes("data-action"), art(wrapper, "p1").attributes("aria-pressed")]).toEqual(["unvote", "true"]);
    expect(wrapper.find("#post-p1 .votes").classes()).toContain("mine");
    await vote(wrapper, "p1");
    expect(api.called("/posts/unvote")).toEqual([{ post: "p1" }]);
    expect(art(wrapper, "p1").attributes("data-action")).toBe("upvote");
  });

  test("a vote changes the count but doesn't reorder the wall until it's loaded again", async () => {
    signedInAs("sasha");
    posts = [post("p1", "gigi", 1), post("p2", "sid", 0)];
    gallery({ "/posts/vote": ({ post: id }) => ((posts = [{ ...posts[1]!, votes: 2 }, posts[0]!]), votes.push(id), {}) });
    const { wrapper } = await mountAt("/galleries/g1");
    const order = (w: any) => w.findAll(".artwork").map((f: any) => f.attributes("id"));
    expect(order(wrapper)).toEqual(["post-p1", "post-p2"]);
    await vote(wrapper, "p2"); // p2 now leads on the server
    expect(order(wrapper)).toEqual(["post-p1", "post-p2"]);
    expect(wrapper.find("#post-p2 .votes").text()).toBe("2 votes");
    wrapper.unmount();
    const again = await mountAt("/galleries/g1");
    expect(order(again.wrapper)).toEqual(["post-p2", "post-p1"]);
  });

  test("you can't vote on your own post, but you can delete it after confirming", async () => {
    signedInAs("gigi");
    const api = gallery({ "/posts/delete": () => ({}) });
    const { wrapper } = await mountAt("/galleries/g1");
    expect(buttons(wrapper, "p1")).toEqual(["delete"]);
    await click(wrapper, "p1", "delete");
    await click(wrapper, "p1", "no");
    expect(api.called("/posts/delete")).toEqual([]);
    await click(wrapper, "p1", "delete");
    await click(wrapper, "p1", "yes, delete");
    expect(api.called("/posts/delete")).toEqual([{ post: "p1" }]);
    expect(wrapper.find("#post-p1").exists()).toBe(false);
  });

  test("an admin can take someone's post off the wall after confirming", async () => {
    signedInAs("milin", true);
    const api = gallery({ "/admin/groups/remove-post": () => ({}) });
    const { wrapper } = await mountAt("/galleries/g1");
    expect(art(wrapper, "p2").exists()).toBe(true);
    expect(buttons(wrapper, "p2")).toEqual(["remove from gallery"]);
    await click(wrapper, "p2", "remove from gallery");
    expect(wrapper.find("#post-p2").text()).toContain("remove this post from Doodles?");
    await click(wrapper, "p2", "yes, remove");
    expect(api.called("/admin/groups/remove-post")).toEqual([{ group: "g1", post: "p2" }]);
    expect(wrapper.find("#post-p2").exists()).toBe(false);
  });

  test("non-admins never see remove from gallery", async () => {
    signedInAs("sasha");
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(wrapper.text()).not.toContain("remove from gallery");
  });

  test("a refused action shows its message next to that post", async () => {
    signedInAs("sasha");
    gallery({ "/posts/vote": () => ({ error: "CONFLICT" }) });
    const { wrapper } = await mountAt("/galleries/g1");
    await vote(wrapper, "p2");
    expect(wrapper.find("#post-p2 [role=alert]").text()).toBe("you already voted for this post.");
    expect(wrapper.find("#post-p1 [role=alert]").exists()).toBe(false);
  });

  test("a post that's already gone leaves the wall, with the message above it", async () => {
    signedInAs("milin", true);
    gallery({ "/admin/groups/remove-post": () => ({ error: "NOT_FOUND" }) });
    const { wrapper } = await mountAt("/galleries/g1");
    await click(wrapper, "p2", "remove from gallery");
    await click(wrapper, "p2", "yes, remove");
    expect(wrapper.find("#post-p2").exists()).toBe(false);
    expect(wrapper.find("[role=alert]").text()).toBe("this post is already off the wall.");
  });

  test("an ended session says so, with a link to log in", async () => {
    signedInAs("sasha");
    gallery({ "/posts/vote": () => ({ error: "UNAUTHORIZED" }) });
    const { wrapper } = await mountAt("/galleries/g1");
    await vote(wrapper, "p1");
    const alert = wrapper.find("#post-p1 [role=alert]");
    expect(alert.text()).toContain("your session ended");
    expect(alert.find('a[href="/auth"]').exists()).toBe(true);
  });
});

describe("gallery season notices", () => {
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const T = new Date("2026-03-01T12:00:00.000Z").getTime();
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(T);
  });
  afterEach(() => vi.useRealTimers());

  const season = (startedAgo: number, endsIn: number, extra: object = {}) =>
    fakeApi({
      "/groups/list": () => ({
        list: { groups: [groupRow("g1", "Doodles", { runStart: new Date(T - startedAgo).toISOString(), runEnd: new Date(T + endsIn).toISOString(), ...extra })] },
      }),
      "/groups/feed": () => ({ feed: { posts: [post("p1", "gigi")] } }),
      "/posts/my-votes": () => ({ votes: { posts: [] } }),
      "/posts/vote": () => ({ error: "CONFLICT" }),
    });
  const notice = async () => (await mountAt("/galleries/g1")).wrapper;

  test("a new season gets a \"new\" badge beside the name, then its season and when it started and ends", async () => {
    season(5 * MINUTE, HOUR);
    const wrapper = await notice();
    expect(wrapper.find("h1 .badge").text()).toBe("new");
    expect(wrapper.find("h1 .badge").classes()).not.toContain("ending");
    expect(wrapper.find(".season-line").text()).toBe("season 1 of 3");
    expect(wrapper.find(".season-dates").text()).toBe(`${dayAndHour(new Date(T - 5 * MINUTE))} to ${dayAndHour(new Date(T + HOUR))}`);
  });

  test("a season ending soon gets a filled-in \"ending soon\" badge", async () => {
    season(HOUR, 5 * MINUTE);
    const badge = (await notice()).find("h1 .badge");
    expect([badge.text(), badge.classes()]).toEqual(["ending soon", expect.arrayContaining(["ending"])]);
  });

  test("mid-season there is no badge, and the last season is marked final", async () => {
    season(HOUR / 2, HOUR / 2, { run: 2, runs: 3 });
    const wrapper = await notice();
    expect(wrapper.find(".badge").exists()).toBe(false);
    expect(wrapper.find(".season-line").text()).toBe("season 3 of 3 · final season");
  });

  test("when the season ends with the page open, it points to the archive and votes are final", async () => {
    signedInAs("sasha");
    const api = season(HOUR, MINUTE / 2);
    const wrapper = await notice();
    expect(wrapper.find("h1 .badge").text()).toBe("ending soon");
    vi.advanceTimersByTime(MINUTE);
    await flushPromises();
    expect(wrapper.find(".season-notice").text()).toBe("this season just ended. see it in the archive");
    expect(wrapper.find('.season-notice a').attributes("href")).toBe("/archive/g1/0");
    expect(wrapper.find(".badge").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("post here");
    await wrapper.find("#post-p1 .art-button").trigger("click");
    await flushPromises();
    expect(wrapper.find("#post-p1 [role=alert]").text()).toBe("this season is over, so its votes are final.");
    expect(api.called("/groups/feed")).toHaveLength(1); // the wall stays as it was
  });
});

describe("future galleries", () => {
  const roundEnd = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const ROUND_START = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const when = (iso: string) => {
    const d = new Date(iso);
    const time = `${d.getHours() % 12 || 12}${d.getMinutes() ? `:${String(d.getMinutes()).padStart(2, "0")}` : ""}${d.getHours() < 12 ? "am" : "pm"}`;
    return `${d.toLocaleDateString([], { weekday: "long" })} ${d.getMonth() + 1}/${d.getDate()} at ${time}`;
  };
  const nomination = (id: string, name: string, nominator: string) => ({ nomination: id, name, nominator, votes: 0, createdAt: new Date().toISOString() });
  const page = (handlers: Record<string, (input: any) => unknown>, end: string | null = roundEnd()) =>
    fakeApi({
      "/nominations/categories": () => ({ list: { categories: [{ category: "k", name: "Future galleries", run: end ? 0 : null, runStart: ROUND_START, runEnd: end }] } }),
      "/nominations/list": () => ({ ranking: { nominations: [nomination("n1", "Night Walks", "gigi")] } }),
      "/nominations/my-votes": () => ({ votes: { nominations: [] } }),
      ...handlers,
    });
  const openForm = async (wrapper: any) => {
    await wrapper.findAll("button").find((b: any) => b.text() === "nominate +")!.trigger("click");
  };
  const nominate = async (wrapper: any, name: string) => {
    if (!wrapper.find("form.nominate-form").exists()) await openForm(wrapper);
    await wrapper.find("form input").setValue(name);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
  };

  test("one line counts down to the round's close, with its start and end", async () => {
    const end = roundEnd();
    page({}, end);
    const { wrapper } = await mountAt("/nominations");
    expect(wrapper.find(".round").text()).toBe(`current round closes in 3h (${when(ROUND_START)} – ${when(end)})`);
    expect(wrapper.text()).not.toContain("open until");
  });

  test("round times read as a day and an hour, minutes only when there are some", async () => {
    const start = new Date(2026, 9, 26, 1, 0).toISOString(); // Monday, 1 AM local
    const end = new Date(2026, 10, 1, 23, 30).toISOString(); // Sunday, 11:30 PM local
    fakeApi({
      "/nominations/categories": () => ({ list: { categories: [{ category: "k", name: "Future galleries", run: 0, runStart: start, runEnd: end }] } }),
      "/nominations/list": () => ({ ranking: { nominations: [] } }),
    });
    const { wrapper } = await mountAt("/nominations");
    expect(wrapper.find(".round").text()).toContain("(Monday 10/26 at 1am – Sunday 11/1 at 11:30pm)");
  });

  test("signed in, NOMINATE + opens the small form below it, which Esc or a click elsewhere closes", async () => {
    signedInAs("sasha");
    page({});
    const { wrapper } = await mountAt("/nominations");
    expect(wrapper.find("form.nominate-form").exists()).toBe(false);
    await openForm(wrapper);
    expect(wrapper.find("form.nominate-form").exists()).toBe(true);
    await wrapper.find(".nominate").trigger("keydown", { key: "Escape" });
    expect(wrapper.find("form.nominate-form").exists()).toBe(false);
    await openForm(wrapper);
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await flushPromises();
    expect(wrapper.find("form.nominate-form").exists()).toBe(false);
  });

  test("a nomination that goes through closes the form and says so", async () => {
    signedInAs("sasha");
    page({ "/nominations/create": () => ({ nomination: "n2" }) });
    const { wrapper } = await mountAt("/nominations");
    await nominate(wrapper, "Zines");
    expect(wrapper.find("form.nominate-form").exists()).toBe(false);
    expect(wrapper.text()).toContain("nominated.");
  });

  test("clicking someone else's idea's row upvotes it, and again takes the vote back; your votes are marked", async () => {
    signedInAs("sasha");
    let mine: string[] = [];
    const api = page({
      "/nominations/my-votes": () => ({ votes: { nominations: mine.map((n) => ({ nomination: n })) } }),
      "/nominations/vote": ({ nomination }) => ((mine = [nomination]), {}),
      "/nominations/unvote": () => ((mine = []), {}),
    });
    const { wrapper } = await mountAt("/nominations");
    const row = () => wrapper.find(".ranking tbody tr");
    expect(row().classes()).toContain("votable");
    expect(row().find(".vote-label").text()).toBe("upvote");
    await row().trigger("click");
    await flushPromises();
    expect(api.called("/nominations/vote")).toEqual([{ nomination: "n1" }]);
    expect(row().find(".mine").exists()).toBe(true);
    expect([row().find(".vote-label").text(), row().find(".vote-label").attributes("aria-pressed")]).toEqual(["unvote", "true"]);
    await row().find(".vote-label").trigger("click"); // from the keyboard, the label is the button
    await flushPromises();
    expect(api.called("/nominations/unvote")).toEqual([{ nomination: "n1" }]);
    expect(api.called("/nominations/vote")).toHaveLength(1); // the label's click didn't also count as the row's
  });

  test("your own idea's row says WITHDRAW instead; clicking it asks first, then withdraws", async () => {
    signedInAs("gigi");
    const api = page({ "/nominations/withdraw": () => ({}) });
    const { wrapper } = await mountAt("/nominations");
    const row = () => wrapper.find(".ranking tbody tr");
    expect(row().classes()).toContain("own"); // a black row
    expect(row().find(".vote-label").text()).toBe("withdraw");
    expect(row().find(".vote-label").classes()).toContain("withdraw-label");
    await row().trigger("click");
    expect(api.called("/nominations/vote")).toEqual([]);
    expect(row().text()).toContain("Withdraw this nomination?");
    expect(row().classes()).not.toContain("votable"); // asking: no wash, no more clicks on the row
    await row().findAll("button").find((b) => b.text() === "Yes, withdraw")!.trigger("click");
    await flushPromises();
    expect(api.called("/nominations/withdraw")).toEqual([{ nomination: "n1" }]);
  });

  test("an idea can be at most 40 characters", async () => {
    signedInAs("sasha");
    page({});
    const { wrapper } = await mountAt("/nominations");
    await openForm(wrapper);
    expect(wrapper.find("form input").attributes("maxlength")).toBe("40");
  });

  test("the ranking is a table: nominations, votes, by, and when each was added", async () => {
    page({});
    const { wrapper } = await mountAt("/nominations");
    expect(wrapper.findAll(".ranking th").map((th) => th.text())).toEqual(["nominations", "votes", "by", "added", "actions"]);
    const [cells] = wrapper.findAll(".ranking tbody tr").map((tr) => tr.findAll("td").map((td) => td.text()));
    expect(cells!.slice(0, 3)).toEqual(["Night Walks", "0", "gigi"]);
    expect(cells![3]).toMatch(/\d/);
    expect(wrapper.find("ol").exists()).toBe(false);
  });

  test("an idea already nominated is caught before asking the server", async () => {
    signedInAs("sasha");
    const api = page({});
    const { wrapper } = await mountAt("/nominations");
    await nominate(wrapper, "  night   WALKS ");
    expect(api.called("/nominations/create")).toEqual([]);
    expect(wrapper.find("form [role=alert]").text()).toBe('"Night Walks" is already nominated. upvote it instead.');
  });

  test("another refusal in the open round means once a day", async () => {
    signedInAs("sasha");
    page({ "/nominations/create": () => ({ error: "CONFLICT" }) });
    const { wrapper } = await mountAt("/nominations");
    await nominate(wrapper, "Zines");
    expect(wrapper.find("form [role=alert]").text()).toBe("you can nominate once a day.");
  });

  test("voting after the round closed says votes are final, next to that nomination", async () => {
    signedInAs("sasha");
    // The round closes just as the vote arrives.
    let end: string | null = roundEnd();
    const categories = () => ({ list: { categories: [{ category: "k", name: "Future galleries", run: end ? 0 : null, runStart: null, runEnd: end }] } });
    page({ "/nominations/categories": categories, "/nominations/vote": () => ((end = null), { error: "CONFLICT" }) });
    const { wrapper } = await mountAt("/nominations");
    await wrapper.find(".ranking tr.votable").trigger("click");
    await flushPromises();
    expect(wrapper.find(".ranking [role=alert]").text()).toBe("this round is over, so its votes are final.");
  });
});

describe("chosen ideas", () => {
  test("future galleries strikes a chosen idea, and its nominator can't withdraw it", async () => {
    signedInAs("gigi");
    fakeApi({
      "/nominations/categories": () => ({
        list: { categories: [{ category: "k", name: "Future galleries", run: 0, runStart: null, runEnd: new Date(Date.now() + 3_600_000).toISOString() }] },
      }),
      "/nominations/list": () => ({
        ranking: {
          nominations: [
            { nomination: "n1", name: "Hands", nominator: "gigi", votes: 2, createdAt: new Date().toISOString(), chosen: true },
            { nomination: "n2", name: "Feet", nominator: "gigi", votes: 0, createdAt: new Date().toISOString(), chosen: false },
          ],
        },
      }),
      "/nominations/my-votes": () => ({ votes: { nominations: [] } }),
    });
    const { wrapper } = await mountAt("/nominations");
    const [hands, feet] = wrapper.findAll(".ranking tbody tr");
    expect(hands!.find(".chosen").text()).toBe("Hands");
    expect(hands!.text()).toContain("chosen to become a gallery");
    expect(hands!.find(".withdraw-label").exists()).toBe(false);
    expect(feet!.find(".withdraw-label").exists()).toBe(true);
  });

  test("my nominations is a table like future galleries' (no BY); chosen ones say so, the rest withdraw by their row", async () => {
    signedInAs("gigi");
    fakeApi({
      "/posts/mine": () => ({ mine: { posts: [] } }),
      "/groups/list": () => ({ list: { groups: [] } }),
      "/nominations/mine": () => ({
        mine: {
          nominations: [
            { nomination: "n1", name: "Hands", votes: 2, createdAt: new Date().toISOString(), chosen: true, current: null },
            { nomination: "n2", name: "Feet", votes: 0, createdAt: new Date().toISOString(), chosen: false, current: true },
          ],
        },
      }),
    });
    const { wrapper } = await mountAt("/home");
    expect(wrapper.findAll(".ranking th").map((th) => th.text())).toEqual(["nominations", "votes", "added", "actions"]);
    const rows = wrapper.findAll(".ranking tbody tr");
    expect(rows[0]!.text()).toContain("chosen to become a gallery");
    expect(rows[0]!.find(".withdraw-label").exists()).toBe(false);
    expect(rows[0]!.classes()).not.toContain("votable");
    expect(rows[1]!.find(".withdraw-label").text()).toBe("withdraw");
    await rows[1]!.trigger("click");
    expect(wrapper.findAll(".ranking tbody tr")[1]!.text()).toContain("withdraw it?");
  });
});

describe("archive", () => {
  test("each room with finished seasons, by name and the dates its seasons span, without underlines", async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - 10 * DAY);
    const row = (group: string, name: string, runs: number) => ({ group, name, cycle: "c", start: start.toISOString(), period: 3 * DAY, runs });
    fakeApi({
      "/groups/list": () => ({ list: { groups: [] } }),
      "/archive/galleries": () => ({ page: { groups: [row("g1", "Doodles", 2), row("g2", "Future", 9), { ...row("g3", "Never", 1), start: null }] } }),
    });
    const { wrapper } = await mountAt("/archive");
    const day = (ms: number) => new Date(ms).toLocaleDateString();
    const t0 = start.getTime();
    expect(wrapper.findAll(".room-name").map((a) => a.text())).toEqual([
      `Doodles (${day(t0)} – ${day(t0 + 6 * DAY)})`, // both seasons over
      `Future (${day(t0)} – ${day(t0 + 9 * DAY)})`, // three of nine over; never-run Never left out
    ]);
  });

  test("a gallery opens into its finished seasons, each \"season n\" going to that season's wall", async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - 10 * DAY).toISOString();
    fakeApi({ "/archive/galleries": () => ({ page: { groups: [{ group: "g1", name: "Doodles", cycle: "c", start, period: 3 * DAY, runs: 9 }] } }) });
    const { wrapper } = await mountAt("/archive");
    const gallery = wrapper.find("details");
    expect((gallery.element as HTMLDetailsElement).open).toBe(false);
    await gallery.find("summary").trigger("click");
    expect(gallery.findAll(".seasons a").map((a) => [a.text(), a.attributes("href")])).toEqual([
      ["season 1", "/archive/g1/0"],
      ["season 2", "/archive/g1/1"],
      ["season 3", "/archive/g1/2"],
    ]);
  });
});

describe("archive search", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const start = new Date(Date.now() - 10 * DAY).toISOString();
  const row = (i: number, name: string) => ({ group: `g${i}`, name, cycle: "c", start, period: DAY, runs: 2 });

  test("narrows the list as you type, by name, ignoring case and spacing; nothing matching says so", async () => {
    fakeApi({ "/archive/galleries": () => ({ page: { groups: [row(1, "Night Walks"), row(2, "Doodles"), row(3, "Night  Owls")] } }) });
    const { wrapper } = await mountAt("/archive");
    const names = () => wrapper.findAll(".room-name").map((a) => a.text().split(" (")[0]);
    await wrapper.find("input.search").setValue("NIGHT ");
    expect(names()).toEqual(["Night Walks", "Night  Owls"]);
    await wrapper.find("input.search").setValue("night owls");
    expect(names()).toEqual(["Night  Owls"]);
    await wrapper.find("input.search").setValue("zines");
    expect(wrapper.text()).toContain('no galleries match "zines".');
    await wrapper.find("input.search").setValue("");
    expect(names()).toHaveLength(3);
  });

  test("searching loads the galleries not loaded yet, so older ones are found too", async () => {
    const all = Array.from({ length: 25 }, (_, i) => row(i, i === 24 ? "Oldest Doodles" : `Room ${i}`));
    const api = fakeApi({ "/archive/galleries": ({ offset, limit }) => ({ page: { groups: all.slice(offset, offset + limit) } }) });
    const { wrapper } = await mountAt("/archive");
    expect(wrapper.findAll(".room-name")).toHaveLength(20);
    await wrapper.find("input.search").setValue("doodles");
    await flushPromises();
    expect(api.called("/archive/galleries").map((c) => c.offset)).toEqual([0, 20]);
    expect(wrapper.findAll(".room-name").map((a) => a.text().split(" (")[0])).toEqual(["Oldest Doodles"]);
    expect(wrapper.text()).not.toContain("load more galleries");
  });
});

describe("wall order", () => {
  test("sorted by votes as it comes; the sort menu re-sorts it newest or oldest first, and back", async () => {
    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
    fakeApi({
      "/groups/list": () => ({ list: { groups: [groupRow("g1", "Doodles")] } }),
      "/groups/feed": () => ({
        feed: {
          posts: [
            { post: "old-popular", owner: "gigi", content: "u1", caption: "", createdAt: at(50), votes: 5 },
            { post: "new-quiet", owner: "sid", content: "u2", caption: "", createdAt: at(5), votes: 0 },
            { post: "mid", owner: "sash", content: "u3", caption: "", createdAt: at(20), votes: 2 },
          ],
        },
      }),
    });
    const { wrapper } = await mountAt("/galleries/g1");
    const ids = () => wrapper.findAll(".artwork").map((f) => f.attributes("id"));
    const menu = wrapper.find(".wall-order");
    const pick = async (label: string) => {
      await menu.find("button.current").trigger("click");
      await menu.findAll("[role=option]").find((o) => o.text() === label)!.trigger("click");
    };
    expect(menu.find("button.current").text()).toContain("votes");
    expect(menu.find("[role=listbox]").exists()).toBe(false); // closed until clicked
    expect(ids()).toEqual(["post-old-popular", "post-new-quiet", "post-mid"]); // the server's order
    await pick("newest");
    expect(menu.find("[role=listbox]").exists()).toBe(false); // closes on choosing
    expect(ids()).toEqual(["post-new-quiet", "post-mid", "post-old-popular"]);
    await pick("oldest");
    expect(ids()).toEqual(["post-old-popular", "post-mid", "post-new-quiet"]);
    await pick("votes");
    expect(ids()).toEqual(["post-old-popular", "post-new-quiet", "post-mid"]);
  });

  test("the sort menu works from the keyboard: an arrow opens it, arrows move, Enter chooses, Esc closes", async () => {
    fakeApi({
      "/groups/list": () => ({ list: { groups: [groupRow("g1", "Doodles")] } }),
      "/groups/feed": () => ({ feed: { posts: [] } }),
    });
    const { wrapper } = await mountAt("/galleries/g1");
    const menu = wrapper.find(".wall-order");
    expect(menu.find("button.current").attributes("aria-label")).toBe("sorted by votes"); // says what it's set to
    await menu.trigger("keydown", { key: "ArrowDown" });
    expect(menu.find("button.current").attributes("aria-expanded")).toBe("true");
    await flushPromises();
    expect(document.activeElement?.textContent?.trim()).toBe("votes"); // focus is on the option, so it's announced
    await menu.trigger("keydown", { key: "ArrowDown" });
    await menu.trigger("keydown", { key: "Enter" });
    expect(menu.find("button.current").text()).toContain("newest");
    await menu.trigger("keydown", { key: "ArrowDown" });
    await menu.trigger("keydown", { key: "Escape" });
    expect(menu.find("[role=listbox]").exists()).toBe(false);
    expect(menu.find("button.current").text()).toContain("newest");
  });
});

describe("archived season", () => {
  test("no rooms before and after anywhere; just a plain way back to the archive", async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - 10 * DAY).toISOString();
    fakeApi({
      "/groups/list": () => ({ list: { groups: [{ ...groupRow("g1", "Doodles"), start, period: 3 * DAY, runs: 2, run: null, runStart: null, runEnd: null }] } }),
      "/groups/archive": () => ({ archive: { posts: [] } }),
      "/archive/galleries": () => ({ page: { groups: [] } }),
    });
    const { wrapper } = await mountAppAt("/archive/g1/0");
    expect(wrapper.find(".wall-end").exists()).toBe(false);
    expect(wrapper.find(".neighbours").exists()).toBe(false);
    const back = wrapper.find(".back a");
    expect([back.text(), back.attributes("href")]).toEqual(["← back to archive", "/archive"]);
  });
});

describe("home, signed in", () => {
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const mine = (post: string, votes: number, minutesAgo: number) => ({
    post, content: `u-${post}`, caption: "", createdAt: at(minutesAgo), votes, current: true, galleries: [],
  });
  const home = (roundOpen = true) =>
    fakeApi({
      "/posts/mine": () => ({ mine: { posts: [mine("new-quiet", 0, 5), mine("old-popular", 4, 50), mine("mid", 1, 20)] } }),
      "/nominations/mine": () => ({ mine: { nominations: [] } }),
      "/groups/list": () => ({ list: { groups: [groupRow("g1", "Doodles")] } }),
      "/nominations/categories": () => ({
        list: { categories: [{ category: "k", name: "Future galleries", run: roundOpen ? 0 : null, runStart: null, runEnd: roundOpen ? at(-60) : null }] },
      }),
    });

  test("two lists, my posts (sorted by, in its title) and my nominations, and no post form on the page", async () => {
    signedInAs("sasha");
    home();
    const { wrapper } = await mountAt("/home");
    expect(wrapper.findAll(".section-head > h2").map((h) => h.text())).toEqual(["my posts", "my nominations"]);
    expect(wrapper.find(".section-head > h2 + .wall-order").exists()).toBe(true); // "my posts sorted by …", on the left
    expect(wrapper.find(".post-form").exists()).toBe(false); // only inside the window
  });

  test("my posts sort like a gallery's wall: most votes, newest, or oldest first", async () => {
    signedInAs("sasha");
    home();
    const { wrapper } = await mountAt("/home");
    const order = () => wrapper.findAll(".card img").map((i) => i.attributes("src")!.split("u-")[1]);
    expect(order()).toEqual(["old-popular", "mid", "new-quiet"]);
    const menu = wrapper.find(".wall-order");
    const pick = async (label: string) => {
      await menu.find("button.current").trigger("click");
      await menu.findAll("[role=option]").find((o) => o.text() === label)!.trigger("click");
    };
    await pick("newest");
    expect(order()).toEqual(["new-quiet", "mid", "old-popular"]);
    await pick("oldest");
    expect(order()).toEqual(["old-popular", "mid", "new-quiet"]);
  });

  test("+ on my posts' line opens the new post window, choosing among open galleries", async () => {
    signedInAs("sasha");
    home();
    const { wrapper } = await mountAt("/home");
    const plus = wrapper.find(".section-head button.post-button");
    expect([plus.text(), plus.attributes("aria-label")]).toEqual(["+", "new post"]);
    const dialog = () => wrapper.find("dialog.post-overlay").element as HTMLDialogElement;
    await wrapper.find(".section-head button.post-button").trigger("click");
    await flushPromises();
    expect(dialog().open).toBe(true);
    expect(wrapper.find("dialog h2").text()).toBe("new post");
    expect(wrapper.findAll("dialog select option").map((o) => o.text())).toContain("Doodles (gallery)");
  });

  test("+ on my nominations' line (NOMINATE) while a round is open, and not otherwise", async () => {
    signedInAs("sasha");
    home(true);
    const open = await mountAt("/home");
    const button = open.wrapper.findAll(".section-head")[1]!.find(".nominate .accent-button");
    expect([button.text(), button.attributes("aria-label")]).toEqual(["+", "nominate an idea"]);
    open.wrapper.unmount();
    home(false);
    const closed = await mountAt("/home");
    expect(closed.wrapper.find(".nominate").exists()).toBe(false);
  });
});

