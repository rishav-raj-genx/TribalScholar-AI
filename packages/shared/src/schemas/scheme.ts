import { z } from 'zod';
import { SchemeCode } from '../enums.js';

export const schemeSchema = z.object({
  id: z.string().uuid(),
  code: z.nativeEnum(SchemeCode),
  name: z.string().min(1),
  description: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export type SchemeDTO = z.infer<typeof schemeSchema>;
export type Scheme = SchemeDTO;

export const schemeVersionSchema = z.object({
  id: z.string().uuid(),
  schemeId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  academicYear: z.string().min(4),
  totalSlots: z.number().int().positive(),
  incomeCeiling: z.union([z.number().nonnegative(), z.string()]),
  eligibilityRules: z.unknown(),
  documentRequirements: z.unknown(),
  scoringConfig: z.unknown().nullable().optional(),
  startDate: z.union([z.string().datetime(), z.date()]),
  endDate: z.union([z.string().datetime(), z.date()]),
  isPublished: z.boolean().default(false),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  scheme: schemeSchema.optional(),
});

export type SchemeVersionDTO = z.infer<typeof schemeVersionSchema>;
export type SchemeVersion = SchemeVersionDTO;
