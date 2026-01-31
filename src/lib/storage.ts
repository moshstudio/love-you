import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageProvider {
  put(
    key: string,
    data: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
    bucketName: string,
    publicUrl: string,
  ) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucketName = bucketName;
    this.publicUrl = publicUrl;
  }

  async put(
    key: string,
    data: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: new Uint8Array(data),
      ContentType: options?.httpMetadata?.contentType,
    });
    try {
      await this.client.send(command);
      console.log(`[S3Storage] File uploaded successfully used R2: ${key}`);
    } catch (error) {
      console.error(`[S3Storage] Error uploading file:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    try {
      await this.client.send(command);
      console.log(`[S3Storage] File deleted successfully used R2: ${key}`);
    } catch (error) {
      console.error(`[S3Storage] Error deleting file:`, error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    const baseUrl = this.publicUrl.endsWith("/")
      ? this.publicUrl.slice(0, -1)
      : this.publicUrl;
    return `${baseUrl}/${key}`;
  }
}

class R2StorageProvider implements StorageProvider {
  private bucket: R2Bucket;
  private baseUrl: string;

  constructor(bucket: R2Bucket, baseUrl: string) {
    this.bucket = bucket;
    this.baseUrl = baseUrl;
  }

  async put(
    key: string,
    data: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void> {
    await this.bucket.put(key, data, options);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

export function getStorageProvider(
  env: {
    PHOTOS_BUCKET?: R2Bucket;
    PHOTOS_BUCKET_URL?: string;
  },
  isDevelopment: boolean,
): StorageProvider {
  if (isDevelopment) {
    // Try to use S3/R2 remote upload using env vars
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || "love-you-photos";
    const publicUrl = process.env.PHOTOS_BUCKET_URL || env.PHOTOS_BUCKET_URL;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing R2 credentials for development (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY). Please set them in your .env file.",
      );
    }

    if (!publicUrl) {
      throw new Error(
        "PHOTOS_BUCKET_URL is missing in environment variables. Please set it in your .env file.",
      );
    }

    // Validate publicUrl configuration
    if (publicUrl.includes("r2.cloudflarestorage.com")) {
      console.warn(
        "\x1b[33m%s\x1b[0m", // Yellow
        "⚠️ WARNING: PHOTOS_BUCKET_URL appears to be the R2 S3 API endpoint. " +
          "This will result in broken image links. " +
          "Please set PHOTOS_BUCKET_URL to your R2 Public Bucket URL (e.g. https://pub-xyz.r2.dev) or custom domain in .env and wrangler.jsonc.",
      );
    }

    return new S3StorageProvider(
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicUrl,
    );
  } else {
    // Use R2 in production
    if (!env.PHOTOS_BUCKET) {
      throw new Error("PHOTOS_BUCKET is not configured");
    }
    if (!env.PHOTOS_BUCKET_URL) {
      throw new Error("PHOTOS_BUCKET_URL is not configured");
    }
    return new R2StorageProvider(env.PHOTOS_BUCKET, env.PHOTOS_BUCKET_URL);
  }
}
