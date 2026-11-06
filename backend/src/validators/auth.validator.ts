import { z } from 'zod';

export const registerPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    age: z.coerce.number().int().min(0).max(125),
    gender: z.enum(['Female', 'Male', 'Other']),
    email: z.string().email().optional(),
    phone: z.string().min(7, 'Phone number must be at least 7 digits').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').default('RuralCare2026!'),
    nationalId: z.string().optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.string().optional(),
    chronicConditions: z.string().optional(),
    emergencyContact: z.string().optional(),
    village: z.string().optional(),
    clinic: z.string().default('Kijani Rural Clinic'),
  }),
});

export const registerDoctorSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7).optional(),
    password: z.string().min(8),
    licenseNumber: z.string().min(3),
    specialty: z.string().default('General Tele-Specialist'),
    hospital: z.string().default('CareLink Regional Hospital'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Email or Phone or National ID required'),
    password: z.string().min(1, 'Password required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token required'),
  }),
});
