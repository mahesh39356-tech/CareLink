import { prisma } from '../config/database.js';

export class PatientService {
  static async searchPatients(query: { search?: string; clinic?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
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
      prisma.patientProfile.count({ where }),
      prisma.patientProfile.findMany({
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

  static async getPatientById(id: string) {
    const patient = await prisma.patientProfile.findUnique({
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

    if (!patient) throw new Error('Patient not found');
    return patient;
  }

  static async createPatient(data: {
    fullName: string;
    age: number;
    gender: string;
    nationalId?: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    emergencyContact?: string;
    village?: string;
    clinic?: string;
    syncHistory?: boolean;
  }) {
    return prisma.patientProfile.create({
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
