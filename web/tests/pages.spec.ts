import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fakeApi, groupRow, mountAt, signedInAs } from "./fake.ts";

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
  const buttons = (wrapper: any, id: string) =>
    wrapper.find(`#post-${id}`).findAll("button").map((b: any) => b.text());
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
    expect(art.text()).toContain("by gigi · 2 vote(s)");
  });

  test("signed out: no buttons on the art, and posting asks you to log in", async () => {
    gallery();
    const { wrapper } = await mountAt("/galleries/g1");
    expect(buttons(wrapper, "p1")).toEqual([]);
    expect(wrapper.find('a[href="/auth"]').text()).toBe("post here");
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

  test("upvoting fills the button in and it then offers to unvote", async () => {
    signedInAs("sasha");
    const api = gallery({
      "/posts/vote": ({ post }) => (votes.push(post), {}),
      "/posts/unvote": ({ post }) => ((votes = votes.filter((v) => v !== post)), {}),
    });
    const { wrapper } = await mountAt("/galleries/g1");
    await click(wrapper, "p1", "upvote");
    expect(api.called("/posts/vote")).toEqual([{ post: "p1" }]);
    const button = wrapper.find("#post-p1 button");
    expect([button.text(), button.classes()]).toEqual(["unvote", ["voted"]]);
    await click(wrapper, "p1", "unvote");
    expect(api.called("/posts/unvote")).toEqual([{ post: "p1" }]);
    expect(wrapper.find("#post-p1 button").text()).toBe("upvote");
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
    expect(buttons(wrapper, "p2")).toEqual(["upvote", "remove from gallery"]);
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
    await click(wrapper, "p2", "upvote");
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
    await click(wrapper, "p1", "upvote");
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

  test("a new season says when it started", async () => {
    season(5 * MINUTE, HOUR);
    expect((await notice()).find(".season-notice").text()).toBe("new season · started 5 min ago");
  });

  test("a season ending soon counts down", async () => {
    season(HOUR, 5 * MINUTE);
    expect((await notice()).find(".season-notice").text()).toBe("ending soon · 5 min left to post and vote");
  });

  test("mid-season there is no notice, and the last season is marked final", async () => {
    season(HOUR / 2, HOUR / 2, { run: 2, runs: 3 });
    const wrapper = await notice();
    expect(wrapper.find(".season-notice").exists()).toBe(false);
    expect(wrapper.find(".meta").text()).toContain("season 3 of 3 · final season");
  });

  test("when the season ends with the page open, it points to the archive and votes are final", async () => {
    signedInAs("sasha");
    const api = season(HOUR, MINUTE / 2);
    const wrapper = await notice();
    expect(wrapper.find(".season-notice").text()).toContain("less than a minute left");
    vi.advanceTimersByTime(MINUTE);
    await flushPromises();
    expect(wrapper.find(".season-notice").text()).toBe("this season just ended. see it in the archive");
    expect(wrapper.find('.season-notice a').attributes("href")).toBe("/archive/g1/0");
    expect(wrapper.text()).not.toContain("post here");
    await wrapper.find("#post-p1 button").trigger("click");
    await flushPromises();
    expect(wrapper.find("#post-p1 [role=alert]").text()).toBe("this season is over, so its votes are final.");
    expect(api.called("/groups/feed")).toHaveLength(1); // the wall stays as it was
  });
});

describe("future galleries", () => {
  const roundEnd = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const nomination = (id: string, name: string, nominator: string) => ({ nomination: id, name, nominator, votes: 0, createdAt: new Date().toISOString() });
  const page = (handlers: Record<string, (input: any) => unknown>, end: string | null = roundEnd()) =>
    fakeApi({
      "/nominations/categories": () => ({ list: { categories: [{ category: "k", name: "Future galleries", run: end ? 0 : null, runStart: null, runEnd: end }] } }),
      "/nominations/list": () => ({ ranking: { nominations: [nomination("n1", "Night Walks", "gigi")] } }),
      "/nominations/my-votes": () => ({ votes: { nominations: [] } }),
      ...handlers,
    });
  const nominate = async (wrapper: any, name: string) => {
    await wrapper.find("form input").setValue(name);
    await wrapper.find("form").trigger("submit");
    await flushPromises();
  };

  test("counts down to the round's close", async () => {
    page({});
    const { wrapper } = await mountAt("/nominations");
    expect(wrapper.find(".season-notice").text()).toBe("nominations close in 3h");
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
    await wrapper.findAll("li button").find((b) => b.text() === "Upvote")!.trigger("click");
    await flushPromises();
    expect(wrapper.find("li [role=alert]").text()).toBe("this round is over, so its votes are final.");
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
    const [hands, feet] = wrapper.findAll("ol li");
    expect(hands!.find(".chosen").text()).toBe("Hands");
    expect(hands!.text()).toContain("chosen to become a gallery");
    expect(hands!.text()).not.toContain("Withdraw");
    expect(feet!.text()).toContain("Withdraw");
  });

  test("my nominations says which were chosen instead of offering to withdraw them", async () => {
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
    const rows = wrapper.findAll(".rows li");
    expect(rows[0]!.text()).toContain("chosen to become a gallery");
    expect(rows[0]!.text()).not.toContain("withdraw");
    expect(rows[1]!.text()).toContain("withdraw");
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

