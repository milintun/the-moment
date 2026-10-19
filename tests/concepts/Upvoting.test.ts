import { beforeEach, describe, expect, test } from "bun:test";
import { AlreadyVoted, NotVoted, UpvotingConcept } from "../../src/concepts/Upvoting.ts";
import { useTestDb } from "../helpers.ts";

const db = useTestDb("upvoting");
let upvoting: UpvotingConcept;
beforeEach(() => {
  upvoting = new UpvotingConcept(db());
});

const count = async (target: string) => (await upvoting._count({ target })).votes;
const voted = async (voter: string, target: string) => (await upvoting._voted({ voter, target })).voted;

describe("principle", () => {
  test("voters upvote, items rank by votes, and a vote can be taken back", async () => {
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    await upvoting.upvote({ voter: "sid", target: "p1" });
    await upvoting.upvote({ voter: "gigi", target: "p2" });
    expect(await upvoting._counts()).toEqual([
      { target: "p1", votes: 2 },
      { target: "p2", votes: 1 },
    ]);
    await upvoting.unvote({ voter: "gigi", target: "p1" });
    expect(await count("p1")).toBe(1);
  });
});

describe("upvote", () => {
  test("records a vote", async () => {
    expect(await upvoting.upvote({ voter: "gigi", target: "p1" })).toEqual({});
    expect(await voted("gigi", "p1")).toBe(true);
  });

  test("refuses ALREADY_VOTED and the count stays at one", async () => {
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    await expect(upvoting.upvote({ voter: "gigi", target: "p1" })).rejects.toBeInstanceOf(AlreadyVoted);
    expect(await count("p1")).toBe(1);
  });
});

describe("unvote", () => {
  test("removes the vote", async () => {
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    expect(await upvoting.unvote({ voter: "gigi", target: "p1" })).toEqual({});
    expect(await voted("gigi", "p1")).toBe(false);
  });

  test("refuses NOT_VOTED with no vote and after unvoting, leaving counts unchanged", async () => {
    await upvoting.upvote({ voter: "sid", target: "p1" });
    await expect(upvoting.unvote({ voter: "gigi", target: "p1" })).rejects.toBeInstanceOf(NotVoted);
    expect(await count("p1")).toBe(1);
    await upvoting.unvote({ voter: "sid", target: "p1" });
    await expect(upvoting.unvote({ voter: "sid", target: "p1" })).rejects.toBeInstanceOf(NotVoted);
    expect(await count("p1")).toBe(0);
  });

  test("upvoting again after unvoting works", async () => {
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    await upvoting.unvote({ voter: "gigi", target: "p1" });
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    expect(await count("p1")).toBe(1);
  });
});

describe("clear", () => {
  test("deletes every vote for the target and leaves other targets alone", async () => {
    await upvoting.upvote({ voter: "gigi", target: "p1" });
    await upvoting.upvote({ voter: "sid", target: "p1" });
    await upvoting.upvote({ voter: "gigi", target: "p2" });
    expect(await upvoting.clear({ target: "p1" })).toEqual({});
    expect(await count("p1")).toBe(0);
    expect(await count("p2")).toBe(1);
  });

  test("succeeds when the target has no votes", async () => {
    expect(await upvoting.clear({ target: "p1" })).toEqual({});
  });
});

describe("scenarios", () => {
  test("instances on different collections do not share votes", async () => {
    const nominationVotes = new UpvotingConcept(db(), "nominationvotes.votes");
    await upvoting.upvote({ voter: "gigi", target: "x" });
    expect(await nominationVotes._count({ target: "x" })).toEqual({ votes: 0 });
    await nominationVotes.upvote({ voter: "gigi", target: "x" }); // not a duplicate here
    expect(await count("x")).toBe(1);
  });
});

describe("queries", () => {
  test("_count is 0 for an item with no votes", async () => {
    expect(await upvoting._count({ target: "nothing" })).toEqual({ votes: 0 });
  });

  test("_counts breaks ties by target and leaves out items with no votes", async () => {
    await upvoting.upvote({ voter: "gigi", target: "b" });
    await upvoting.upvote({ voter: "gigi", target: "a" });
    await upvoting.upvote({ voter: "gigi", target: "c" });
    await upvoting.unvote({ voter: "gigi", target: "c" });
    expect(await upvoting._counts()).toEqual([
      { target: "a", votes: 1 },
      { target: "b", votes: 1 },
    ]);
  });
});
