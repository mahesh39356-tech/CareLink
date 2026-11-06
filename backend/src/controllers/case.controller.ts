import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { resolveCaseAndPatient } from './media.controller.js';
import { VitalsService } from '../services/vitals.service.js';

export class CaseController {
  /**
   * POST /api/cases
   * Creates a medical case for a patient
   */
  static async createCase(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        patientId,
        fullName,
        age,
        gender,
        clinic,
        village,
        symptoms,
        symptomDuration,
        vitals,
        priority,
        notes,
      } = req.body;

      if (!fullName && !patientId) {
        return res.status(400).json({ success: false, error: 'Patient name or ID is required' });
      }

      // 1. Resolve or create patient profile
      let patient = null;
      if (patientId) {
        patient = await prisma.patientProfile.findFirst({
          where: {
            OR: [
              { id: patientId },
              { nationalId: patientId },
              { nationalId: `CL-2024-${patientId}` },
              { nationalId: patientId.replace(/^CL-2024-/, '') },
            ],
          },
        });
      }

      if (!patient && fullName) {
        const uniqueId = `CL-${Date.now().toString().slice(-4)}`;
        patient = await prisma.patientProfile.create({
          data: {
            fullName,
            age: Number(age) || 30,
            gender: gender || 'Female',
            clinic: clinic || 'Kijani Rural Clinic',
            village: village || 'Rural Outpost',
            nationalId: uniqueId,
          },
        });
      }

      if (!patient) {
        return res.status(400).json({ success: false, error: 'Could not resolve or create patient' });
      }

      // 2. Generate unique Case Number
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const caseNumber = `CL-2024-${randomSuffix}`;

      // 3. Create Consultation Case
      const consultation = await prisma.consultation.create({
        data: {
          caseNumber,
          patientId: patient.id,
          priority: priority || 'ROUTINE',
          reason: symptoms || notes || 'Remote Clinical Intake',
          status: 'SUBMITTED',
        },
      });

      // 4. Create Vitals Record if provided
      if (vitals) {
        const triageLevel = VitalsService.evaluateTriageLevel({
          systolic: Number(vitals.systolic) || 120,
          diastolic: Number(vitals.diastolic) || 80,
          temperature: Number(vitals.temperature) || 36.8,
          heartRate: Number(vitals.heartRate) || 72,
          spO2: vitals.spO2 ? Number(vitals.spO2) : undefined,
        });

        await prisma.vitalRecord.create({
          data: {
            patientId: patient.id,
            consultationId: consultation.id,
            systolic: Number(vitals.systolic) || 120,
            diastolic: Number(vitals.diastolic) || 80,
            temperature: Number(vitals.temperature) || 36.8,
            heartRate: Number(vitals.heartRate) || 72,
            triageLevel,
          },
        });
      }

