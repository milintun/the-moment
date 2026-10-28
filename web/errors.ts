// What to tell people when something is refused. The server only answers five categories
// (INVALID_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT), so each endpoint has its own
// table saying what each category means there. Where an endpoint has two refusals in one
// category, the page passes `ties`, chosen from what it already knows (what was typed, when the
// season ends), and that wins.
import type { TheMomentWireHttp } from "../generated/wire.ts";

type Category = "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
type Messages = Partial<Record<Category, string>>;
type Endpoint = keyof TheMomentWireHttp;

/** Something that went wrong, and where on the page to show it (see ErrorNote). */
export interface Problem {
  at: string;
  message: string;
}

export const SESSION_ENDED = "your session ended. log in again to carry on.";
const NETWORK = "couldn't reach the museum. check your connection and try again.";
const FALLBACK = "something went wrong. try again.";
// The page was out of date (someone changed it meanwhile); callers reload after showing this.
const STALE = "this changed since the page opened, so it's been refreshed.";

const DEFAULTS: Record<Category, string> = {
  INVALID_REQUEST: "that wasn't quite right. check it and try again.",
  UNAUTHORIZED: SESSION_ENDED,
  FORBIDDEN: "you can't do that.",
  NOT_FOUND: STALE,
  CONFLICT: STALE,
};

const ADMIN_ONLY = "only admins can do that.";
const OVERLAP = "a schedule with the same season length and number of seasons already runs during those dates.";

const MESSAGES: Partial<Record<Endpoint, Messages>> = {
  "/auth/register": {
    INVALID_REQUEST: "usernames need 3 to 32 characters, passwords 8 to 128.",
    CONFLICT: "that username is taken.",
  },
  "/auth/sign-in": { UNAUTHORIZED: "wrong username or password." },
  "/uploads/request": { INVALID_REQUEST: "only jpeg, png, webp, svg, and heic images can be posted." },
  "/posts/create": {
    INVALID_REQUEST: "that file isn't an image we can show. try a jpeg or png.",
    NOT_FOUND: "this gallery no longer exists.",
    CONFLICT: "this gallery's season is over, so it isn't taking posts.",
    FORBIDDEN: "that upload isn't yours. choose the image again.",
  },
  "/posts/delete": { NOT_FOUND: "this post was already deleted.", FORBIDDEN: "only the artist can delete this post." },
  "/posts/vote": {
    FORBIDDEN: "you can't vote on your own post.",
    NOT_FOUND: "this post was taken down.",
    CONFLICT: "you already voted for this post.",
  },
  "/posts/unvote": {
    FORBIDDEN: "you can't vote on your own post.",
    NOT_FOUND: "your vote was already taken back.",
    CONFLICT: "this season is over, so its votes are final.",
  },
  "/nominations/create": {
    INVALID_REQUEST: "give your idea a name of at most 40 characters.",
    NOT_FOUND: "nominations aren't set up yet.",
    CONFLICT: "you can nominate once a day.",
  },
  "/nominations/vote": {
    FORBIDDEN: "you can't vote for your own nomination.",
    NOT_FOUND: "this nomination was withdrawn.",
    CONFLICT: "you already voted for this.",
  },
  "/nominations/unvote": {
    FORBIDDEN: "you can't vote for your own nomination.",
    NOT_FOUND: "your vote was already taken back.",
    CONFLICT: "this round is over, so its votes are final.",
  },
  "/nominations/withdraw": {
    FORBIDDEN: "only the person who nominated this can withdraw it.",
    NOT_FOUND: "this nomination was already withdrawn.",
    CONFLICT: "this idea was chosen to become a gallery, so it stays.",
  },
  "/groups/archive": { NOT_FOUND: "this season isn't in the archive." },
  "/admin/groups/remove-post": { FORBIDDEN: ADMIN_ONLY, NOT_FOUND: "this post is already off the wall." },
  "/admin/schedules/list": { FORBIDDEN: ADMIN_ONLY },
  "/admin/schedules/create": {
    FORBIDDEN: ADMIN_ONLY,
    INVALID_REQUEST: "check the schedule: seasons longer than 0, a whole number of them, a start that isn't past, and a name for every gallery.",
    NOT_FOUND: "a picked nomination was chosen or withdrawn meanwhile. the list has been refreshed.",
    CONFLICT: OVERLAP,
  },
  "/admin/schedules/add-galleries": {
    FORBIDDEN: ADMIN_ONLY,
    INVALID_REQUEST: "every gallery needs a name.",
    NOT_FOUND: "a picked nomination was chosen or withdrawn meanwhile. the list has been refreshed.",
    CONFLICT: "this schedule has started, or already has a gallery by one of those names.",
  },
  "/admin/schedules/set-runs": {
    FORBIDDEN: ADMIN_ONLY,
    INVALID_REQUEST: "the number of seasons must be a whole number, 1 or more.",
    CONFLICT: OVERLAP,
  },
  "/admin/schedules/remove-gallery": { FORBIDDEN: ADMIN_ONLY, CONFLICT: "every season needs at least one gallery." },
  "/admin/schedules/cancel": { FORBIDDEN: ADMIN_ONLY, CONFLICT: "this schedule has already started, so it can't be cancelled." },
  "/admin/nominations/round": { FORBIDDEN: ADMIN_ONLY, NOT_FOUND: "that round hasn't finished yet." },
  "/admin/admins/list": { FORBIDDEN: ADMIN_ONLY },
  "/admin/admins/add": {
    FORBIDDEN: "only the owner can add admins.",
    CONFLICT: "they're already an admin.",
    NOT_FOUND: "nobody has registered that username.",
  },
  "/admin/admins/remove": { FORBIDDEN: "only the owner can remove admins, and the owner can't be removed." },
};

/** The message for `error` from `endpoint`; `ties` settle categories the page can tell apart. */
export function explain(endpoint: Endpoint, error: string, ties: Messages = {}): string {
  if (error === "NETWORK_ERROR") return NETWORK;
  const category = error as Category;
  return ties[category] ?? MESSAGES[endpoint]?.[category] ?? DEFAULTS[category] ?? FALLBACK;
}
