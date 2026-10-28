import { expect, test } from "@playwright/test";
import { ART, OWNER, PASSWORD, logInAs, openGallery, openMap, postArt, register, unique } from "./helpers.ts";

test("the site opens at the entrance, every time; the doorway goes home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Moment" })).toBeVisible();
  // Click in the doorway itself, at (134.7, 22) of the drawing's 138.37 × 70.44 (its middle runs under the text).
  await expect(page.getByRole("link", { name: "enter the museum" })).toBeVisible();
  const box = (await page.locator("svg.doorway").boundingBox())!;
  await page.mouse.click(box.x + (box.width * 134.7) / 138.37, box.y + (box.height * 22) / 70.44);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("dialog", { name: "map" })).toBeHidden();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Moment" })).toBeVisible();
});

test("register, post an image with a caption, and land on it in the gallery", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group, name } = await openGallery(owner);
  const username = unique("artist");

  await page.goto("/auth");
  await page.getByLabel("username").fill(username);
  await page.getByLabel("password").fill(PASSWORD);
  await page.getByRole("button", { name: "register" }).click();
  await page.waitForURL("**/home");

  await page.goto(`/galleries/${group}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByRole("link", { name: "post here" }).click();
  await page.locator('input[type="file"]').setInputFiles(ART);
  await expect(page.getByAltText("preview")).toBeVisible();
  await page.getByLabel("caption (optional)").fill("my first piece");
  await page.getByRole("button", { name: "post", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/galleries/${group}#post-`));
  const art = page.locator("figure.artwork").filter({ hasText: "my first piece" });
  await expect(art).toContainText(`by ${username}`);
  // The image really came back from storage.
  await expect.poll(() => art.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(16);
});

test("another visitor upvotes a post, then takes the vote back", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const artist = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  const artistName = await register(artist);
  const post = await postArt(artist, group, "vote for me");

  await register(page.request); // shares the page's cookies, so the page is signed in
  await page.goto(`/galleries/${group}`);
  const art = page.locator(`#post-${post}`);
  await expect(art).toContainText(`by ${artistName}`);
  await expect(art).toContainText("0 votes");
  await art.getByRole("button", { name: "upvote" }).click();
  await expect(art).toContainText("1 vote");
  await expect(art.getByRole("button", { name: "unvote" })).toHaveClass(/voted/);
  await art.getByRole("button", { name: "unvote" }).click();
  await expect(art).toContainText("0 votes");
});

test("an artist deletes their own post after confirming", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  await register(page.request); // shares the page's cookies, so the page is signed in
  const post = await postArt(page.request, group, "regret");

  await page.goto(`/galleries/${group}`);
  const art = page.locator(`#post-${post}`);
  await art.getByRole("button", { name: "delete" }).click();
  await art.getByRole("button", { name: "yes, delete" }).click();
  await expect(art).toHaveCount(0);
  await page.reload();
  await expect(page.locator(`#post-${post}`)).toHaveCount(0);
});

test("an admin takes someone's post off a gallery wall", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const artist = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group, name } = await openGallery(owner);
  await register(artist);
  const post = await postArt(artist, group, "off topic");

  await logInAs(page, OWNER.username, OWNER.password);
  await page.goto(`/galleries/${group}`);
  const art = page.locator(`#post-${post}`);
  await art.getByRole("button", { name: "remove from gallery" }).click();
  await expect(art).toContainText(`remove this post from ${name}?`);
  await art.getByRole("button", { name: "yes, remove" }).click();
  await expect(art).toHaveCount(0);
  await page.reload();
  await expect(page.locator(`#post-${post}`)).toHaveCount(0);
});

