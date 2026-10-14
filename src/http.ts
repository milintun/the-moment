import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  // The address the browser uses (the frontend, which forwards /api to the backend).
  // Cookies require it, and requests from any other origin are refused.
  publicOrigin: "http://127.0.0.1:8080",
  basePath: "/api",
  publicErrors: {
    INVALID_USERNAME: "INVALID_REQUEST",
    INVALID_PASSWORD: "INVALID_REQUEST",
    USERNAME_TAKEN: "CONFLICT",
    INVALID_CREDENTIALS: "UNAUTHORIZED",
    UNKNOWN_SESSION: "UNAUTHORIZED",
    NO_SUCH_POST: "NOT_FOUND",
    NOT_OWNER: "FORBIDDEN",
    ALREADY_VOTED: "CONFLICT",
    NOT_VOTED: "NOT_FOUND",
    NAME_TAKEN: "CONFLICT",
    NO_SUCH_GROUP: "NOT_FOUND",
    ALREADY_IN_GROUP: "CONFLICT",
    NOT_IN_GROUP: "NOT_FOUND",
    INVALID_CYCLE: "INVALID_REQUEST",
    ALREADY_CYCLING: "CONFLICT",
    NO_SUCH_CYCLE: "NOT_FOUND",
    NOT_IN_CYCLE: "NOT_FOUND",
    // Errors the compositions answer with.
    ADMIN_ONLY: "FORBIDDEN",
    OWN_POST: "FORBIDDEN",
    GROUP_CLOSED: "CONFLICT",
    NOT_IN_SEASON: "CONFLICT",
  },
  cookies: {
    session: {
      name: "the-moment-session",
      input: "session",
      issue: [
        { path: "/auth/register", value: "session", expires: "expiresAt" },
        { path: "/auth/sign-in", value: "session", expires: "expiresAt" },
      ],
      clear: ["/auth/sign-out"],
    },
  },
});
