import { beforeEach, describe, expect, test } from "bun:test";
import {
  InvalidName,
  NameTaken,
  NominatingConcept,
  NoSuchCategory,
  NoSuchNomination,
  NotNominator,
  TooSoon,
} from "../../src/concepts/Nominating.ts";
import { DAY, HOUR, MINUTE, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("nominating");
let nominating: NominatingConcept;
let category: string;
beforeEach(async () => {
  nominating = new NominatingConcept(db());
  ({ category } = await nominating.createCategory({ name: "Future galleries" }));
});

const names = async (cat = category) => (await nominating._nominations({ category: cat })).map((n) => n.name);

describe("principle", () => {
  test("ideas are named once a day, matched by meaning, listed newest first, and withdrawn", async () => {
    const { nomination: hands } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    expect(await nominating._nominations({ category })).toEqual([
      { nomination: hands, nominator: "gigi", name: "Hands", createdAt: T0 },
    ]);
    expect(await nominating._equivalent({ category, name: " hands " })).toEqual([{ nomination: hands, createdAt: T0 }]);
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(2 * HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
    await nominating.nominate({ nominator: "sid", category, name: "Rainy days", createdAt: at(HOUR) });
    expect(await names()).toEqual(["Rainy days", "Hands"]);
    await nominating.withdraw({ nominator: "gigi", nomination: hands });
    expect(await names()).toEqual(["Rainy days"]);
  });
});

describe("createCategory", () => {
  test("refuses NAME_TAKEN and there is still one category with that name", async () => {
    await expect(nominating.createCategory({ name: "Future galleries" })).rejects.toBeInstanceOf(NameTaken);
    expect(await nominating._categories({})).toEqual([{ category, name: "Future galleries" }]);
  });
});

describe("nominate", () => {
  test("refuses NO_SUCH_CATEGORY", async () => {
    await expect(
      nominating.nominate({ nominator: "gigi", category: "unknown", name: "Hands", createdAt: T0 }),
    ).rejects.toBeInstanceOf(NoSuchCategory);
  });

  test("refuses INVALID_NAME for a blank name and creates nothing, not even a used-up day", async () => {
    await expect(nominating.nominate({ nominator: "gigi", category, name: "   ", createdAt: T0 })).rejects.toBeInstanceOf(
      InvalidName,
    );
    expect(await names()).toEqual([]);
    await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
  });

  test("refuses TOO_SOON within a day, creating nothing and keeping the first nomination's time", async () => {
    await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(DAY - MINUTE) }),
    ).rejects.toBeInstanceOf(TooSoon);
    expect(await names()).toEqual(["Hands"]);
    // still measured from T0, so exactly a day after it is allowed
    await nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(DAY) });
    expect(await names()).toEqual(["Feet", "Hands"]);
  });

  test("the daily limit applies across categories", async () => {
    const { category: other } = await nominating.createCategory({ name: "Future wings" });
    await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    await expect(
      nominating.nominate({ nominator: "gigi", category: other, name: "Oceans", createdAt: at(HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
    expect(await names(other)).toEqual([]);
  });

  test("stores the name as written", async () => {
    const { nomination } = await nominating.nominate({ nominator: "gigi", category, name: "  Rainy  Days ", createdAt: T0 });
    expect((await nominating._get({ nomination }))[0]?.name).toBe("  Rainy  Days ");
  });
});

describe("withdraw", () => {
  test("refuses NO_SUCH_NOMINATION, including withdrawing twice", async () => {
    await expect(nominating.withdraw({ nominator: "gigi", nomination: "unknown" })).rejects.toBeInstanceOf(
      NoSuchNomination,
    );
    const { nomination } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    await nominating.withdraw({ nominator: "gigi", nomination });
    await expect(nominating.withdraw({ nominator: "gigi", nomination })).rejects.toBeInstanceOf(NoSuchNomination);
  });

  test("refuses NOT_NOMINATOR and the nomination is still listed", async () => {
    const { nomination } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    await expect(nominating.withdraw({ nominator: "sid", nomination })).rejects.toBeInstanceOf(NotNominator);
    expect(await names()).toEqual(["Hands"]);
  });

  test("withdrawing does not reset the daily limit", async () => {
    const { nomination } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    expect(await nominating.withdraw({ nominator: "gigi", nomination })).toEqual({});
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: at(HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
  });
});

describe("queries", () => {
  test("_nominations lists newest first, per category", async () => {
    const { category: other } = await nominating.createCategory({ name: "Future wings" });
    await nominating.nominate({ nominator: "gigi", category, name: "A", createdAt: T0 });
    await nominating.nominate({ nominator: "sid", category, name: "B", createdAt: at(HOUR) });
    await nominating.nominate({ nominator: "sasha", category: other, name: "C", createdAt: at(2 * HOUR) });
    expect(await names()).toEqual(["B", "A"]);
    expect(await names(other)).toEqual(["C"]);
  });

  test("_equivalent matches spacing and case variants only, and only in its own category", async () => {
    const { category: other } = await nominating.createCategory({ name: "Future wings" });
    await nominating.nominate({ nominator: "gigi", category, name: "Rainy days", createdAt: T0 });
    await nominating.nominate({ nominator: "sid", category: other, name: "Rainy days", createdAt: T0 });
    expect(await nominating._equivalent({ category, name: "  RAINY   Days " })).toHaveLength(1);
    expect(await nominating._equivalent({ category, name: "Rainy day" })).toEqual([]);
  });

  test("_byNominator lists one person's nominations from every category, newest first", async () => {
    const { category: other } = await nominating.createCategory({ name: "Future wings" });
    const { nomination: a } = await nominating.nominate({ nominator: "gigi", category, name: "A", createdAt: T0 });
    await nominating.nominate({ nominator: "sid", category, name: "B", createdAt: at(HOUR) });
    const { nomination: c } = await nominating.nominate({ nominator: "gigi", category: other, name: "C", createdAt: at(DAY) });
    expect(await nominating._byNominator({ nominator: "gigi" })).toEqual([
      { nomination: c, category: other, name: "C", createdAt: at(DAY) },
      { nomination: a, category, name: "A", createdAt: T0 },
    ]);
    expect(await nominating._byNominator({ nominator: "sasha" })).toEqual([]);
  });

  test("_categories is ordered by name", async () => {
    await nominating.createCategory({ name: "Archive ideas" });
    expect((await nominating._categories({})).map((c) => c.name)).toEqual(["Archive ideas", "Future galleries"]);
  });

  test("_category and _get answer no row when unknown", async () => {
    expect(await nominating._category({ category })).toEqual([{ name: "Future galleries" }]);
    expect(await nominating._category({ category: "unknown" })).toEqual([]);
    expect(await nominating._get({ nomination: "unknown" })).toEqual([]);
  });
});
