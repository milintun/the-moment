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

describe("admin", () => {
  test("a refused action shows its message in its own section", async () => {
    signedInAs("milin", true);
    fakeApi({
      "/admin/admins/list": () => ({ list: { admins: [{ user: "milin", owner: true }] } }),
      "/groups/list": () => ({ list: { groups: [] } }),
      "/nominations/categories": () => ({ list: { categories: [] } }),
      "/admin/cycles/list": () => ({ list: { cycles: [] } }),
      "/admin/groups/create": () => ({ error: "CONFLICT" }),
    });
    const { wrapper } = await mountAt("/home/admin");
    const form = wrapper.findAll("form").find((f) => f.text().includes("Create") && f.find("select").exists())!;
    await form.find("input").setValue("Doodles");
    await form.trigger("submit");
    await flushPromises();
    expect(form.find("[role=alert]").text()).toBe("a gallery with that name already exists.");
    expect(wrapper.findAll("[role=alert]")).toHaveLength(1);
  });
});

describe("archive", () => {
  const HOUR = 60 * 60 * 1000;
  const past = new Date(Date.now() - 10 * HOUR).toISOString();
  // n galleries; the even ones have one finished season, the odd ones have no cycle.
  const galleries = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      i % 2 === 0
        ? { group: `g${i}`, name: `Gallery ${i}`, cycle: "c", start: past, period: HOUR, runs: 1 }
        : { group: `g${i}`, name: `Gallery ${i}`, cycle: null, start: null, period: null, runs: null },
    );
  const archiveOf = (all: ReturnType<typeof galleries>) =>
    fakeApi({ "/archive/galleries": ({ offset, limit }) => ({ page: { groups: all.slice(offset, offset + limit) } }) });

  test("lists galleries with finished seasons, a page at a time, until there are no more", async () => {
    const api = archiveOf(galleries(30));
    const { wrapper } = await mountAt("/archive");
    expect(api.called("/archive/galleries")).toEqual([{ offset: 0, limit: 20 }]);
    expect(wrapper.findAll(".room")).toHaveLength(10);
    expect(wrapper.find(".room a").attributes("href")).toBe("/archive/g0");
    await wrapper.findAll("button").find((b) => b.text() === "load more galleries")!.trigger("click");
    await flushPromises();
    expect(api.called("/archive/galleries")[1]).toEqual({ offset: 20, limit: 20 });
    expect(wrapper.findAll(".room")).toHaveLength(15);
    expect(wrapper.text()).not.toContain("load more galleries");
  });

  test("says when nothing has been archived", async () => {
    archiveOf(galleries(0));
    const { wrapper } = await mountAt("/archive");
    expect(wrapper.text()).toContain("nothing has been archived yet.");
  });
});
