import type { Collection, Db } from "mongodb";

export class UnknownSession extends Error {}

interface Session {
  _id: string; // the session token itself, so it must be unguessable
  subject: string;
  expiresAt: Date;
}

const SESSION_LIFETIME_MS = 30 * 60 * 1000;

export class SessioningConcept {
  private readonly sessions: Collection<Session>;

  constructor(db: Db) {
    this.sessions = db.collection<Session>("sessioning.sessions");
  }

  async start({ subject }: { subject: string }): Promise<{ session: string; expiresAt: Date }> {
    const now = new Date();
    // delete every expired session
    await this.sessions.deleteMany({ expiresAt: { $lte: now } });

    // create new session for this subject expiring SESSION LIFETIME from now
    const session = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    await this.sessions.insertOne({ _id: session, subject, expiresAt });
    return { session, expiresAt };
  }

  async current({ session }: { session: string }): Promise<{ subject: string }> {
    const now = new Date();
    const found = await this.sessions.findOne({ _id: session, expiresAt: { $gt: now } });
    if (found === null) return this.#refuse(session, now);
    return { subject: found.subject };
  }

  async end({ session }: { session: string }): Promise<{ ended: boolean }> {
    const now = new Date();
    // Deleting only an active session in one step means two concurrent ends can't both succeed.
    const { deletedCount } = await this.sessions.deleteOne({ _id: session, expiresAt: { $gt: now } });
    if (deletedCount === 0) return this.#refuse(session, now);
    return { ended: true };
  }

  async _active({ session }: { session: string }): Promise<Array<{ subject: string; expiresAt: Date }>> {
    const found = await this.sessions.findOne({ _id: session, expiresAt: { $gt: new Date() } });
    return found === null ? [] : [{ subject: found.subject, expiresAt: found.expiresAt }];
  }

  // The session is unknown, ended, or expired: delete it if it is expired, then refuse.
  async #refuse(session: string, now: Date): Promise<never> {
    // deletes this session if it exists and is expired 
    await this.sessions.deleteOne({ _id: session, expiresAt: { $lte: now } });
    // if not, throw unknown session
    throw new UnknownSession("This session is not active.");
  }
}
