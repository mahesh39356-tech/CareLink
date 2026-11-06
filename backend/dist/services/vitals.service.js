"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VitalsService = void 0;
const database_js_1 = require("../config/database.js");
class VitalsService {
    static evaluateTriageLevel(vitals) {
        const { systolic, diastolic, temperature, heartRate, spO2 } = vitals;
        // Critical red flag thresholds
        if (systolic >= 160 ||
            systolic <= 85 ||
            diastolic >= 105 ||
            temperature >= 39.2 ||
            temperature <= 35.0 ||
            heartRate >= 125 ||
            heartRate <= 45 ||
            (spO2 != null && spO2 <= 89)) {
            return 'CRITICAL';
        }
        // Elevated yellow flag thresholds
        if (systolic >= 130 ||
            diastolic >= 85 ||
            temperature >= 37.8 ||
            heartRate >= 100 ||
            (spO2 != null && spO2 <= 93)) {
            return 'ELEVATED';
        }
        return 'NORMAL';
    }
    static async recordVitals(data) {
        const triageLevel = this.evaluateTriageLevel(data);
        return database_js_1.prisma.vitalRecord.create({
            data: {
                patientId: data.patientId,
                consultationId: data.consultationId || null,
                systolic: data.systolic,
                diastolic: data.diastolic,
                temperature: data.temperature,
                heartRate: data.heartRate,
                spO2: data.spO2 ?? 98,
                respiratoryRate: data.respiratoryRate ?? 16,
                weightKg: data.weightKg || null,
                triageLevel,
                clientRecordId: data.clientRecordId || null,
            },
            include: { patient: true },
        });
    }
    static async recordSymptom(data) {
        return database_js_1.prisma.symptomRecord.create({
            data: {
                patientId: data.patientId,
                consultationId: data.consultationId || null,
                symptomName: data.symptomName,
                durationDays: data.durationDays,
                severity: data.severity,
                description: data.description || null,
            },
        });
    }
    static async getVitalsByPatient(patientId) {
        return database_js_1.prisma.vitalRecord.findMany({
            where: { patientId },
            orderBy: { recordedAt: 'desc' },
            include: {
                clinicalImages: { include: { fileRecord: true } },
                voiceNotes: { include: { fileRecord: true } },
            },
        });
    }
}
exports.VitalsService = VitalsService;
