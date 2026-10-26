import { expect, test } from "@playwright/test";
import { ART, OWNER, PASSWORD, logInAs, openGallery, postArt, register, unique } from "./helpers.ts";

test("a first visit opens at the entrance; clicking enters the map, and later visits skip the entrance", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Moment" })).toBeVisible();
  await page.getByText("click anywhere to enter").click();
  await expect(page).toHaveURL(/\/map$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/map$/);
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
  await expect(art).toContainText(`by ${artistName} · 0 vote(s)`);
  await art.getByRole("button", { name: "upvote" }).click();
  await expect(art).toContainText("1 vote(s)");
  await expect(art.getByRole("button", { name: "unvote" })).toHaveClass(/voted/);
  await art.getByRole("button", { name: "unvote" }).click();
  await expect(art).toContainText("0 vote(s)");
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

test("the owner starts a season and a gallery in it from the admin page, and it opens on the map", async ({ page }) => {
  const name = unique("Admin Made ");
  await logInAs(page, OWNER.username, OWNER.password);
  await page.goto("/home/admin");
  await page.getByLabel("Season length (days)").fill("7");
  await page.getByLabel("Number of seasons").fill("2");
  await page.getByRole("button", { name: "Create cycle (starts now)" }).click();
  const gallerySection = page.locator("form").filter({ has: page.getByRole("button", { name: "Create", exact: true }) });
  await gallerySection.getByLabel("Name").fill(name);
  // The newest cycle is the one just made: a week-long season, 2 of them.
  const option = gallerySection.locator("select option").filter({ hasText: /^\s*7-day seasons/ }).last();
  await gallerySection.locator("select").selectOption({ label: (await option.textContent())!.trim() });
  await gallerySection.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();

  await page.goto("/map");
  await page.getByRole("link", { name: new RegExp(name, "i") }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("link", { name: "post here" })).toBeVisible();
});

test("signed out, posting sends you to log in", async ({ page, playwright, baseURL }) => {
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const { group } = await openGallery(owner);
  await page.goto(`/galleries/${group}`);
  await page.getByRole("link", { name: "post here" }).click();
  await expect(page).toHaveURL(/\/auth$/);
});
