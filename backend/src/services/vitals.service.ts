import { prisma } from '../config/database.js';

export class VitalsService {
  static evaluateTriageLevel(vitals: {
    systolic: number;
    diastolic: number;
    temperature: number;
    heartRate: number;
    spO2?: number | null;
  }): 'NORMAL' | 'ELEVATED' | 'CRITICAL' {
    const { systolic, diastolic, temperature, heartRate, spO2 } = vitals;

    // Critical red flag thresholds
    if (
      systolic >= 160 ||
      systolic <= 85 ||
      diastolic >= 105 ||
      temperature >= 39.2 ||
      temperature <= 35.0 ||
      heartRate >= 125 ||
      heartRate <= 45 ||
      (spO2 != null && spO2 <= 89)
    ) {
      return 'CRITICAL';
    }

    // Elevated yellow flag thresholds
    if (
      systolic >= 130 ||
      diastolic >= 85 ||
      temperature >= 37.8 ||
      heartRate >= 100 ||
      (spO2 != null && spO2 <= 93)
    ) {
      return 'ELEVATED';
    }

    return 'NORMAL';
  }

  static async recordVitals(data: {
    patientId: string;
    consultationId?: string;
    systolic: number;
    diastolic: number;
    temperature: number;
    heartRate: number;
    spO2?: number;
    respiratoryRate?: number;
    weightKg?: number;
    clientRecordId?: string;
  }) {
    const triageLevel = this.evaluateTriageLevel(data);

    return prisma.vitalRecord.create({
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

  static async recordSymptom(data: {
    patientId: string;
    consultationId?: string;
    symptomName: string;
    durationDays: number;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
    description?: string;
  }) {
    return prisma.symptomRecord.create({
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

  static async getVitalsByPatient(patientId: string) {
    return prisma.vitalRecord.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      include: {
        clinicalImages: { include: { fileRecord: true } },
        voiceNotes: { include: { fileRecord: true } },
      },
    });
  }
}
