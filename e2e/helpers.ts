import { readFileSync } from "node:fs";
import type { APIRequestContext, Page } from "@playwright/test";

/** The owner account e2e/server.ts creates. */
export const OWNER = { username: "curator", password: "e2e-password" };
export const PASSWORD = "password123";
export const ART = `${import.meta.dirname}/fixtures/art.png`;

const HOUR = 60 * 60 * 1000;
let counter = 0;
/** A name no other test uses, since tests share the database. */
export const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}${counter++}`;

/** Calls the API as whoever `request` is signed in as; fails the test on an error answer. */
export async function call(request: APIRequestContext, path: string, input: object = {}): Promise<any> {
  const result = await (await request.post(`/api${path}`, { data: input })).json();
  if ("error" in result) throw new Error(`${path} refused: ${result.error}`);
  return result;
}

export async function signIn(request: APIRequestContext, username: string, password = PASSWORD) {
  await call(request, "/auth/sign-in", { username, password });
}

export async function register(request: APIRequestContext, username = unique("visitor")) {
  await call(request, "/auth/register", { username, password: PASSWORD });
  return username;
}

/** As the owner: an open gallery (a 1-day season starting now) named `name`. */
export async function openGallery(owner: APIRequestContext, name = unique("gallery ")) {
  await signIn(owner, OWNER.username, OWNER.password);
  const { cycle } = await call(owner, "/admin/cycles/create", { period: 24 * HOUR, runs: 1 });
  const { group } = await call(owner, "/admin/groups/create", { name });
  await call(owner, "/admin/cycles/add-item", { cycle, item: group });
  return { group, name };
}

/** Uploads the fixture image and posts it to `group` as whoever `request` is. */
export async function postArt(request: APIRequestContext, group: string, caption = "") {
  const { upload, uploadUrl } = await call(request, "/uploads/request", { contentType: "image/png" });
  const sent = await fetch(uploadUrl, { method: "PUT", body: readFileSync(ART), headers: { "Content-Type": "image/png" } });
  if (!sent.ok) throw new Error(`storing the image failed: ${sent.status}`);
  return (await call(request, "/posts/create", { group, content: upload, caption })).post as string;
}

/** Signs `page` in through the auth page. */
export async function logInAs(page: Page, username: string, password = PASSWORD) {
  await page.goto("/auth");
  await page.getByLabel("username").fill(username);
  await page.getByLabel("password").fill(password);
  await page.getByRole("button", { name: "log in" }).click();
  await page.waitForURL("**/home");
}
