import { MongoServerError, type Collection, type Db } from "mongodb";
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

export class InvalidUsername extends Error {}
export class InvalidPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}



interface Account {
  username: string; // unique
  salt: string;
  verifier: string
}

function verifier(password: string, salt: string): Buffer {
  return pbkdf2Sync(password, salt, 10_000, 32, "sha256");
}


export class AuthenticatingConcept {
    private readonly accounts: Collection<Account>;
    private indexed = false;

    constructor(db: Db) {
        this.accounts = db.collection<Account>("authenticating.accounts");
    }

    async register({username, password}: {username: string, password: string}) {
        // Create index for accounts if one doesn't exist yet
        if (!this.indexed) {
            // The unique index stops a username from being registered twice.
            await this.accounts.createIndex({ username: 1 }, { unique: true });
            this.indexed = true;
        }
        // Invalid username
        if (username.length > 32 || username.length < 3) {
            throw new InvalidUsername("A username must contain 3 to 32 characters.");
        }
        // Invalid password
        if (password.length > 128 || password.length < 8) {
            throw new InvalidPassword("A password must contain 8 to 128 characters.");
        }

        const account = username;
        try {
            // insert account 
            const salt =  crypto.randomUUID();
            await this.accounts.insertOne({ username: account, salt: salt, verifier: verifier(password, salt).toString("hex") });
            } catch (error) {
            // 11000 = duplicate row = account alr exists
            if (error instanceof MongoServerError && error.code === 11000) {
                throw new UsernameTaken("That username is already registered.");
            }
            throw error;
        }
        return { account };

    }

    async authenticate({username, password}: {username: string, password: string}) {
        const account = await (this.accounts.findOne({ username }));
        if (account !== null) {
            const supplied = verifier(password, account.salt);   // Buffer, 32 bytes
            if (timingSafeEqual(Buffer.from(account.verifier, "hex"), supplied)) return { account: username };
        }

        // Account doesn't exist or wrong password 
        throw new InvalidCredentials("The username or password is incorrect.");
    }

    async _registered({username}: {username: string}): Promise<{ registered: boolean }> {
        return {registered: (await this.accounts.findOne({ username })) !== null}
    }
}