import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { BadRequestError, NotFoundError } from '../../middleware/errorHandler.js';

// ==============================================================================
// Constants & MIME Types
// ==============================================================================

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export interface MagicByteSignature {
  mimeType: SupportedMimeType;
  extension: 'pdf' | 'jpg' | 'png';
  validate: (buffer: Buffer) => boolean;
}

const SIGNATURES: MagicByteSignature[] = [
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  {
    mimeType: 'application/pdf',
    extension: 'pdf',
    validate: (buf: Buffer) =>
      buf.length >= 4 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46,
  },
  // PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4e 0x47 0x0d 0x0a 0x1a 0x0a)
  {
    mimeType: 'image/png',
    extension: 'png',
    validate: (buf: Buffer) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  // JPEG: 0xff 0xd8 0xff
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    validate: (buf: Buffer) =>
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff,
  },
];

// ==============================================================================
// Domain Types & Contracts
// ==============================================================================

export interface ValidatedDocument {
  buffer: Buffer;
  mimeType: SupportedMimeType;
  extension: 'pdf' | 'jpg' | 'png';
  fileSize: number;
  originalName?: string | undefined;
}

export interface StorageUploadOptions {
  fileName?: string | undefined;
  mimeType?: string | undefined;
  documentType?: string | undefined;
  applicationId?: string | undefined;
  userId?: string | undefined;
  bucket?: string | undefined;
  key?: string | undefined;
  metadata?: Record<string, string> | undefined;
}

export interface UploadResult {
  key: string;
  bucket: string;
  fileName: string;
  mimeType: SupportedMimeType;
  fileSize: number;
  url: string;
}

export interface IStorageAdapter {
  upload(
    key: string,
    buffer: Buffer,
    mimeType: SupportedMimeType,
    bucket?: string | undefined,
    metadata?: Record<string, string> | undefined
  ): Promise<UploadResult>;
  getStream(key: string, bucket?: string | undefined): Promise<NodeJS.ReadableStream>;
  getPresignedUrl(key: string, bucket?: string | undefined, expiresInSeconds?: number | undefined): Promise<string>;
  delete(key: string, bucket?: string | undefined): Promise<void>;
  exists(key: string, bucket?: string | undefined): Promise<boolean>;
}

export interface StorageServiceOptions {
  adapter?: 's3' | 'local' | IStorageAdapter | undefined;
  localDir?: string | undefined;
  bucket?: string | undefined;
  autoFallbackToLocal?: boolean | undefined;
}

// ==============================================================================
// Pure File Validation Functions
// ==============================================================================

/**
 * Detects format and extension from binary magic bytes.
 */
export function detectMagicBytes(
  buffer: Buffer
): { mimeType: SupportedMimeType; extension: 'pdf' | 'jpg' | 'png' } | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }

  for (const sig of SIGNATURES) {
    if (sig.validate(buffer)) {
      return { mimeType: sig.mimeType, extension: sig.extension };
    }
  }

  return null;
}

/**
 * Validates file buffer length, size constraint (<= 5 MB), and magic byte integrity.
 */
