import type { Db } from "mongodb";
import { AdministratingConcept, OwnerExists } from "./concepts/Administrating.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";

export type OwnerResult = "made-owner" | "no-account" | "owner-exists";

/**
 * Makes a registered account the application's owner, once. This is the setup step that
 * happens outside the endpoints: an unregistered name is never made owner, so nobody can
 * claim ownership by registering that name later, and an existing owner is never replaced.
 */
export async function makeOwner(db: Db, username: string): Promise<OwnerResult> {
  const { registered } = await new AuthenticatingConcept(db)._registered({ username });
  if (!registered) return "no-account";
  try {
    await new AdministratingConcept(db).setOwner({ user: username });
    return "made-owner";
  } catch (error) {
    if (error instanceof OwnerExists) return "owner-exists";
    throw error;
  }
}
