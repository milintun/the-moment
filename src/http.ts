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
