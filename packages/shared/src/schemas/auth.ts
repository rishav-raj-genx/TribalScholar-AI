import { z } from 'zod';
import { Role } from '../enums.js';

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().min(10).max(15).optional(),
  role: z.nativeEnum(Role).default(Role.APPLICANT),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.nativeEnum(Role),
  phone: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date().or(z.string()),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userProfileSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