export function validateDocumentBuffer(
  buffer: Buffer,
  declaredMimeType?: string | undefined,
  fileName?: string | undefined
): ValidatedDocument {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('File buffer cannot be empty');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB`,
      { size: buffer.length, maxSize: MAX_FILE_SIZE_BYTES }
    );
  }

  const detected = detectMagicBytes(buffer);
  if (!detected) {
    throw new BadRequestError(
      'Invalid file content or unsupported format. Only authentic PDF, JPEG, and PNG files are allowed.',
      { fileName, declaredMimeType }
    );
  }

  if (declaredMimeType) {
    const normalizedDeclared = declaredMimeType.toLowerCase().trim();
    const effectiveDeclared =
      normalizedDeclared === 'image/jpg' ? 'image/jpeg' : normalizedDeclared;

    if (effectiveDeclared !== detected.mimeType) {
      throw new BadRequestError(
        `Declared MIME type '${declaredMimeType}' does not match detected file signature '${detected.mimeType}'`,
        { declared: declaredMimeType, detected: detected.mimeType }
      );
    }
  }

  return {
    buffer,
    mimeType: detected.mimeType,
    extension: detected.extension,
    fileSize: buffer.length,
    originalName: fileName,
  };
}

// ==============================================================================
// S3 Storage Adapter (AWS S3 & MinIO Compatible)
// ==============================================================================

export class S3StorageAdapter implements IStorageAdapter {
  private readonly client: S3Client;
  private readonly defaultBucket: string;
  private readonly endpoint: string;

  constructor(options?: {
    endpoint?: string | undefined;
    region?: string | undefined;
    accessKeyId?: string | undefined;
    secretAccessKey?: string | undefined;
    bucket?: string | undefined;
    forcePathStyle?: boolean | undefined;
    ssl?: boolean | undefined;
  }) {
    this.endpoint = options?.endpoint || env.S3_ENDPOINT;
    this.defaultBucket = options?.bucket || env.S3_BUCKET;

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: options?.region || env.S3_REGION,
      credentials: {
        accessKeyId: options?.accessKeyId || env.S3_ACCESS_KEY,
        secretAccessKey: options?.secretAccessKey || env.S3_SECRET_KEY,
      },
      forcePathStyle: options?.forcePathStyle ?? true, // Crucial for MinIO path addressing
      tls: options?.ssl ?? env.S3_USE_SSL,
    });
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: SupportedMimeType,
    bucket?: string | undefined,
    metadata?: Record<string, string> | undefined
  ): Promise<UploadResult> {
    const targetBucket = bucket || this.defaultBucket;
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
    });

    await this.client.send(command);

    return {
      key,
      bucket: targetBucket,
      fileName: path.basename(key),
      mimeType,
      fileSize: buffer.length,
      url: `${this.endpoint}/${targetBucket}/${key}`,
    };
  }

  async getStream(key: string, bucket?: string | undefined): Promise<NodeJS.ReadableStream> {
    const targetBucket = bucket || this.defaultBucket;
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      if (!response.Body) {
        throw new NotFoundError(`Object '${key}' in bucket '${targetBucket}' contains no content`);
      }
      return response.Body as unknown as NodeJS.ReadableStream;
    } catch (err: unknown) {
      if (err instanceof NotFoundError) throw err;
      const errorObj = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (errorObj.name === 'NoSuchKey' || errorObj.$metadata?.httpStatusCode === 404) {
        throw new NotFoundError(`Document '${key}' not found in bucket '${targetBucket}'`);
      }
      throw err;
    }
  }

  async getPresignedUrl(
    key: string,
    bucket?: string | undefined,
    expiresInSeconds = 900
  ): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string, bucket?: string | undefined): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      })
    );
  }

  async exists(key: string, bucket?: string | undefined): Promise<boolean> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: targetBucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  getClient(): S3Client {
    return this.client;
  }
}

// ==============================================================================
// Local Disk Storage Adapter (Fast Offline Unit Tests & Fallback)
// ==============================================================================

export class LocalStorageAdapter implements IStorageAdapter {
  private readonly baseDir: string;
  private readonly defaultBucket: string;

  constructor(baseDir?: string | undefined, defaultBucket?: string | undefined) {
    this.defaultBucket = defaultBucket || env.S3_BUCKET || 'tribalscholar-docs';
    this.baseDir = path.resolve(baseDir || env.STORAGE_LOCAL_DIR || '.storage-local');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string, bucket?: string | undefined): string {
    const targetBucket = bucket || this.defaultBucket;
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, targetBucket, safeKey);
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: SupportedMimeType,
    bucket?: string | undefined,
    metadata?: Record<string, string> | undefined
  ): Promise<UploadResult> {
    const targetBucket = bucket || this.defaultBucket;
    const targetPath = this.resolvePath(key, targetBucket);
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);

    if (metadata && Object.keys(metadata).length > 0) {
      await fs.promises.writeFile(
        `${targetPath}.meta.json`,
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
    }

    return {
      key,
      bucket: targetBucket,
      fileName: path.basename(key),
      mimeType,
      fileSize: buffer.length,
      url: `/api/v1/storage/view?bucket=${encodeURIComponent(targetBucket)}&key=${encodeURIComponent(key)}`,
    };
  }

  async getStream(key: string, bucket?: string | undefined): Promise<NodeJS.ReadableStream> {
    const targetBucket = bucket || this.defaultBucket;
    const targetPath = this.resolvePath(key, targetBucket);

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError(
        `Document '${key}' not found in local storage bucket '${targetBucket}'`
      );
    }

    return fs.createReadStream(targetPath);
  }

  async getPresignedUrl(
    key: string,
    bucket?: string | undefined,
    _expiresInSeconds = 900
  ): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    const targetPath = this.resolvePath(key, targetBucket);

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError(
        `Document '${key}' not found in local storage bucket '${targetBucket}'`
      );
    }

    return `/api/v1/storage/view?bucket=${encodeURIComponent(targetBucket)}&key=${encodeURIComponent(key)}`;
  }

  async delete(key: string, bucket?: string | undefined): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    const targetPath = this.resolvePath(key, targetBucket);

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }
    const metaPath = `${targetPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      await fs.promises.unlink(metaPath);
    }
  }

  async exists(key: string, bucket?: string | undefined): Promise<boolean> {
    const targetBucket = bucket || this.defaultBucket;
    const targetPath = this.resolvePath(key, targetBucket);
    return fs.existsSync(targetPath);
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

// ==============================================================================
// Storage Service (Unified Facade with Offline Fallback)
// ==============================================================================

export class StorageService {
  private adapter: IStorageAdapter;
  private readonly defaultBucket: string;
  private localFallbackAdapter?: LocalStorageAdapter;
  private readonly autoFallback: boolean;

  constructor(options?: StorageServiceOptions) {
    this.defaultBucket = options?.bucket || env.S3_BUCKET;
    this.autoFallback = options?.autoFallbackToLocal ?? true;

    if (options?.adapter && typeof options.adapter === 'object') {
      this.adapter = options.adapter;
    } else {
      const selectedDriver = options?.adapter || env.STORAGE_DRIVER;
      if (selectedDriver === 'local') {
        this.adapter = new LocalStorageAdapter(
          options?.localDir || env.STORAGE_LOCAL_DIR,
          this.defaultBucket
        );
      } else {
        this.adapter = new S3StorageAdapter({
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION,
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
          bucket: this.defaultBucket,
          forcePathStyle: true,
          ssl: env.S3_USE_SSL,
        });
      }
    }
  }

  private getFallbackAdapter(): LocalStorageAdapter {
    if (!this.localFallbackAdapter) {
      this.localFallbackAdapter = new LocalStorageAdapter(
        env.STORAGE_LOCAL_DIR,
        this.defaultBucket
      );
    }
    return this.localFallbackAdapter;
  }

  private isConnectionError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const errorRecord = err as { code?: string; name?: string; message?: string };
    return (
      errorRecord.code === 'ECONNREFUSED' ||
      errorRecord.code === 'ENOTFOUND' ||
      errorRecord.name === 'TimeoutError' ||
      (typeof errorRecord.message === 'string' &&
        (errorRecord.message.includes('ECONNREFUSED') ||
          errorRecord.message.includes('fetch failed')))
    );
  }

  /**
   * Generates a deterministic or random storage object key.
   */
  public generateKey(options: {
    applicationId?: string | undefined;
    documentType?: string | undefined;
    extension: string;
    fileName?: string | undefined;
  }): string {
    const uuid = crypto.randomUUID();
    const cleanExt = options.extension.replace(/^\./, '');
    const prefix = options.applicationId ? `applications/${options.applicationId}/` : 'documents/';
    const docTag = options.documentType ? `${options.documentType}_` : '';
    return `${prefix}${docTag}${uuid}.${cleanExt}`;
  }

  /**
   * Validates document buffer (MIME type, magic bytes, 5 MB size limit)
   * and persists it to object storage (or local fallback).
   */
  public async uploadDocumentBuffer(
    buffer: Buffer,
    options: StorageUploadOptions = {}
  ): Promise<UploadResult> {
    const validated = validateDocumentBuffer(buffer, options.mimeType, options.fileName);

    const key =
      options.key ||
      this.generateKey({
        applicationId: options.applicationId,
        documentType: options.documentType,
        extension: validated.extension,
        fileName: options.fileName,
      });

    const targetBucket = options.bucket || this.defaultBucket;

    try {
      return await this.adapter.upload(
        key,
        validated.buffer,
        validated.mimeType,
        targetBucket,
        options.metadata
      );
    } catch (err: unknown) {
      if (this.autoFallback && this.isConnectionError(err)) {
        logger.warn(
          `[StorageService] S3/MinIO unavailable (${(err as Error).message}). Falling back to LocalStorageAdapter.`
        );
        return await this.getFallbackAdapter().upload(
          key,
          validated.buffer,
          validated.mimeType,
          targetBucket,
          options.metadata
        );
      }
      throw err;
    }
  }

  /**
   * Retrieves a document read stream by object key.
   */
  public async getDocumentStream(
    key: string,
    bucket?: string | undefined
  ): Promise<NodeJS.ReadableStream> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      return await this.adapter.getStream(key, targetBucket);
    } catch (err: unknown) {
      if (this.autoFallback && this.isConnectionError(err)) {
        logger.warn(
          `[StorageService] S3/MinIO unavailable for getDocumentStream. Attempting fallback.`
        );
        return await this.getFallbackAdapter().getStream(key, targetBucket);
      }
      throw err;
    }
  }

  /**
   * Retrieves full document buffer by object key.
   */
  public async getDocumentBuffer(
    key: string,
    bucket?: string | undefined
  ): Promise<Buffer> {
    const stream = await this.getDocumentStream(key, bucket);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Generates a presigned view URL for a document.
   */
  public async getPresignedViewUrl(
    key: string,
    bucket?: string | undefined,
    expiresInSeconds = 900
  ): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      return await this.adapter.getPresignedUrl(key, targetBucket, expiresInSeconds);
    } catch (err: unknown) {
      if (this.autoFallback && this.isConnectionError(err)) {
        logger.warn(
          `[StorageService] S3/MinIO unavailable for getPresignedViewUrl. Falling back to local URL.`
        );
        return await this.getFallbackAdapter().getPresignedUrl(
          key,
          targetBucket,
          expiresInSeconds
        );
      }
      throw err;
    }
  }

  /**
   * Deletes a document from storage.
   */
  public async deleteDocument(key: string, bucket?: string | undefined): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      await this.adapter.delete(key, targetBucket);
    } catch (err: unknown) {
      if (this.autoFallback && this.isConnectionError(err)) {
        await this.getFallbackAdapter().delete(key, targetBucket);
        return;
      }
      throw err;
    }
  }

  /**
   * Checks whether a document exists in storage.
   */
  public async documentExists(key: string, bucket?: string | undefined): Promise<boolean> {
    const targetBucket = bucket || this.defaultBucket;
    try {
      return await this.adapter.exists(key, targetBucket);
    } catch (err: unknown) {
      if (this.autoFallback && this.isConnectionError(err)) {
        return await this.getFallbackAdapter().exists(key, targetBucket);
      }
      return false;
    }
  }

  /**
   * Helper to retrieve underlying adapter.
   */
  public getAdapter(): IStorageAdapter {
    return this.adapter;
  }
}

// ==============================================================================
// Multer Ingestion Middleware
// ==============================================================================

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported MIME type '${file.mimetype}'. Only PDF, JPEG, and PNG files are allowed.`
        )
      );
    }
  },
});

// Singleton instance for app-wide use
export const storageService = new StorageService();
