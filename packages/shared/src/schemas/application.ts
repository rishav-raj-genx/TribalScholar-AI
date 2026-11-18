import { z } from 'zod';
import {
  ApplicationStatus,
  DocumentType,
  ReviewDecision,
  SchemeCode,
  VerificationStatus,
} from '../enums.js';
import { schemeSchema, schemeVersionSchema } from './scheme.js';

export const applicantProfileSchema = z.object({
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.date()),
  gender: z.string().min(1),
  casteCommunity: z.string().min(1),
  subTribe: z.string().optional(),
  fatherOrSpouseName: z.string().min(1),
  annualIncome: z.number().nonnegative(),
  addressLine: z.string().min(1),
  district: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(6).max(6),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  aadhaarNumberHash: z.string().optional(),
  bankAccountNumberHash: z.string().optional(),
});

export type ApplicantProfileInput = z.infer<typeof applicantProfileSchema>;

export const createApplicationSchema = z.object({
  schemeCode: z.nativeEnum(SchemeCode),
  schemeVersionId: z.string().uuid().optional(),
  formData: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  formData: z.record(z.string(), z.unknown()).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const updateApplicationFormSchema = z.object({
  formData: z.record(z.string(), z.unknown()),
});

export type UpdateApplicationFormInput = z.infer<typeof updateApplicationFormSchema>;

export const raiseDeficiencySchema = z.object({
  applicationId: z.string().uuid(),
  documentId: z.string().uuid().optional(),
  fieldOrCriteria: z.string().min(1),
  deficiencyCode: z.string().min(1),
  description: z.string().min(1),
});

export type RaiseDeficiencyInput = z.infer<typeof raiseDeficiencySchema>;

export const resolveDeficiencySchema = z.object({
  deficiencyId: z.string().uuid(),
  resolutionNotes: z.string().min(1),
  newDocumentId: z.string().uuid().optional(),
});

export type ResolveDeficiencyInput = z.infer<typeof resolveDeficiencySchema>;

export const submitOfficerReviewSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.nativeEnum(ReviewDecision),
  remarks: z.string().min(1),
  checklistResults: z.record(z.string(), z.boolean()),
  aiFindingsAgreement: z.boolean().default(true),
  overrideReason: z.string().optional(),
});

export type SubmitOfficerReviewInput = z.infer<typeof submitOfficerReviewSchema>;


export const applicationDocumentSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  documentType: z.nativeEnum(DocumentType),
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  s3Key: z.string().min(1),
  s3Bucket: z.string().min(1),
  version: z.number().int().positive().default(1),
  isCurrent: z.boolean().default(true),
  verificationStatus: z.nativeEnum(VerificationStatus).default(VerificationStatus.PENDING),
  ocrExtractedFields: z.record(z.string(), z.unknown()).nullable().optional(),
  ocrConfidence: z.number().nullable().optional(),
  crossDocValidation: z.record(z.string(), z.unknown()).nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  uploadedAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export type ApplicationDocumentDTO = z.infer<typeof applicationDocumentSchema>;
export type ApplicationDocument = ApplicationDocumentDTO;

export const applicationSchema = z.object({
  id: z.string().uuid(),
  applicationNumber: z.string().min(1),
  applicantId: z.string().uuid(),
  schemeId: z.string().uuid(),
  schemeVersionId: z.string().uuid(),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.DRAFT),
  formData: z.record(z.string(), z.unknown()),
  meritScore: z.number().nullable().optional(),
  ruleEvaluationResults: z.unknown().nullable().optional(),
  submittedAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  verifiedAt: z.union([z.string().datetime(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  documents: z.array(applicationDocumentSchema).optional(),
  scheme: schemeSchema.optional(),
  schemeVersion: schemeVersionSchema.optional(),
});

export type ApplicationDTO = z.infer<typeof applicationSchema>;
export type Application = ApplicationDTO;
