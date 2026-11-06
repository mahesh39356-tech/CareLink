import { z } from 'zod';

export const createVitalSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID required'),
    consultationId: z.string().optional(),
    systolic: z.coerce.number().int().min(50).max(300).default(120),
    diastolic: z.coerce.number().int().min(30).max(200).default(80),
    temperature: z.coerce.number().min(30.0).max(45.0).default(36.8),
    heartRate: z.coerce.number().int().min(30).max(250).default(72),
    spO2: z.coerce.number().int().min(50).max(100).optional().default(98),
    respiratoryRate: z.coerce.number().int().min(5).max(60).optional().default(16),
    weightKg: z.coerce.number().optional(),
    clientRecordId: z.string().optional(),
  }),
});

export const createSymptomSchema = z.object({
  body: z.object({
    patientId: z.string().min(1),
    consultationId: z.string().optional(),
    symptomName: z.string().min(1),
    durationDays: z.coerce.number().int().min(1).default(1),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).default('MODERATE'),
    description: z.string().optional(),
  }),
});
