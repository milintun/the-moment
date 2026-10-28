// Runs before any test module loads. The API client keeps the fetch it finds at creation, so
// install one here that asks whatever fake backend the current test set up (see fakeApi), and
// that refuses real network calls.
import { afterEach } from "vitest";

export const backend: { fetch: typeof fetch | null } = { fetch: null };

globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) => {
  if (!backend.fetch) throw new Error(`unexpected request to ${String(url)}; call fakeApi() first`);
  return backend.fetch(url, init);
}) as typeof fetch;

afterEach(() => {
  backend.fetch = null;
  sessionStorage.clear(); // e.g. the last room visited, which the map pins
});
