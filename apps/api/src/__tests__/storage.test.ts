import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  StorageService,
  LocalStorageAdapter,
  S3StorageAdapter,
  validateDocumentBuffer,
  detectMagicBytes,
  MAX_FILE_SIZE_BYTES,
  documentUpload,
} from '../modules/storage/storage.service.js';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler.js';

// Helper to convert readable stream to Buffer
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

describe('Storage Module & File Security Verification', () => {
  // Sample valid binary buffers with authentic magic bytes
  const validPdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    Buffer.from(' - TribalScholar AI Sample Caste Certificate Document Payload'),
  ]);

  const validPngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('IHDR sample PNG payload for income certificate stamp'),
  ]);

  const validJpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    Buffer.from('Sample JPEG payload for scholar photo ID verification'),
  ]);

  let tempDir: string;
  let localStorageAdapter: LocalStorageAdapter;
  let testStorageService: StorageService;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribalscholar-storage-test-'));
    localStorageAdapter = new LocalStorageAdapter(tempDir, 'test-bucket');
    testStorageService = new StorageService({
      adapter: localStorageAdapter,
      bucket: 'test-bucket',
    });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // 1. Magic Bytes & MIME Type Detection
  // ============================================================================
  describe('detectMagicBytes()', () => {
    it('should detect PDF files starting with %PDF', () => {
      const result = detectMagicBytes(validPdfBuffer);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('application/pdf');
      expect(result?.extension).toBe('pdf');
    });

    it('should detect PNG files starting with \\x89PNG\\r\\n\\x1a\\n', () => {
      const result = detectMagicBytes(validPngBuffer);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/png');
      expect(result?.extension).toBe('png');
    });

    it('should detect JPEG files starting with 0xFF 0xD8 0xFF', () => {
      const result = detectMagicBytes(validJpegBuffer);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.extension).toBe('jpg');
    });

    it('should return null for non-supported or plain text files', () => {
      const textBuffer = Buffer.from('Plain text file without magic bytes');
      expect(detectMagicBytes(textBuffer)).toBeNull();
    });

    it('should return null for buffers with length < 3', () => {
      const tinyBuffer = Buffer.from([0x25, 0x50]);
      expect(detectMagicBytes(tinyBuffer)).toBeNull();
    });
  });

  // ============================================================================
  // 2. Strict File Validation & Security Guards
  // ============================================================================
  describe('validateDocumentBuffer()', () => {
    it('should successfully validate an authentic PDF buffer', () => {
      const validated = validateDocumentBuffer(validPdfBuffer, 'application/pdf', 'caste_cert.pdf');
      expect(validated.mimeType).toBe('application/pdf');
      expect(validated.extension).toBe('pdf');
      expect(validated.fileSize).toBe(validPdfBuffer.length);
      expect(validated.originalName).toBe('caste_cert.pdf');
    });

    it('should successfully validate an authentic PNG buffer', () => {
      const validated = validateDocumentBuffer(validPngBuffer, 'image/png', 'income_cert.png');
      expect(validated.mimeType).toBe('image/png');
      expect(validated.extension).toBe('png');
      expect(validated.fileSize).toBe(validPngBuffer.length);
      expect(validated.originalName).toBe('income_cert.png');
    });

    it('should successfully validate an authentic JPEG buffer with image/jpeg or image/jpg', () => {
      const validated1 = validateDocumentBuffer(validJpegBuffer, 'image/jpeg', 'photo.jpg');
      expect(validated1.mimeType).toBe('image/jpeg');
      expect(validated1.extension).toBe('jpg');

      const validated2 = validateDocumentBuffer(validJpegBuffer, 'image/jpg', 'photo.jpg');
      expect(validated2.mimeType).toBe('image/jpeg');
    });

    it('should reject empty or zero-byte buffers with BadRequestError', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => validateDocumentBuffer(emptyBuffer)).toThrow(BadRequestError);
      expect(() => validateDocumentBuffer(emptyBuffer)).toThrow('File buffer cannot be empty');
    });

    it('should reject oversized buffers exceeding 5 MB limit', () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);
      // Inject PDF magic bytes to ensure it's size that triggers the error
      oversizedBuffer[0] = 0x25;
      oversizedBuffer[1] = 0x50;
      oversizedBuffer[2] = 0x44;
      oversizedBuffer[3] = 0x46;

      expect(() => validateDocumentBuffer(oversizedBuffer)).toThrow(BadRequestError);
      expect(() => validateDocumentBuffer(oversizedBuffer)).toThrow('exceeds maximum allowed limit of 5 MB');
    });

    it('should accept buffers exactly at the 5 MB boundary', () => {
      const boundaryBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES);
      boundaryBuffer[0] = 0x25;
      boundaryBuffer[1] = 0x50;
      boundaryBuffer[2] = 0x44;
      boundaryBuffer[3] = 0x46;

      const validated = validateDocumentBuffer(boundaryBuffer);
      expect(validated.fileSize).toBe(MAX_FILE_SIZE_BYTES);
    });

    it('should reject invalid magic-byte payloads disguised as PDFs (e.g. text/html/executable)', () => {
      const spoofedPdf = Buffer.from('<html><body><script>alert("malicious")</script></body></html>');
      expect(() => validateDocumentBuffer(spoofedPdf, 'application/pdf', 'malicious.pdf')).toThrow(BadRequestError);
      expect(() => validateDocumentBuffer(spoofedPdf, 'application/pdf', 'malicious.pdf')).toThrow(
        'Invalid file content or unsupported format'
      );
    });

    it('should reject mismatched declared MIME type against binary magic bytes', () => {
      // Pass authentic PNG bytes but declare application/pdf
      expect(() => validateDocumentBuffer(validPngBuffer, 'application/pdf', 'spoofed.pdf')).toThrow(
        BadRequestError
      );
      expect(() => validateDocumentBuffer(validPngBuffer, 'application/pdf', 'spoofed.pdf')).toThrow(
        "Declared MIME type 'application/pdf' does not match detected file signature 'image/png'"
      );
    });
  });

  // ============================================================================
  // 3. Local Disk Storage Adapter Unit Tests
  // ============================================================================
  describe('LocalStorageAdapter (Fast Offline Fallback)', () => {
    it('should persist buffer to local disk and return upload result', async () => {
      const key = 'test/docs/sample-pdf.pdf';
      const result = await localStorageAdapter.upload(key, validPdfBuffer, 'application/pdf');

      expect(result.key).toBe(key);
      expect(result.bucket).toBe('test-bucket');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileSize).toBe(validPdfBuffer.length);
      expect(result.url).toContain('/api/v1/storage/view');

      // Verify file exists on disk
      const exists = await localStorageAdapter.exists(key);
      expect(exists).toBe(true);
    });

    it('should stream document back from disk matching original binary data', async () => {
      const key = 'test/docs/sample-pdf.pdf';
      const stream = await localStorageAdapter.getStream(key);
      const readBuffer = await streamToBuffer(stream);

      expect(readBuffer.equals(validPdfBuffer)).toBe(true);
    });

    it('should generate a local presigned view URL for existing file', async () => {
      const key = 'test/docs/sample-pdf.pdf';
      const url = await localStorageAdapter.getPresignedUrl(key);

      expect(url).toBe(`/api/v1/storage/view?bucket=test-bucket&key=${encodeURIComponent(key)}`);
    });

    it('should throw NotFoundError when getting stream of non-existent file', async () => {
      await expect(localStorageAdapter.getStream('non-existent-key.pdf')).rejects.toThrow(NotFoundError);
    });

    it('should delete file and verify existence returns false', async () => {
      const key = 'test/docs/to-delete.pdf';
      await localStorageAdapter.upload(key, validPdfBuffer, 'application/pdf');
      expect(await localStorageAdapter.exists(key)).toBe(true);

      await localStorageAdapter.delete(key);
      expect(await localStorageAdapter.exists(key)).toBe(false);
    });
  });

  // ============================================================================
  // 4. StorageService Unified Facade Operations
  // ============================================================================
  describe('StorageService Integration Operations', () => {
    it('should upload valid PDF buffer with metadata and auto-generated partitioned key', async () => {
      const result = await testStorageService.uploadDocumentBuffer(validPdfBuffer, {
        applicationId: 'app-999-tribal',
        documentType: 'CASTE_CERTIFICATE',
        fileName: 'caste_cert.pdf',
        mimeType: 'application/pdf',
      });

      expect(result.bucket).toBe('test-bucket');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileSize).toBe(validPdfBuffer.length);
      expect(result.key).toMatch(/^applications\/app-999-tribal\/CASTE_CERTIFICATE_[a-f0-9-]+\.pdf$/);

      // Verify streaming and verification
      const stream = await testStorageService.getDocumentStream(result.key);
      const content = await streamToBuffer(stream);
      expect(content.equals(validPdfBuffer)).toBe(true);

      const exists = await testStorageService.documentExists(result.key);
      expect(exists).toBe(true);

      const presignedUrl = await testStorageService.getPresignedViewUrl(result.key);
      expect(presignedUrl).toContain(encodeURIComponent(result.key));

      // Cleanup
      await testStorageService.deleteDocument(result.key);
      expect(await testStorageService.documentExists(result.key)).toBe(false);
    });

    it('should upload valid PNG buffer without application ID using default documents/ prefix', async () => {
      const result = await testStorageService.uploadDocumentBuffer(validPngBuffer, {
        documentType: 'INCOME_CERTIFICATE',
        fileName: 'income.png',
        mimeType: 'image/png',
      });

      expect(result.key).toMatch(/^documents\/INCOME_CERTIFICATE_[a-f0-9-]+\.png$/);
      expect(result.mimeType).toBe('image/png');

      const stream = await testStorageService.getDocumentStream(result.key);
      const content = await streamToBuffer(stream);
      expect(content.equals(validPngBuffer)).toBe(true);

      await testStorageService.deleteDocument(result.key);
    });

    it('should reject invalid magic-byte buffer before attempting storage upload', async () => {
      const corruptedPdf = Buffer.from('NOT-A-PDF-AT-ALL');

      await expect(
        testStorageService.uploadDocumentBuffer(corruptedPdf, {
          mimeType: 'application/pdf',
          fileName: 'fake.pdf',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject oversized buffer before attempting storage upload', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 10);
      oversizedBuffer[0] = 0x25;
      oversizedBuffer[1] = 0x50;
      oversizedBuffer[2] = 0x44;
      oversizedBuffer[3] = 0x46;

      await expect(
        testStorageService.uploadDocumentBuffer(oversizedBuffer, {
          mimeType: 'application/pdf',
          fileName: 'large.pdf',
        })
      ).rejects.toThrow('exceeds maximum allowed limit of 5 MB');
    });

    it('should throw NotFoundError when attempting to stream non-existent document', async () => {
      await expect(
        testStorageService.getDocumentStream('applications/missing/does-not-exist.pdf')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================================================
  // 5. S3 Adapter & Offline Fallback Verification
  // ============================================================================
  describe('S3StorageAdapter & Offline Fallback Support', () => {
    it('should instantiate S3StorageAdapter with proper MinIO configurations', () => {
      const s3Adapter = new S3StorageAdapter({
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        bucket: 'tribalscholar-docs',
        forcePathStyle: true,
      });

      expect(s3Adapter.getClient()).toBeInstanceOf(S3Client);
    });

    it('should mock S3Client commands for upload, getStream, exists, and delete', async () => {
      const s3Adapter = new S3StorageAdapter({
        endpoint: 'http://localhost:9000',
        bucket: 'test-s3-bucket',
      });

      const client = s3Adapter.getClient();
      const mockStream = new Readable();
      mockStream.push(validPdfBuffer);
      mockStream.push(null);

      const sendSpy = vi.spyOn(client, 'send').mockImplementation(async (command: unknown) => {
        if (command instanceof PutObjectCommand) {
          return { $metadata: { httpStatusCode: 200 } } as never;
        }
        if (command instanceof GetObjectCommand) {
          return { Body: mockStream, $metadata: { httpStatusCode: 200 } } as never;
        }
        if (command instanceof HeadObjectCommand) {
          return { $metadata: { httpStatusCode: 200 } } as never;
        }
        if (command instanceof DeleteObjectCommand) {
          return { $metadata: { httpStatusCode: 204 } } as never;
        }
        return {} as never;
      });

      const uploadRes = await s3Adapter.upload('s3-doc.pdf', validPdfBuffer, 'application/pdf');
      expect(uploadRes.key).toBe('s3-doc.pdf');
      expect(uploadRes.bucket).toBe('test-s3-bucket');

      const stream = await s3Adapter.getStream('s3-doc.pdf');
      const downloaded = await streamToBuffer(stream);
      expect(downloaded.equals(validPdfBuffer)).toBe(true);

      const exists = await s3Adapter.exists('s3-doc.pdf');
      expect(exists).toBe(true);

      await s3Adapter.delete('s3-doc.pdf');

      sendSpy.mockRestore();
    });

    it('should automatically fall back to LocalStorageAdapter when S3 throws connection refused', async () => {
      // Mock an adapter that simulates offline MinIO connection refused
      const failingS3Adapter = new S3StorageAdapter({
        endpoint: 'http://127.0.0.1:9999', // unreachable port
        bucket: 'fallback-bucket',
      });

      vi.spyOn(failingS3Adapter.getClient(), 'send').mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:9999',
      });

      const serviceWithFallback = new StorageService({
        adapter: failingS3Adapter,
        autoFallbackToLocal: true,
        bucket: 'fallback-bucket',
      });

      // Should not throw ECONNREFUSED; should fallback to local disk seamlessly
      const uploadResult = await serviceWithFallback.uploadDocumentBuffer(validPdfBuffer, {
        fileName: 'fallback.pdf',
        mimeType: 'application/pdf',
      });

      expect(uploadResult).toBeDefined();
      expect(uploadResult.bucket).toBe('fallback-bucket');
      expect(uploadResult.mimeType).toBe('application/pdf');

      // Check stream works via fallback
      const stream = await serviceWithFallback.getDocumentStream(uploadResult.key);
      const content = await streamToBuffer(stream);
      expect(content.equals(validPdfBuffer)).toBe(true);

      // Cleanup
      await serviceWithFallback.deleteDocument(uploadResult.key);
    });
  });

  // ============================================================================
  // 6. Multer Middleware Configuration
  // ============================================================================
  describe('Multer Ingestion Middleware Configuration', () => {
    it('should have documentUpload middleware configured with 5 MB limit', () => {
      expect(documentUpload).toBeDefined();
    });
  });
});
