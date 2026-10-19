import { beforeEach, describe, expect, test } from "bun:test";
import {
  AlreadyInGroup,
  GroupingConcept,
  NameTaken,
  NoSuchGroup,
  NotInGroup,
} from "../../src/concepts/Grouping.ts";
import { useTestDb } from "../helpers.ts";

const db = useTestDb("grouping");
let grouping: GroupingConcept;
beforeEach(() => {
  grouping = new GroupingConcept(db());
});

const items = async (group: string) => (await grouping._items({ group })).map(({ item }) => item);

describe("principle", () => {
  test("a named group holds items until it is deleted, without touching its items elsewhere", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    const { group: other } = await grouping.create({ name: "Figure Drawing" });
    await grouping.addItem({ group, item: "p1" });
    await grouping.addItem({ group, item: "p2" });
    await grouping.addItem({ group: other, item: "p2" });
    expect(await items(group)).toEqual(["p2", "p1"]);
    await grouping.removeItem({ group, item: "p1" });
    expect(await items(group)).toEqual(["p2"]);
    expect(await grouping.delete({ group })).toEqual({});
    expect(await items(group)).toEqual([]);
    expect(await items(other)).toEqual(["p2"]);
  });
});

describe("create", () => {
  test("refuses NAME_TAKEN and there is still one group with that name", async () => {
    await grouping.create({ name: "Doodles" });
    await expect(grouping.create({ name: "Doodles" })).rejects.toBeInstanceOf(NameTaken);
    expect((await grouping._groups({})).filter((g) => g.name === "Doodles")).toHaveLength(1);
  });
});

describe("delete", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.delete({ group: "unknown" })).rejects.toBeInstanceOf(NoSuchGroup);
  });
});

describe("addItem", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.addItem({ group: "unknown", item: "p1" })).rejects.toBeInstanceOf(NoSuchGroup);
  });

  test("refuses ALREADY_IN_GROUP and the items are unchanged", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    await grouping.addItem({ group, item: "p1" });
    await expect(grouping.addItem({ group, item: "p1" })).rejects.toBeInstanceOf(AlreadyInGroup);
    expect(await items(group)).toEqual(["p1"]);
  });
});

describe("removeItem", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.removeItem({ group: "unknown", item: "p1" })).rejects.toBeInstanceOf(NoSuchGroup);
  });

  test("refuses NOT_IN_GROUP and the items are unchanged", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    await grouping.addItem({ group, item: "p1" });
    await expect(grouping.removeItem({ group, item: "p2" })).rejects.toBeInstanceOf(NotInGroup);
    expect(await items(group)).toEqual(["p1"]);
  });
});

describe("queries", () => {
  test("_groups is ordered by name", async () => {
    await grouping.create({ name: "Wings" });
    await grouping.create({ name: "Doodles" });
    expect((await grouping._groups({})).map((g) => g.name)).toEqual(["Doodles", "Wings"]);
  });

  test("_get gives the name, or no row for an unknown group", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    expect(await grouping._get({ group })).toEqual([{ name: "Doodles" }]);
    expect(await grouping._get({ group: "unknown" })).toEqual([]);
  });

  test("_items lists the most recently added first, and nothing for an unknown group", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    for (const item of ["p1", "p2", "p3"]) await grouping.addItem({ group, item });
    expect(await items(group)).toEqual(["p3", "p2", "p1"]);
    expect(await items("unknown")).toEqual([]);
  });

  test("_groupsOf lists every group holding the item, ordered by group", async () => {
    const a = (await grouping.create({ name: "A" })).group;
    const b = (await grouping.create({ name: "B" })).group;
    await grouping.create({ name: "C" });
    await grouping.addItem({ group: a, item: "p1" });
    await grouping.addItem({ group: b, item: "p1" });
    expect(await grouping._groupsOf({ item: "p1" })).toEqual([a, b].sort().map((group) => ({ group })));
    expect(await grouping._groupsOf({ item: "p9" })).toEqual([]);
  });

  test("_byName finds the group, or no row for an unknown name", async () => {
    const { group } = await grouping.create({ name: "Doodles" });
    expect(await grouping._byName({ name: "Doodles" })).toEqual([{ group }]);
    expect(await grouping._byName({ name: "Nope" })).toEqual([]);
  });
});
