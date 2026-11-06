import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().default('carelink_super_secret_jwt_key_rural_telemedicine_2026'),
  JWT_REFRESH_SECRET: z.string().default('carelink_super_secret_refresh_key_2026'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:4173,capacitor://localhost'),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  STORAGE_ROOT: z.string().default(path.resolve(process.cwd(), 'storage')),
});

export const env = envSchema.parse(process.env);
