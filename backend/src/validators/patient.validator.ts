import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    age: z.coerce.number().int().min(0).max(125),
    gender: z.enum(['Female', 'Male', 'Other']),
    phone: z.string().optional(),
    nationalId: z.string().optional(),
    bloodGroup: z.string().optional(),
    allergies: z.string().optional(),
    chronicConditions: z.string().optional(),
    emergencyContact: z.string().optional(),
    village: z.string().optional(),
    clinic: z.string().default('Kijani Rural Clinic'),
    syncHistory: z.boolean().default(true),
  }),
});

export const searchPatientSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    clinic: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
  }),
});
