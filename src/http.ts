import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    // TODO: map each refusal code to an HTTP error, e.g. SOME_CODE: "CONFLICT",
  },
});
