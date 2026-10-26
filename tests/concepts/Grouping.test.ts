import { beforeEach, describe, expect, test } from "bun:test";
import {
  AlreadyInGroup,
  GroupingConcept,
  DuplicateName,
  InvalidName,
  NoNames,
  NoSuchGroup,
  NotInGroup,
} from "../../src/concepts/Grouping.ts";
import { HOUR, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("grouping");
let grouping: GroupingConcept;
beforeEach(() => {
  grouping = new GroupingConcept(db());
});

const items = async (group: string) => (await grouping._items({ group })).map(({ item }) => item);

describe("principle", () => {
  test("a named group holds items until it is deleted, without touching its items elsewhere", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    const { group: other } = await grouping.create({ name: "Figure Drawing", createdAt: T0 });
    await grouping.addItem({ group, item: "p1", addedAt: T0 });
    await grouping.addItem({ group, item: "p2", addedAt: T0 });
    await grouping.addItem({ group: other, item: "p2", addedAt: T0 });
    expect(await items(group)).toEqual(["p2", "p1"]);
    await grouping.removeItem({ group, item: "p1" });
    expect(await items(group)).toEqual(["p2"]);
    expect(await grouping.delete({ group })).toEqual({});
    expect(await items(group)).toEqual([]);
    expect(await items(other)).toEqual(["p2"]);
    expect(await grouping._groupsOf({ item: "p2" })).toEqual([{ group: other }]);
  });
});

describe("create", () => {
  test("two groups may share a name", async () => {
    const { group: first } = await grouping.create({ name: "Doodles", createdAt: T0 });
    const { group: second } = await grouping.create({ name: "Doodles", createdAt: at(HOUR) });
    expect(await grouping._byName({ name: "Doodles" })).toEqual([{ group: first }, { group: second }]);
  });
});

describe("createMany", () => {
  test("makes a group per name, in order, even names an older group already has", async () => {
    await grouping.create({ name: "Doodles", createdAt: T0 });
    const { groups } = await grouping.createMany({ names: ["Night Walks", "Doodles"], createdAt: at(HOUR) });
    expect(await Promise.all(groups.map((group) => grouping._get({ group })))).toEqual([[{ name: "Night Walks" }], [{ name: "Doodles" }]]);
  });

  test("refuses NO_NAMES, INVALID_NAME, and DUPLICATE_NAME (ignoring case and spacing), making nothing", async () => {
    await expect(grouping.createMany({ names: [], createdAt: T0 })).rejects.toBeInstanceOf(NoNames);
    await expect(grouping.createMany({ names: ["A", "  "], createdAt: T0 })).rejects.toBeInstanceOf(InvalidName);
    await expect(grouping.createMany({ names: ["Night Walks", " night   WALKS"], createdAt: T0 })).rejects.toBeInstanceOf(
      DuplicateName,
    );
    expect(await grouping._groups({})).toEqual([]);
  });
});

describe("delete", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.delete({ group: "unknown" })).rejects.toBeInstanceOf(NoSuchGroup);
  });
});

describe("addItem", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.addItem({ group: "unknown", item: "p1", addedAt: T0 })).rejects.toBeInstanceOf(NoSuchGroup);
  });

  test("refuses ALREADY_IN_GROUP and the items are unchanged", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    await grouping.addItem({ group, item: "p1", addedAt: T0 });
    await expect(grouping.addItem({ group, item: "p1", addedAt: T0 })).rejects.toBeInstanceOf(AlreadyInGroup);
    expect(await items(group)).toEqual(["p1"]);
  });
});

describe("removeItem", () => {
  test("refuses NO_SUCH_GROUP", async () => {
    await expect(grouping.removeItem({ group: "unknown", item: "p1" })).rejects.toBeInstanceOf(NoSuchGroup);
  });

  test("refuses NOT_IN_GROUP and the items are unchanged", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    await grouping.addItem({ group, item: "p1", addedAt: T0 });
    await expect(grouping.removeItem({ group, item: "p2" })).rejects.toBeInstanceOf(NotInGroup);
    expect(await items(group)).toEqual(["p1"]);
  });
});

