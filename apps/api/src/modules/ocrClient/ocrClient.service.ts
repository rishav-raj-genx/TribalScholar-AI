import { DocumentType } from '@tribalscholar/shared';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

export interface OcrApplicantContext {
  name?: string | undefined;
  applicantName?: string | undefined;
  annualIncome?: number | undefined;
  annualFamilyIncome?: number | undefined;
  category?: string | undefined;
  state?: string | undefined;
  stateDomicile?: string | undefined;
  gender?: string | undefined;
  [key: string]: unknown;
}

export interface OcrAnalyzeDocumentRequest {
  documentId: string;
  expectedType: DocumentType;
  fileBase64?: string | undefined;
  filename?: string | undefined;
  text?: string | undefined;
  applicantContext?: OcrApplicantContext | undefined;
}

export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrFieldEvidence {
  page: number;
  fieldLabel: string;
  bbox: OcrBoundingBox;
  rawSnippet: string;
  evidenceString: string;
}

export interface OcrExtractedField {
  fieldName: string;
  value: string | number | boolean;
  status: string;
  confidence: number;
  evidence?: OcrFieldEvidence | null;
  rawText?: string | null;
}

export interface OcrFieldComparisonItem {
  field: string;
  declaredValue: unknown;
  extractedValue: unknown;
  isMatch: boolean;
  confidence: number;
  evidenceString?: string | null;
  notes?: string | null;
}

export interface OcrClassificationResult {
  predictedType: DocumentType;
  confidence: number;
  isMatch: boolean;
  evidenceTokens?: string[];
  scores?: Record<string, number>;
  rejectionReason?: string | null;
}

export interface OcrAnalyzeDocumentResponse {
  success: boolean;
  documentId: string;
  documentType: DocumentType;
  status: 'VERIFIED' | 'DEFICIENT' | 'FLAGGED';
  overallConfidence: number;
  classification: OcrClassificationResult;
  extractedFields: Record<string, OcrExtractedField>;
  comparisons: OcrFieldComparisonItem[];
  deficiencyReasons: string[];
  processingTimeMs?: number;
  processedAt: string;
}

export interface OcrClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class OcrClientService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxRetries: number;
  private readonly defaultRetryDelayMs: number;

  constructor(
    baseUrl: string = env.AI_OCR_URL,
    apiKey: string = env.INTERNAL_API_KEY,
    options?: OcrClientOptions
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.defaultTimeoutMs = options?.timeoutMs ?? 15000;
    this.defaultMaxRetries = options?.maxRetries ?? 2;
    this.defaultRetryDelayMs = options?.retryDelayMs ?? 500;
  }

  /**
   * Invokes Python FastAPI OCR Microservice to classify, extract, and cross-validate a document.
   * Includes automatic retries with exponential backoff on transient network or 5xx server errors.
   */
  async analyzeDocument(
    request: OcrAnalyzeDocumentRequest,
    options?: OcrClientOptions
  ): Promise<OcrAnalyzeDocumentResponse> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = options?.maxRetries ?? this.defaultMaxRetries;
    const retryDelayMs = options?.retryDelayMs ?? this.defaultRetryDelayMs;

    const url = `${this.baseUrl}/internal/v1/ocr/analyze`;
    const payload = {
      documentId: request.documentId,
      expectedType: request.expectedType,
      fileBase64: request.fileBase64,
      filename: request.filename,
      text: request.text,
      applicantContext: request.applicantContext,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const status = response.status;
          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch {
            // ignore response body read error
          }

          // Do not retry 4xx client errors (e.g. 400 Bad Request, 401 Unauthorized, 403 Forbidden)
          if (status >= 400 && status < 500) {
            throw new AppError(
              `AI OCR Service returned HTTP ${status}: ${errorBody || response.statusText}`,
              status,
              'OCR_CLIENT_ERROR'
            );
          }

          // 5xx errors are retryable
          throw new Error(`AI OCR Service returned HTTP ${status}: ${errorBody || response.statusText}`);
        }

        const data = (await response.json()) as OcrAnalyzeDocumentResponse;
        return data;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err instanceof AppError) {
          // Non-retryable error
          throw err;
        }

        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          logger.error(
            `[OcrClient] Failed to analyze document ${request.documentId} after ${attempt + 1} attempts: ${lastError.message}`
          );
          break;
        }

        const delay = retryDelayMs * Math.pow(2, attempt);
        logger.warn(
          `[OcrClient] Attempt ${attempt + 1} failed for document ${request.documentId} (${lastError.message}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new AppError(
      `Failed to communicate with AI OCR service for document '${request.documentId}': ${lastError?.message}`,
      502,
      'OCR_SERVICE_UNAVAILABLE'
    );
  }
}

export const ocrClientService = new OcrClientService();
