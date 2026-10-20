import { describe, expect, test } from "bun:test";
import { NominatingConcept } from "../src/concepts/Nominating.ts";
import { FUTURE_GALLERIES, ensureFutureGalleries } from "../src/nominations.ts";
import { useTestDb } from "./helpers.ts";

const db = useTestDb("future_galleries");

describe("ensureFutureGalleries (run at every server start)", () => {
  test("creates the one Future galleries category", async () => {
    await ensureFutureGalleries(db());
    expect((await new NominatingConcept(db())._categories({})).map((c) => c.name)).toEqual([FUTURE_GALLERIES]);
  });

  test("never creates a second one, so restarting changes nothing", async () => {
    await ensureFutureGalleries(db());
    const [first] = await new NominatingConcept(db())._categories({});
    await ensureFutureGalleries(db());
    expect(await new NominatingConcept(db())._categories({})).toEqual([first!]);
  });
});
