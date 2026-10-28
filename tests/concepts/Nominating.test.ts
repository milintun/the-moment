import { beforeEach, describe, expect, test } from "bun:test";
import {
  Chosen,
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
  test("ideas are named once a day, matched by meaning, listed newest first, withdrawn (freeing the day), and chosen", async () => {
    const { nomination: hands } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    expect(await nominating._nominations({ category })).toEqual([
      { nomination: hands, nominator: "gigi", name: "Hands", createdAt: T0, chosen: false },
    ]);
    expect(await nominating._equivalent({ category, name: " hands " })).toEqual([{ nomination: hands, createdAt: T0 }]);
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(2 * HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
    const { nomination: rain } = await nominating.nominate({ nominator: "sid", category, name: "Rainy days", createdAt: at(HOUR) });
    expect(await names()).toEqual(["Rainy days", "Hands"]);
    await nominating.withdraw({ nominator: "gigi", nomination: hands });
    expect(await names()).toEqual(["Rainy days"]);
    // Withdrawing gave the day back: Gigi nominates something else straight away.
    await nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(3 * HOUR) });
    expect(await names()).toEqual(["Feet", "Rainy days"]);
    await nominating.choose({ nominations: [rain], chosenAt: at(DAY) });
    expect((await nominating._nominations({ category })).find((n) => n.nomination === rain)?.chosen).toBe(true);
    await expect(nominating.withdraw({ nominator: "sid", nomination: rain })).rejects.toBeInstanceOf(Chosen);
    await expect(nominating.choose({ nominations: [rain], chosenAt: at(DAY) })).rejects.toBeInstanceOf(Chosen);
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

  test("refuses INVALID_NAME for a blank name or one over 40 characters, creating nothing, not even a used-up day", async () => {
    await expect(nominating.nominate({ nominator: "gigi", category, name: "   ", createdAt: T0 })).rejects.toBeInstanceOf(
      InvalidName,
    );
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "x".repeat(41), createdAt: T0 }),
    ).rejects.toBeInstanceOf(InvalidName);
    expect(await names()).toEqual([]);
    await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    // Exactly 40, with spaces around it trimmed, is fine.
    await nominating.nominate({ nominator: "sid", category, name: ` ${"y".repeat(40)} `, createdAt: T0 });
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

  test("withdrawing gives back the day it used, so another idea can follow straight away", async () => {
    const { nomination } = await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    expect(await nominating.withdraw({ nominator: "gigi", nomination })).toEqual({});
    const { nomination: feet } = await nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(HOUR) });
    // That one used the day again.
    await expect(
      nominating.nominate({ nominator: "gigi", category, name: "Toes", createdAt: at(2 * HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
    expect((await nominating._nominations({ category })).map((n) => n.nomination)).toEqual([feet]);
  });

  test("withdrawing goes back to the nomination before it, not further", async () => {
    await nominating.nominate({ nominator: "gigi", category, name: "Hands", createdAt: T0 });
    const { nomination: feet } = await nominating.nominate({ nominator: "gigi", category, name: "Feet", createdAt: at(DAY + HOUR) });
    await nominating.withdraw({ nominator: "gigi", nomination: feet });
    // Hands, a day and an hour before, is the last one now: the day is free.
    await nominating.nominate({ nominator: "gigi", category, name: "Toes", createdAt: at(DAY + 2 * HOUR) });
    const { nomination: rain } = await nominating.nominate({ nominator: "sid", category, name: "Rain", createdAt: at(DAY + HOUR) });
    await nominating.nominate({ nominator: "sid", category, name: "Mud", createdAt: at(2 * DAY + 2 * HOUR) });
    await nominating.withdraw({ nominator: "sid", nomination: rain });
    // Mud, an hour ago, is Sid's last one: still too soon.
    await expect(
      nominating.nominate({ nominator: "sid", category, name: "Snow", createdAt: at(2 * DAY + 3 * HOUR) }),
    ).rejects.toBeInstanceOf(TooSoon);
  });
});

describe("choose", () => {
  test("marks every listed nomination chosen, and a chosen one can't be withdrawn", async () => {
    const { nomination: a } = await nominating.nominate({ nominator: "gigi", category, name: "A", createdAt: T0 });
    const { nomination: b } = await nominating.nominate({ nominator: "sid", category, name: "B", createdAt: T0 });
    expect(await nominating.choose({ nominations: [a, b], chosenAt: at(HOUR) })).toEqual({});
    expect((await nominating._nominations({ category })).map((n) => n.chosen)).toEqual([true, true]);
    expect((await nominating._get({ nomination: a }))[0]?.chosen).toBe(true);
    await expect(nominating.withdraw({ nominator: "gigi", nomination: a })).rejects.toBeInstanceOf(Chosen);
  });

  test("refuses NO_SUCH_NOMINATION and CHOSEN (already chosen, or listed twice), choosing none", async () => {
    const { nomination: a } = await nominating.nominate({ nominator: "gigi", category, name: "A", createdAt: T0 });
    const { nomination: b } = await nominating.nominate({ nominator: "sid", category, name: "B", createdAt: T0 });
    await expect(nominating.choose({ nominations: [a, "unknown"], chosenAt: T0 })).rejects.toBeInstanceOf(NoSuchNomination);
    await expect(nominating.choose({ nominations: [a, a], chosenAt: T0 })).rejects.toBeInstanceOf(Chosen);
    await nominating.choose({ nominations: [b], chosenAt: T0 });
    await expect(nominating.choose({ nominations: [a, b], chosenAt: T0 })).rejects.toBeInstanceOf(Chosen);
    expect((await nominating._get({ nomination: a }))[0]?.chosen).toBe(false);
  });

  test("_unavailable answers the ones that are missing, chosen, or repeated", async () => {
    const { nomination: a } = await nominating.nominate({ nominator: "gigi", category, name: "A", createdAt: T0 });
    const { nomination: b } = await nominating.nominate({ nominator: "sid", category, name: "B", createdAt: T0 });
    const { nomination: c } = await nominating.nominate({ nominator: "sasha", category, name: "C", createdAt: T0 });
    await nominating.choose({ nominations: [b], chosenAt: T0 });
    expect(await nominating._unavailable({ nominations: [a, c] })).toEqual([]);
    expect(await nominating._unavailable({ nominations: [] })).toEqual([]);
    expect(await nominating._unavailable({ nominations: [a, b, "gone", c, c] })).toEqual([
      { nomination: b },
      { nomination: "gone" },
      { nomination: c },
    ]);
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
      { nomination: c, category: other, name: "C", createdAt: at(DAY), chosen: false },
      { nomination: a, category, name: "A", createdAt: T0, chosen: false },
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
