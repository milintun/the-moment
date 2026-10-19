import { beforeEach, describe, expect, test } from "bun:test";
import { NoSuchPost, NotOwner, PostingConcept } from "../../src/concepts/Posting.ts";
import { HOUR, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("posting");
let posting: PostingConcept;
beforeEach(() => {
  posting = new PostingConcept(db());
});

describe("principle", () => {
  test("an author creates a post and can delete it", async () => {
    const { post } = await posting.create({ owner: "gigi", content: "https://img/hands.png", createdAt: T0 });
    expect(await posting._get({ post })).toEqual([{ owner: "gigi", content: "https://img/hands.png", createdAt: T0 }]);
    expect(await posting.delete({ user: "gigi", post })).toEqual({});
    expect(await posting._get({ post })).toEqual([]);
  });
});

describe("create", () => {
  test("two posts get different identities", async () => {
    const first = await posting.create({ owner: "gigi", content: "a", createdAt: T0 });
    const second = await posting.create({ owner: "gigi", content: "a", createdAt: T0 });
    expect(first.post).not.toBe(second.post);
  });

  test("stores createdAt exactly as given", async () => {
    const { post } = await posting.create({ owner: "sid", content: "b", createdAt: at(5 * HOUR) });
    expect((await posting._get({ post }))[0]?.createdAt).toEqual(at(5 * HOUR));
  });
});

describe("delete", () => {
  test("refuses NOT_OWNER and the post still exists", async () => {
    const { post } = await posting.create({ owner: "gigi", content: "c", createdAt: T0 });
    await expect(posting.delete({ user: "sid", post })).rejects.toBeInstanceOf(NotOwner);
    expect(await posting._get({ post })).toHaveLength(1);
  });

  test("refuses NO_SUCH_POST for an unknown post", async () => {
    await expect(posting.delete({ user: "gigi", post: "unknown" })).rejects.toBeInstanceOf(NoSuchPost);
  });

  test("refuses NO_SUCH_POST when deleting twice", async () => {
    const { post } = await posting.create({ owner: "gigi", content: "d", createdAt: T0 });
    await posting.delete({ user: "gigi", post });
    await expect(posting.delete({ user: "gigi", post })).rejects.toBeInstanceOf(NoSuchPost);
  });
});

describe("queries", () => {
  test("_get answers no row for an unknown post", async () => {
    expect(await posting._get({ post: "unknown" })).toEqual([]);
  });
});
