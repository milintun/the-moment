import { beforeEach, describe, expect, test } from "bun:test";
import { NoSuchPost, NotOwner, PostingConcept } from "../../src/concepts/Posting.ts";
import { HOUR, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("posting");
let posting: PostingConcept;
beforeEach(() => {
  posting = new PostingConcept(db());
});

const captionOf = async (post: string) => (await posting._get({ post }))[0]?.caption;

describe("principle", () => {
  test("an author creates a post and can delete it", async () => {
    const { post } = await posting.create({
      owner: "gigi",
      content: "https://img/hands.png",
      caption: "My grandma's hands",
      createdAt: T0,
    });
    expect(await posting._get({ post })).toEqual([
      { owner: "gigi", content: "https://img/hands.png", caption: "My grandma's hands", createdAt: T0 },
    ]);
    expect(await posting.delete({ user: "gigi", post })).toEqual({ content: "https://img/hands.png" });
    expect(await posting._get({ post })).toEqual([]);
  });
});

describe("create", () => {
  test("two posts get different identities", async () => {
    const first = await posting.create({ owner: "gigi", content: "a", caption: "", createdAt: T0 });
    const second = await posting.create({ owner: "gigi", content: "a", caption: "", createdAt: T0 });
    expect(first.post).not.toBe(second.post);
  });

  test("stores createdAt exactly as given", async () => {
    const { post } = await posting.create({ owner: "sid", content: "b", caption: "", createdAt: at(5 * HOUR) });
    expect((await posting._get({ post }))[0]?.createdAt).toEqual(at(5 * HOUR));
  });

  test("a post without a caption has an empty one", async () => {
    const { post } = await posting.create({ owner: "sid", content: "b", caption: "", createdAt: T0 });
    expect(await captionOf(post)).toBe("");
  });

  test("a caption of only spaces means no caption", async () => {
    const { post } = await posting.create({ owner: "sid", content: "b", caption: "   \n\t ", createdAt: T0 });
    expect(await captionOf(post)).toBe("");
  });

  test("a caption is trimmed of outer spaces but keeps its inner ones", async () => {
    const { post } = await posting.create({ owner: "sid", content: "b", caption: "  rainy  day  ", createdAt: T0 });
    expect(await captionOf(post)).toBe("rainy  day");
  });
});

describe("delete", () => {
  test("refuses NOT_OWNER and the post still exists", async () => {
    const { post } = await posting.create({ owner: "gigi", content: "c", caption: "", createdAt: T0 });
    await expect(posting.delete({ user: "sid", post })).rejects.toBeInstanceOf(NotOwner);
    expect(await posting._get({ post })).toHaveLength(1);
  });

  test("refuses NO_SUCH_POST for an unknown post", async () => {
    await expect(posting.delete({ user: "gigi", post: "unknown" })).rejects.toBeInstanceOf(NoSuchPost);
  });

  test("refuses NO_SUCH_POST when deleting twice", async () => {
    const { post } = await posting.create({ owner: "gigi", content: "d", caption: "", createdAt: T0 });
    await posting.delete({ user: "gigi", post });
    await expect(posting.delete({ user: "gigi", post })).rejects.toBeInstanceOf(NoSuchPost);
  });
});

describe("queries", () => {
  test("_get answers no row for an unknown post", async () => {
    expect(await posting._get({ post: "unknown" })).toEqual([]);
  });

  test("_byOwner lists only that owner's posts, newest first", async () => {
    const first = await posting.create({ owner: "gigi", content: "a", caption: "one", createdAt: T0 });
    await posting.create({ owner: "sid", content: "b", caption: "", createdAt: at(HOUR) });
    const second = await posting.create({ owner: "gigi", content: "c", caption: "", createdAt: at(2 * HOUR) });
    expect(await posting._byOwner({ owner: "gigi" })).toEqual([
      { post: second.post, content: "c", caption: "", createdAt: at(2 * HOUR) },
      { post: first.post, content: "a", caption: "one", createdAt: T0 },
    ]);
  });

  test("_byOwner is empty for someone with no posts", async () => {
    expect(await posting._byOwner({ owner: "sasha" })).toEqual([]);
  });

  test("_get gives an empty caption for a post stored before captions existed", async () => {
    await db().collection("posting.posts").insertOne({ _id: "old" as never, owner: "gigi", content: "x", createdAt: T0 });
    expect(await posting._get({ post: "old" })).toEqual([{ owner: "gigi", content: "x", caption: "", createdAt: T0 }]);
  });
});
