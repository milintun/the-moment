import { beforeEach, describe, expect, test } from "bun:test";
import { S3Client } from "bun";
import {
  InvalidFile,
  NoSuchUpload,
  NotUploaded,
  NotYourUpload,
  UploadingConcept,
} from "../../src/concepts/Uploading.ts";
import { T0, useTestDb } from "../helpers.ts";

// Runs against local storage (RustFS from compose.yaml), in the test bucket that
// `bun run test` selects through S3_BUCKET.
const db = useTestDb("uploading");
const storage = new S3Client();
const MB = 1024 * 1024;
let uploading: UploadingConcept;
beforeEach(() => {
  uploading = new UploadingConcept(db());
});

const stored = (upload: string) => storage.file(`uploads/${upload}`).exists();

/** Sends bytes through an upload link, as a browser would. */
async function send(uploadUrl: string, bytes: number, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: new Uint8Array(bytes),
    headers: { "Content-Type": contentType },
  });
  expect(response.ok).toBe(true);
}

async function uploaded(owner: string, bytes: number, contentType = "image/png") {
  const { upload, uploadUrl } = await uploading.requestUpload({ owner, contentType, createdAt: T0 });
  await send(uploadUrl, bytes, contentType);
  return upload;
}

describe("principle", () => {
  test("a file is usable once it arrives within the limit; an oversized one is refused and removed", async () => {
    const { upload, uploadUrl } = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    await expect(uploading.verify({ upload, owner: "gigi", maxSize: 10 * MB })).rejects.toBeInstanceOf(NotUploaded);
    await send(uploadUrl, 2 * MB, "image/png");
    expect(await uploading.verify({ upload, owner: "gigi", maxSize: 10 * MB })).toEqual({});
    await expect(uploading.verify({ upload, owner: "sid", maxSize: 10 * MB })).rejects.toBeInstanceOf(NotYourUpload);

    const big = await uploaded("sasha", 12 * MB, "image/jpeg");
    await expect(uploading.verify({ upload: big, owner: "sasha", maxSize: 10 * MB })).rejects.toBeInstanceOf(InvalidFile);
    expect(await stored(big)).toBe(false);

    const { url } = await uploading.link({ upload });
    expect((await (await fetch(url)).arrayBuffer()).byteLength).toBe(2 * MB);
    await uploading.remove({ upload });
    await expect(uploading.link({ upload })).rejects.toBeInstanceOf(NoSuchUpload);
  });
});

describe("requestUpload", () => {
  test("records the upload and returns a link valid for ten minutes", async () => {
    const { upload, uploadUrl } = await uploading.requestUpload({ owner: "gigi", contentType: "image/webp", createdAt: T0 });
    expect(await uploading._get({ upload })).toEqual([{ owner: "gigi", contentType: "image/webp", createdAt: T0 }]);
    expect(new URL(uploadUrl).searchParams.get("X-Amz-Expires")).toBe("600");
    expect(await stored(upload)).toBe(false); // nothing is stored until the file is sent
  });

  test("accepts any type of file, since which types are allowed is the application's decision", async () => {
    const { upload } = await uploading.requestUpload({ owner: "gigi", contentType: "application/pdf", createdAt: T0 });
    expect((await uploading._get({ upload }))[0]?.contentType).toBe("application/pdf");
  });

  test("two requests get different uploads", async () => {
    const a = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    const b = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    expect(a.upload).not.toBe(b.upload);
  });
});

describe("verify", () => {
  test("refuses NO_SUCH_UPLOAD", async () => {
    await expect(uploading.verify({ upload: "unknown", owner: "gigi", maxSize: MB })).rejects.toBeInstanceOf(NoSuchUpload);
  });

  test("refuses NOT_YOUR_UPLOAD and leaves the file in place", async () => {
    const upload = await uploaded("gigi", 100);
    await expect(uploading.verify({ upload, owner: "sid", maxSize: MB })).rejects.toBeInstanceOf(NotYourUpload);
    expect(await stored(upload)).toBe(true);
  });

  test("refuses NOT_UPLOADED before the file arrives", async () => {
    const { upload } = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    await expect(uploading.verify({ upload, owner: "gigi", maxSize: MB })).rejects.toBeInstanceOf(NotUploaded);
  });

  test("accepts a file of exactly maxSize, and refuses INVALID_FILE one byte over, removing it", async () => {
    const exact = await uploaded("gigi", 1000);
    expect(await uploading.verify({ upload: exact, owner: "gigi", maxSize: 1000 })).toEqual({});
    const over = await uploaded("gigi", 1001);
    await expect(uploading.verify({ upload: over, owner: "gigi", maxSize: 1000 })).rejects.toBeInstanceOf(InvalidFile);
    expect(await stored(over)).toBe(false);
    expect(await stored(exact)).toBe(true);
  });

  test("refuses INVALID_FILE when the file sent is not the requested type, removing it", async () => {
    const { upload, uploadUrl } = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    await send(uploadUrl, 100, "image/gif");
    await expect(uploading.verify({ upload, owner: "gigi", maxSize: MB })).rejects.toBeInstanceOf(InvalidFile);
    expect(await stored(upload)).toBe(false);
  });
});

describe("remove", () => {
  test("removes the upload and its stored file", async () => {
    const upload = await uploaded("gigi", 100);
    expect(await uploading.remove({ upload })).toEqual({});
    expect(await uploading._get({ upload })).toEqual([]);
    expect(await stored(upload)).toBe(false);
  });

  test("removes an upload whose file never arrived", async () => {
    const { upload } = await uploading.requestUpload({ owner: "gigi", contentType: "image/png", createdAt: T0 });
    expect(await uploading.remove({ upload })).toEqual({});
    expect(await uploading._get({ upload })).toEqual([]);
  });

  test("refuses NO_SUCH_UPLOAD, including removing twice", async () => {
    await expect(uploading.remove({ upload: "unknown" })).rejects.toBeInstanceOf(NoSuchUpload);
    const upload = await uploaded("gigi", 100);
    await uploading.remove({ upload });
    await expect(uploading.remove({ upload })).rejects.toBeInstanceOf(NoSuchUpload);
  });
});

describe("link", () => {
  test("gives a link that reads the file for five minutes", async () => {
    const upload = await uploaded("gigi", 321);
    const { url } = await uploading.link({ upload });
    expect(new URL(url).searchParams.get("X-Amz-Expires")).toBe("300");
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(321);
  });

  test("refuses NO_SUCH_UPLOAD", async () => {
    await expect(uploading.link({ upload: "unknown" })).rejects.toBeInstanceOf(NoSuchUpload);
  });
});

describe("queries", () => {
  test("_get answers no row for an unknown upload", async () => {
    expect(await uploading._get({ upload: "unknown" })).toEqual([]);
  });
});
