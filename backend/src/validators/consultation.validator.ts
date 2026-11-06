import { z } from 'zod';

export const requestConsultationSchema = z.object({
  body: z.object({
    patientId: z.string().min(1),
    priority: z.enum(['ROUTINE', 'URGENT']).default('ROUTINE'),
    reason: z.string().optional(),
    vitals: z.object({
      systolic: z.number().default(120),
      diastolic: z.number().default(80),
      temperature: z.number().default(36.8),
      heartRate: z.number().default(72),
    }).optional(),
  }),
});

export const prescribeSchema = z.object({
  body: z.object({
    consultationId: z.string().min(1),
    clinicalRemarks: z.string().min(1, 'Clinical remarks required'),
    medications: z.array(
      z.object({
        drugName: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        durationDays: z.number().int().min(1),
        instructions: z.string().optional(),
      })
    ).optional(),
    digitalSignature: z.string().optional(),
  }),
});
