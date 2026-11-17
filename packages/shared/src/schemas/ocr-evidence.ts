import { z } from 'zod';
import { CrossDocCheckStatus, DocumentType } from '../enums.js';

export const ocrBoundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
});

export type OcrBoundingBox = z.infer<typeof ocrBoundingBoxSchema>;

export const ocrFieldExtractionSchema = z.object({
  fieldName: z.string().min(1),
  rawText: z.string(),
  normalizedValue: z.union([z.string(), z.number(), z.boolean()]),
  confidence: z.number().min(0).max(1),
  pageNumber: z.number().int().min(1).default(1),
  boundingBox: ocrBoundingBoxSchema.optional(),
});

export type OcrFieldExtraction = z.infer<typeof ocrFieldExtractionSchema>;

export const crossDocCheckItemSchema = z.object({
  field: z.string().min(1),
  sourceDocument: z.object({
    documentType: z.nativeEnum(DocumentType),
    extractedValue: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  targetDocument: z.object({
    documentType: z.nativeEnum(DocumentType),
    extractedValue: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  matchScore: z.number().min(0).max(1),
  status: z.nativeEnum(CrossDocCheckStatus),
  notes: z.string().optional(),
});

export type CrossDocCheckItem = z.infer<typeof crossDocCheckItemSchema>;

export const ocrEvidencePayloadSchema = z.object({
  documentId: z.string().min(1),
  documentType: z.nativeEnum(DocumentType),
  pageCount: z.number().int().min(1),
  overallConfidence: z.number().min(0).max(1),
  extractedFields: z.record(z.string(), ocrFieldExtractionSchema),
  rawText: z.string().optional(),
  processingTimeMs: z.number().nonnegative().optional(),
  processedAt: z.string().datetime(),
});

export type OcrEvidencePayload = z.infer<typeof ocrEvidencePayloadSchema>;

export const crossDocEvidenceReportSchema = z.object({
  applicationId: z.string().min(1),
  checks: z.array(crossDocCheckItemSchema),
  inconsistenciesDetected: z.boolean(),
  summary: z.string(),
  verifiedAt: z.string().datetime(),
});

export type CrossDocEvidenceReport = z.infer<typeof crossDocEvidenceReportSchema>;
