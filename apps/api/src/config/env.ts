import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load .env from current working directory or workspace root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to process.cwd() .env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16).default('super_secret_jwt_key_tribalscholar_min32chars_required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // MinIO / S3 Configuration
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin123'),
  S3_BUCKET: z.string().default('tribalscholar-docs'),
  S3_USE_SSL: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .default(false),
  STORAGE_DRIVER: z.enum(['s3', 'local']).default('s3'),
  STORAGE_LOCAL_DIR: z.string().default('.storage-local'),

  // External Microservice URLs
  AI_OCR_URL: z.string().url().default('http://localhost:8000'),
  INTERNAL_API_KEY: z.string().default('tribalscholar_internal_secret_key_2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

export type Env = z.infer<typeof envSchema>;
export const env: Env = parsed.data;