describe("queries", () => {
  test("_groups lists the oldest first, then by name", async () => {
    await grouping.create({ name: "Zines", createdAt: at(2 * HOUR) });
    await grouping.create({ name: "Wings", createdAt: T0 });
    await grouping.create({ name: "Doodles", createdAt: T0 });
    expect((await grouping._groups({})).map((g) => g.name)).toEqual(["Doodles", "Wings", "Zines"]);
  });

  test("_get gives the name, or no row for an unknown group", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    expect(await grouping._get({ group })).toEqual([{ name: "Doodles" }]);
    expect(await grouping._get({ group: "unknown" })).toEqual([]);
  });

  test("_items lists the most recently added first, and nothing for an unknown group", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    for (const [i, item] of ["p1", "p2", "p3"].entries()) await grouping.addItem({ group, item, addedAt: at(i * HOUR) });
    expect(await items(group)).toEqual(["p3", "p2", "p1"]);
    expect(await items("unknown")).toEqual([]);
  });

  test("_groupsOf lists every group holding the item, ordered by group", async () => {
    const a = (await grouping.create({ name: "A", createdAt: T0 })).group;
    const b = (await grouping.create({ name: "B", createdAt: T0 })).group;
    await grouping.create({ name: "C", createdAt: T0 });
    await grouping.addItem({ group: a, item: "p1", addedAt: T0 });
    await grouping.addItem({ group: b, item: "p1", addedAt: T0 });
    expect(await grouping._groupsOf({ item: "p1" })).toEqual([a, b].sort().map((group) => ({ group })));
    expect(await grouping._groupsOf({ item: "p9" })).toEqual([]);
  });

  test("_byName finds the group, or no row for an unknown name", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    expect(await grouping._byName({ name: "Doodles" })).toEqual([{ group }]);
    expect(await grouping._byName({ name: "Nope" })).toEqual([]);
  });

  test("_nameAmong answers the group's name when it matches one of the names, ignoring case and spacing", async () => {
    const { group } = await grouping.create({ name: "Night Walks", createdAt: T0 });
    expect(await grouping._nameAmong({ group, names: ["Doodles", " night   WALKS "] })).toEqual([{ name: "Night Walks" }]);
    expect(await grouping._nameAmong({ group, names: ["Doodles"] })).toEqual([]);
    expect(await grouping._nameAmong({ group: "unknown", names: ["Night Walks"] })).toEqual([]);
  });

  test("deleteMany deletes the given groups and their memberships, skipping unknown ones", async () => {
    const { groups } = await grouping.createMany({ names: ["A", "B", "C"], createdAt: T0 });
    await grouping.addItem({ group: groups[0]!, item: "p1", addedAt: T0 });
    expect(await grouping.deleteMany({ groups: [groups[0]!, groups[1]!, "unknown"] })).toEqual({});
    expect((await grouping._groups({})).map((g) => g.name)).toEqual(["C"]);
    expect(await grouping._groupsOf({ item: "p1" })).toEqual([]);
  });

  test("_page answers a window of _groups, and nothing for a bad window", async () => {
    for (const [i, name] of ["A", "B", "C", "D", "E"].entries()) await grouping.create({ name, createdAt: at(i * HOUR) });
    const names = async (offset: number, limit: number) => (await grouping._page({ offset, limit })).map((g) => g.name);
    expect(await names(0, 2)).toEqual(["A", "B"]);
    expect(await names(2, 2)).toEqual(["C", "D"]);
    expect(await names(4, 2)).toEqual(["E"]);
    expect(await names(5, 2)).toEqual([]);
    expect(await names(-1, 2)).toEqual([]);
    expect(await names(0, 0)).toEqual([]);
    expect(await names(0.5, 2)).toEqual([]);
  });

  test("_itemsAdded lists items added at or after from and before to, newest first", async () => {
    const { group } = await grouping.create({ name: "Doodles", createdAt: T0 });
    for (const [i, item] of ["p0", "p1", "p2", "p3"].entries()) await grouping.addItem({ group, item, addedAt: at(i * HOUR) });
    expect(await grouping._itemsAdded({ group, from: at(HOUR), to: at(3 * HOUR) })).toEqual([
      { item: "p2", addedAt: at(2 * HOUR) },
      { item: "p1", addedAt: at(HOUR) },
    ]);
    expect(await grouping._itemsAdded({ group: "unknown", from: T0, to: at(9 * HOUR) })).toEqual([]);
  });
});
