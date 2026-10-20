import type { Db } from "mongodb";
import { NameTaken, NominatingConcept } from "./concepts/Nominating.ts";

/** The application's one nomination category. It is created at startup and never changes. */
export const FUTURE_GALLERIES = "Future galleries";

/** Creates the Future galleries category if it doesn't exist yet; harmless to call every start. */
export async function ensureFutureGalleries(db: Db): Promise<void> {
  try {
    await new NominatingConcept(db).createCategory({ name: FUTURE_GALLERIES });
  } catch (error) {
    if (!(error instanceof NameTaken)) throw error;
  }
}
