import { z } from 'zod';
import {
  ApplicationStatus,
  ReviewDecision,
  SchemeCode,
} from '../enums.js';

export const applicantProfileSchema = z.object({
  dateOfBirth: z.string().datetime().or(z.date()),
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
});

export type ApplicantProfileInput = z.infer<typeof applicantProfileSchema>;

export const createApplicationSchema = z.object({
  schemeCode: z.nativeEnum(SchemeCode),
  schemeVersionId: z.string().uuid(),
  formData: z.record(z.string(), z.unknown()),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  formData: z.record(z.string(), z.unknown()).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

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
