"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationService = void 0;
const database_js_1 = require("../config/database.js");
class ConsultationService {
    static async requestConsultation(data) {
        const consultation = await database_js_1.prisma.consultation.create({
            data: {
                patientId: data.patientId,
                priority: data.priority || 'ROUTINE',
                reason: data.reason || 'Rural Tele-Consultation Request',
                status: 'PENDING',
            },
        });
        if (data.vitals) {
            await database_js_1.prisma.vitalRecord.create({
                data: {
                    patientId: data.patientId,
                    consultationId: consultation.id,
                    systolic: data.vitals.systolic,
                    diastolic: data.vitals.diastolic,
                    temperature: data.vitals.temperature,
                    heartRate: data.vitals.heartRate,
                },
            });
        }
        return consultation;
    }
    static async getDoctorCases() {
        return database_js_1.prisma.consultation.findMany({
            orderBy: { requestedAt: 'desc' },
            include: {
                patient: {
                    include: {
                        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
                        clinicalImages: { include: { fileRecord: true }, take: 1 },
                        voiceNotes: { include: { fileRecord: true }, take: 1 },
                    },
                },
                vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
                doctor: true,
                prescriptions: true,
            },
        });
    }
    static async getConsultationDetail(id) {
        const consultation = await database_js_1.prisma.consultation.findUnique({
            where: { id },
            include: {
                patient: {
                    include: {
                        vitals: { orderBy: { recordedAt: 'desc' } },
                        symptoms: { orderBy: { recordedAt: 'desc' } },
                        clinicalImages: { include: { fileRecord: true } },
                        voiceNotes: { include: { fileRecord: true } },
                    },
                },
                vitals: { orderBy: { recordedAt: 'desc' } },
                symptoms: true,
                prescriptions: true,
                doctor: true,
            },
        });
        if (!consultation)
            throw new Error('Consultation not found');
        return consultation;
    }
    static async issuePrescription(data) {
        const consultation = await database_js_1.prisma.consultation.findUnique({
            where: { id: data.consultationId },
        });
        if (!consultation)
            throw new Error('Consultation not found');
        const prescription = await database_js_1.prisma.prescription.create({
            data: {
                consultationId: data.consultationId,
                doctorId: data.doctorId,
                patientId: consultation.patientId,
                clinicalRemarks: data.clinicalRemarks,
                medicationsJson: JSON.stringify(data.medications || []),
                digitalSignature: data.digitalSignature || `DR_SIG_${Date.now()}`,
            },
        });
        await database_js_1.prisma.consultation.update({
            where: { id: data.consultationId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                clinicalAdvice: data.clinicalRemarks,
            },
        });
        return prescription;
    }
}
exports.ConsultationService = ConsultationService;