test("the owner schedules galleries from the admin page, and they open on the map and in the schedule list", async ({ page }) => {
  const name = unique("Admin Made ");
  await logInAs(page, OWNER.username, OWNER.password);
  await page.getByRole("link", { name: "admin" }).click();
  await expect(page.getByRole("heading", { name: "New schedule" })).toBeVisible();
  await page.getByLabel("season length (days)").fill("7");
  await page.getByLabel("number of seasons").fill("13");
  // Starting this minute rather than the default next 12 AM, so it opens straight away.
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await page.getByLabel("starts").fill(local);
  await page.getByLabel("name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "add gallery" }).click();
  await page.getByRole("button", { name: "create schedule" }).click();

  await expect(page).toHaveURL(/\/home\/admin\/schedules\?made=1$/);
  await expect(page.getByText("scheduled 1 gallery.")).toBeVisible();
  await expect(page.locator(".schedule").filter({ hasText: name })).toContainText("running");

  const map = await openMap(page);
  const room = map.getByRole("link", { name: new RegExp(name, "i") });
  const id = await room.getAttribute("data-room");
  await expect(map.locator(`.room-label[data-room="${id}"] .plan-badge`)).toHaveText("new");
  await room.click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("an upcoming schedule is read only until edited, then gains a gallery", async ({ page }) => {
  const first = unique("Upcoming ");
  const added = unique("Added ");
  await logInAs(page, OWNER.username, OWNER.password);
  await page.goto("/home/admin/new");
  await page.getByLabel("season length (days)").fill("3");
  await page.getByLabel("number of seasons").fill("2");
  await page.getByLabel("name", { exact: true }).fill(first);
  await page.getByRole("button", { name: "add gallery" }).click();
  await page.getByRole("button", { name: "create schedule" }).click();

  const card = page.locator(".schedule").filter({ hasText: first });
  await expect(card).toContainText("upcoming");
  await expect(card.getByRole("button")).toHaveText(["edit"]);
  await card.getByRole("button", { name: "edit" }).click();
  await card.getByLabel("name", { exact: true }).fill(added);
  await card.getByRole("button", { name: "add gallery" }).click();
  await card.getByRole("button", { name: "add to schedule" }).click();
  await expect(card.getByRole("link", { name: added })).toBeVisible();
});

test("on the map, dragging from a room looks around without entering it; a click enters", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  const map = await openMap(page);
  const room = map.locator(`a.plan-room[data-room="${group}"]`);
  const before = (await room.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 120, before.y + before.height / 2 + 60, { steps: 6 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/home$/);
  const after = (await room.boundingBox())!;
  expect(after.x - before.x).toBeGreaterThan(40); // the view moved (as far as the building's edge allows)
  await room.click();
  await expect(page).toHaveURL(new RegExp(`/galleries/${group}$`));
});

test("the map opens over the page; the little person drops into the room clicked; every room page marks where you are", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  const map = await openMap(page, "/home");
  await expect(map.locator('.room-label[data-room="home"]')).toContainText("you are here");
  const room = map.locator(`a.plan-room[data-room="${group}"]`);
  const box = (await room.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await expect(page.locator(".pegman")).toHaveClass(/roaming/);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".pegman")).toHaveClass(/landing/);
  await expect(page).toHaveURL(new RegExp(`/galleries/${group}$`));
  await expect(map).toBeHidden();

  await page.getByRole("button", { name: /open the map/ }).press("Enter");
  await expect(map.locator(`.room-label[data-room="${group}"]`)).toContainText("you are here");
  await page.keyboard.press("Escape");
  await expect(map).toBeHidden();
  await page.goto("/nominations");
  await expect(page.locator('.minimap .room-label[data-room="nominations"]')).toContainText("you are here");
  await expect(page.locator(".neighbours")).toContainText("archive →");
});

test("signed out, a gallery links to log in to post and vote", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  await page.goto(`/galleries/${group}`);
  await page.getByRole("link", { name: "log in to post and vote" }).click();
  await expect(page).toHaveURL(/\/auth$/);
});

test("refusals show their own message: a taken username, and adding an admin nobody registered", async ({ page }) => {
  const taken = await register(page.request);
  await page.request.post("/api/auth/sign-out", { data: {} });
  await page.goto("/auth");
  await page.getByLabel("username").fill(taken);
  await page.getByLabel("password").fill(PASSWORD);
  await page.getByRole("button", { name: "register" }).click();
  await expect(page.getByRole("alert")).toHaveText("that username is taken.");

  await logInAs(page, OWNER.username, OWNER.password);
  await page.goto("/home/admin/people");
  await page.getByLabel("username").fill(unique("nobody"));
  await page.getByRole("button", { name: "add admin" }).click();
  await expect(page.getByRole("alert")).toHaveText("nobody has registered that username.");
});
