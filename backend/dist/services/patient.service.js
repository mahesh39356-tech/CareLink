"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientService = void 0;
const database_js_1 = require("../config/database.js");
class PatientService {
    static async searchPatients(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search } },
                { nationalId: { contains: query.search } },
                { village: { contains: query.search } },
            ];
        }
        if (query.clinic) {
            where.clinic = { contains: query.clinic };
        }
        const [total, patients] = await Promise.all([
            database_js_1.prisma.patientProfile.count({ where }),
            database_js_1.prisma.patientProfile.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
                    consultations: { orderBy: { requestedAt: 'desc' }, take: 1 },
                },
            }),
        ]);
        return { total, page, limit, patients };
    }
    static async getPatientById(id) {
        const patient = await database_js_1.prisma.patientProfile.findUnique({
            where: { id },
            include: {
                vitals: { orderBy: { recordedAt: 'desc' } },
                symptoms: { orderBy: { recordedAt: 'desc' } },
                consultations: {
                    orderBy: { requestedAt: 'desc' },
                    include: {
                        doctor: true,
                        prescriptions: true,
                    },
                },
                clinicalImages: { include: { fileRecord: true } },
                voiceNotes: { include: { fileRecord: true } },
            },
        });
        if (!patient)
            throw new Error('Patient not found');
        return patient;
    }
    static async createPatient(data) {
        return database_js_1.prisma.patientProfile.create({
            data: {
                fullName: data.fullName,
                age: data.age,
                gender: data.gender,
                nationalId: data.nationalId || null,
                bloodGroup: data.bloodGroup || null,
                allergies: data.allergies || null,
                chronicConditions: data.chronicConditions || null,
                emergencyContact: data.emergencyContact || null,
                village: data.village || null,
                clinic: data.clinic || 'Kijani Rural Clinic',
                syncHistory: data.syncHistory ?? true,
            },
        });
    }
}
exports.PatientService = PatientService;
