import { beforeEach, describe, expect, test } from "vitest";
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

  test("a refused action shows its error", async () => {
    signedInAs("milin", true);
    gallery({ "/admin/groups/remove-post": () => ({ error: "NOT_FOUND" }) });
    const { wrapper } = await mountAt("/galleries/g1");
    await click(wrapper, "p2", "remove from gallery");
    await click(wrapper, "p2", "yes, remove");
    expect(wrapper.find(".error").text()).toBe("NOT_FOUND");
    expect(wrapper.find("#post-p2").exists()).toBe(true);
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
