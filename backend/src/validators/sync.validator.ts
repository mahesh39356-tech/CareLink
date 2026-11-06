import { z } from 'zod';

export const syncBatchSchema = z.object({
  body: z.object({
    clientId: z.string().min(1, 'Client ID required'),
    idempotencyKey: z.string().min(8, 'Idempotency key required'),
    timestamp: z.string(),
    records: z.array(
      z.object({
        clientRecordId: z.string(),
        fullName: z.string(),
        age: z.coerce.number(),
        gender: z.string(),
        systolic: z.coerce.number().default(120),
        diastolic: z.coerce.number().default(80),
        temperature: z.coerce.number().default(36.8),
        heartRate: z.coerce.number().default(72),
        clinic: z.string().default('Kijani Rural Clinic'),
        voiceLanguage: z.string().optional(),
        photoUrl: z.string().optional(),
        audioUrl: z.string().optional(),
      })
    ).min(1, 'At least 1 record required in batch'),
  }),
});