      // 5. Create Symptom Record if provided
      if (symptoms) {
        await prisma.symptomRecord.create({
          data: {
            patientId: patient.id,
            consultationId: consultation.id,
            symptomName: typeof symptoms === 'string' ? symptoms : 'Reported Symptoms',
            durationDays: Number(symptomDuration) || 3,
            description: notes || null,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Medical case submitted successfully',
        data: {
          caseId: consultation.id,
          caseNumber: consultation.caseNumber,
          patientId: patient.id,
          patientName: patient.fullName,
          status: consultation.status,
          createdAt: consultation.requestedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases
   * Retrieves cases for doctor inbox or patient filtered
   */
  static async getAllCases(req: Request, res: Response, next: NextFunction) {
    try {
      const patientIdParam = req.query.patientId as string;

      let whereClause: any = {};
      if (patientIdParam) {
        // Filter by patient
        const patient = await prisma.patientProfile.findFirst({
          where: {
            OR: [
              { id: patientIdParam },
              { nationalId: patientIdParam },
              { nationalId: `CL-2024-${patientIdParam}` },
              { nationalId: patientIdParam.replace(/^CL-2024-/, '') },
            ],
          },
        });
        if (patient) {
          whereClause.patientId = patient.id;
        } else {
          whereClause.patientId = patientIdParam;
        }
      }

      const consultations = await prisma.consultation.findMany({
        where: whereClause,
        orderBy: { requestedAt: 'desc' },
        include: {
          patient: true,
          doctor: true,
          vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
          symptoms: { orderBy: { recordedAt: 'desc' }, take: 1 },
          clinicalImages: true,
          voiceNotes: true,
          prescriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      const formatted = consultations.map((c) => {
        const latestVital = c.vitals[0] || null;
        const latestPrescription = c.prescriptions[0] || null;

        return {
          id: c.id,
          caseId: c.caseNumber || `CL-2024-${c.id.slice(0, 4)}`,
          caseNumber: c.caseNumber || `CL-2024-${c.id.slice(0, 4)}`,
          patientId: c.patientId,
          patientName: c.patient?.fullName || 'Unknown Patient',
          patientAge: c.patient?.age || 30,
          patientGender: c.patient?.gender || 'Female',
          clinic: c.patient?.clinic || 'Kijani Rural Clinic',
          submissionDate: c.requestedAt,
          status: latestPrescription?.status === 'ISSUED' ? 'REVIEWED' : c.status || 'SUBMITTED',
          priority: c.priority,
          symptoms: c.symptoms[0]?.symptomName || c.reason || 'General Intake',
          assignedDoctor: c.doctor?.fullName || 'Dr. Sarah Kimani, MD',
          imagesCount: c.clinicalImages.length,
          audioCount: c.voiceNotes.length,
          hasPrescription: !!latestPrescription,
          prescriptionStatus: latestPrescription?.status || 'NONE',
          prescriptionId: latestPrescription?.id || null,
          vitals: latestVital
            ? {
                systolic: latestVital.systolic,
                diastolic: latestVital.diastolic,
                temperature: latestVital.temperature,
                heartRate: latestVital.heartRate,
                triageLevel: latestVital.triageLevel,
              }
            : null,
        };
      });

      res.status(200).json({
        success: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases/:caseId
   * Retrieves complete patient case details with images, audio, vitals, and prescription
   */
  static async getCaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const caseId = req.params.caseId;
      const consultation = await resolveCaseAndPatient(caseId);

      const detailed = await prisma.consultation.findUnique({
        where: { id: consultation.id },
        include: {
          patient: true,
          doctor: true,
          vitals: { orderBy: { recordedAt: 'desc' } },
          symptoms: { orderBy: { recordedAt: 'desc' } },
          clinicalImages: { include: { fileRecord: true } },
          voiceNotes: { include: { fileRecord: true } },
          prescriptions: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!detailed) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }

      // Format images
      const images = detailed.clinicalImages.map((img) => ({
        id: img.id,
        fileRecordId: img.fileRecordId,
        label: img.label,
        bodySite: img.bodySite,
        originalFilename: img.fileRecord.originalFilename,
        originalSizeBytes: img.fileRecord.originalSizeBytes,
        compressedSizeBytes: img.fileRecord.compressedSizeBytes || img.fileRecord.originalSizeBytes,
        compressionRatio: img.fileRecord.compressedSizeBytes
          ? +(
              (1 - img.fileRecord.compressedSizeBytes / img.fileRecord.originalSizeBytes) *
              100
            ).toFixed(1)
          : 0,
        url: `/api/images/${img.id}`,
        downloadUrl: `/api/images/${img.id}?download=true`,
        capturedAt: img.capturedAt,
      }));

      // Format audio
      const audio = detailed.voiceNotes.map((vn) => ({
        id: vn.id,
        fileRecordId: vn.fileRecordId,
        language: vn.language,
        durationSeconds: vn.durationSeconds,
        codec: vn.codec,
        sizeKb: +(vn.fileRecord.originalSizeBytes / 1024).toFixed(2),
        url: `/api/audio/${vn.id}`,
        recordedAt: vn.recordedAt,
      }));

      // Find the single active prescription (latest issued or latest draft)
      const activePrescription =
        detailed.prescriptions.find((p) => p.status === 'ISSUED') ||
        detailed.prescriptions[0] ||
        null;

      const caseStatus = activePrescription?.status === 'ISSUED' ? 'REVIEWED' : detailed.status || 'SUBMITTED';

      res.status(200).json({
        success: true,
        data: {
          id: detailed.id,
          caseNumber: detailed.caseNumber || `CL-2024-${detailed.id.slice(0, 4)}`,
          status: caseStatus,
          priority: detailed.priority,
          requestedAt: detailed.requestedAt,
          patient: detailed.patient,
          vitals: detailed.vitals[0] || null,
          symptoms: detailed.symptoms,
          images,
          audio,
          prescription: activePrescription
            ? {
                ...activePrescription,
                pdfDownloadUrl: `/api/prescriptions/${activePrescription.id}/pdf`,
              }
            : null,
          doctor: detailed.doctor || {
            fullName: 'Dr. Sarah Kimani, MD',
            licenseNumber: 'KMPDC-REG-48819',
            specialty: 'General Tele-Specialist',
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
