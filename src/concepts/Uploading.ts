import { S3Client } from "bun";
import type { Collection, Db } from "mongodb";

export class NoSuchUpload extends Error {} // 404
export class NotYourUpload extends Error {} // 403 forbidden
export class NotUploaded extends Error {} // 409 conflict
export class InvalidFile extends Error {} // 400

interface Upload {
  _id: string;
  owner: string;
  contentType: string;
  createdAt: Date;
}

const UPLOAD_LINK_SECONDS = 10 * 60;
const READ_LINK_SECONDS = 5 * 60;

// Where an upload's file lives in storage.
const keyOf = (upload: string) => `uploads/${upload}`;

export class UploadingConcept {
  private readonly uploads: Collection<Upload>;
  // The server talks to storage directly; links handed to browsers use the public endpoint.
  readonly #storage: S3Client;
  readonly #publicStorage: S3Client;

  // Bun's S3Client reads S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET, and
  // S3_ENDPOINT from the environment; S3_PUBLIC_ENDPOINT is passed explicitly.
  constructor(
    db: Db,
    storage = new S3Client(),
    publicStorage = new S3Client({ endpoint: process.env.S3_PUBLIC_ENDPOINT }),
  ) {
    this.uploads = db.collection<Upload>("uploading.uploads");
    this.#storage = storage;
    this.#publicStorage = publicStorage;
  }

  async requestUpload({ owner, contentType, createdAt }: {
    owner: string;
    contentType: string;
    createdAt: Date;
  }): Promise<{ upload: string; uploadUrl: string }> {
    const upload = crypto.randomUUID();
    await this.uploads.insertOne({ _id: upload, owner, contentType, createdAt });
    const uploadUrl = this.#publicStorage.presign(keyOf(upload), {
      method: "PUT",
      expiresIn: UPLOAD_LINK_SECONDS,
      type: contentType,
    });
    return { upload, uploadUrl };
  }

  async verify({ upload, owner, maxSize }: {
    upload: string;
    owner: string;
    maxSize: number;
  }): Promise<Record<string, never>> {
    const found = await this.uploads.findOne({ _id: upload });
    if (found === null) throw new NoSuchUpload("There is no such upload.");
    if (found.owner !== owner) throw new NotYourUpload("This upload belongs to someone else.");
    const file = this.#storage.file(keyOf(upload));
    if (!(await file.exists())) throw new NotUploaded("The file has not been uploaded yet.");
    // The stored type is the one the uploader declared; a link does not lock it, so check it here.
    const { size, type } = await file.stat();
    if (size > maxSize || type !== found.contentType) {
      await file.delete();
      throw new InvalidFile("The file is too large or not of the requested type.");
    }
    return {};
  }

  async remove({ upload }: { upload: string }): Promise<Record<string, never>> {
    const { deletedCount } = await this.uploads.deleteOne({ _id: upload });
    if (deletedCount === 0) throw new NoSuchUpload("There is no such upload.");
    await this.#storage.file(keyOf(upload)).delete(); // nothing to do if no file ever arrived
    return {};
  }

  async link({ upload }: { upload: string }): Promise<{ url: string }> {
    if ((await this.uploads.findOne({ _id: upload })) === null) throw new NoSuchUpload("There is no such upload.");
    return { url: this.#publicStorage.presign(keyOf(upload), { expiresIn: READ_LINK_SECONDS }) };
  }

  async _get({ upload }: { upload: string }): Promise<Array<{ owner: string; contentType: string; createdAt: Date }>> {
    const found = await this.uploads.findOne({ _id: upload });
    if (found === null) return [];
    const { owner, contentType, createdAt } = found;
    return [{ owner, contentType, createdAt }];
  }
}
