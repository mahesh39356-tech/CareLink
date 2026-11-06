"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.loginSchema = exports.registerDoctorSchema = exports.registerPatientSchema = void 0;
const zod_1 = require("zod");
exports.registerPatientSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters'),
        age: zod_1.z.coerce.number().int().min(0).max(125),
        gender: zod_1.z.enum(['Female', 'Male', 'Other']),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().min(7, 'Phone number must be at least 7 digits').optional(),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters').default('RuralCare2026!'),
        nationalId: zod_1.z.string().optional(),
        bloodGroup: zod_1.z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
        allergies: zod_1.z.string().optional(),
        chronicConditions: zod_1.z.string().optional(),
        emergencyContact: zod_1.z.string().optional(),
        village: zod_1.z.string().optional(),
        clinic: zod_1.z.string().default('Kijani Rural Clinic'),
    }),
});
exports.registerDoctorSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(2),
        email: zod_1.z.string().email(),
        phone: zod_1.z.string().min(7).optional(),
        password: zod_1.z.string().min(8),
        licenseNumber: zod_1.z.string().min(3),
        specialty: zod_1.z.string().default('General Tele-Specialist'),
        hospital: zod_1.z.string().default('CareLink Regional Hospital'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        identifier: zod_1.z.string().min(1, 'Email or Phone or National ID required'),
        password: zod_1.z.string().min(1, 'Password required'),
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token required'),
    }),
});
