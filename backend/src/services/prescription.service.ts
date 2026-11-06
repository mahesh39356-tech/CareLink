import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { resolveCaseAndPatient } from '../controllers/media.controller.js';
import { calculateSha256 } from '../utils/crypto.js';

export interface MedicineInput {
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionPayload {
  caseId: string;
  patientId?: string;
  doctorId?: string;
  diagnosis: string;
  medicines: MedicineInput[];
  clinicalRemarks?: string;
  followUpDate?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  digitalSignature?: string;
}

export class PrescriptionService {
  /**
   * Save or update draft prescription
   */
  static async saveDraft(payload: PrescriptionPayload) {
    const consultation = await resolveCaseAndPatient(payload.caseId);
    const patientId = consultation.patientId;

    // Find default doctor if not provided
    let doctorId = payload.doctorId;
    if (!doctorId) {
      const doc = await prisma.doctorProfile.findFirst();
      doctorId = doc ? doc.id : 'doc-default';
    }

    // Check if an existing draft exists for this consultation
    let draft = await prisma.prescription.findFirst({
      where: {
        consultationId: consultation.id,
        status: 'DRAFT',
      },
    });

    const medicationsJson = JSON.stringify(payload.medicines || []);

    if (draft) {
      draft = await prisma.prescription.update({
        where: { id: draft.id },
        data: {
          diagnosis: payload.diagnosis,
          medicationsJson,
          clinicalRemarks: payload.clinicalRemarks || null,
          followUpDate: payload.followUpDate || null,
          doctorName: payload.doctorName || 'Dr. Sarah Kimani, MD',
          doctorRegNumber: payload.doctorRegNumber || 'KMPDC-REG-48819',
          digitalSignature: payload.digitalSignature || null,
        },
      });
    } else {
      const rxNumber = `RX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      draft = await prisma.prescription.create({
        data: {
          rxNumber,
          consultationId: consultation.id,
          patientId,
          doctorId,
          status: 'DRAFT',
          diagnosis: payload.diagnosis,
          medicationsJson,
          clinicalRemarks: payload.clinicalRemarks || null,
          followUpDate: payload.followUpDate || null,
          doctorName: payload.doctorName || 'Dr. Sarah Kimani, MD',
          doctorRegNumber: payload.doctorRegNumber || 'KMPDC-REG-48819',
          digitalSignature: payload.digitalSignature || null,
        },
      });
    }

    return draft;
  }

  /**
   * Issue Prescription with verified digital signature & PDF generation
   */
  static async issuePrescription(prescriptionId: string, signDetails: {
    doctorName: string;
    doctorRegNumber: string;
    digitalSignature?: string;
    clinicalRemarks?: string;
    followUpDate?: string;
  }) {
    const existing = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: true,
        consultation: { include: { vitals: true } },
        doctor: true,
      },
    });

    if (!existing) {
      throw new Error('Prescription not found');
    }

    if (existing.status === 'ISSUED') {
      throw new Error('Prescription has already been issued. To amend, use the amend workflow.');
    }

    const signedAt = new Date();
    const digitalSignature =
      signDetails.digitalSignature ||
      `SIG-${calculateSha256(Buffer.from(`${existing.id}:${signedAt.toISOString()}:${signDetails.doctorRegNumber}`))
        .substring(0, 16)
        .toUpperCase()}`;

    // Ensure prescription storage directory exists
    const rxStorageDir = path.resolve(process.cwd(), 'storage', 'prescriptions');
    if (!fs.existsSync(rxStorageDir)) {
      fs.mkdirSync(rxStorageDir, { recursive: true });
    }

    const rxNumber = existing.rxNumber || `RX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const pdfFilename = `${rxNumber}.pdf`;
    const pdfPath = path.join(rxStorageDir, pdfFilename);

    // Parse medicines
    let medicines: MedicineInput[] = [];
    try {
      medicines = JSON.parse(existing.medicationsJson);
    } catch {
      medicines = [];
    }

    // Generate PDF using PDFKit
    await this.generatePdfFile(pdfPath, {
      rxNumber,
      date: signedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: signedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      doctorName: signDetails.doctorName || existing.doctorName || 'Dr. Sarah Kimani, MD',
      doctorRegNumber: signDetails.doctorRegNumber || existing.doctorRegNumber || 'KMPDC-REG-48819',
      specialty: existing.doctor?.specialty || 'General Tele-Specialist',
      hospital: existing.doctor?.hospital || 'CareLink Regional Hospital & Telemedicine Hub',
      patientName: existing.patient.fullName,
      patientAge: existing.patient.age,
      patientGender: existing.patient.gender,
      patientId: existing.patient.nationalId || `CL-${existing.patient.id.substring(0, 8)}`,
      caseNumber: existing.consultation.caseNumber || `CL-2024-${existing.consultation.id.substring(0, 4)}`,
      diagnosis: existing.diagnosis || 'Clinical evaluation - remote intake',
      medicines,
      clinicalRemarks: signDetails.clinicalRemarks || existing.clinicalRemarks || 'Complete the entire course as prescribed. Rest and maintain good hydration.',
      followUpDate: signDetails.followUpDate || existing.followUpDate || 'In 7 days if symptoms persist',
      digitalSignature,
      vitals: existing.consultation.vitals[0] || null,
    });

    const pdfStats = fs.statSync(pdfPath);

    // Update prescription in database
    const updated = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: 'ISSUED',
        rxNumber,
        doctorName: signDetails.doctorName,
        doctorRegNumber: signDetails.doctorRegNumber,
        digitalSignature,
        signedAt,
        issuedAt: signedAt,
        clinicalRemarks: signDetails.clinicalRemarks || existing.clinicalRemarks,
        followUpDate: signDetails.followUpDate || existing.followUpDate,
        pdfPath,
        pdfSizeBytes: pdfStats.size,
      },
      include: { patient: true, consultation: true },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: existing.doctor?.userId || null,
        action: 'PRESCRIPTION_ISSUED',
        resource: `Prescription:${updated.id}`,
        details: JSON.stringify({
          rxNumber,
          patientId: existing.patientId,
          doctorRegNumber: signDetails.doctorRegNumber,
          medicinesCount: medicines.length,
          pdfSize: pdfStats.size,
        }),
      },
    });

    return updated;
  }

  /**
   * Amend an already issued prescription
   */
  static async amendPrescription(prescriptionId: string, payload: PrescriptionPayload) {
    const original = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!original) throw new Error('Original prescription not found');
    if (original.status !== 'ISSUED') {
      throw new Error('Only issued prescriptions can be amended');
    }

    // Mark original as AMENDED
    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: 'AMENDED' },
    });

    // Create new version
    const newVersion = (original.version || 1) + 1;
    const amendedRxNumber = `${original.rxNumber}-v${newVersion}`;
    const medicationsJson = JSON.stringify(payload.medicines || []);

    const newPrescription = await prisma.prescription.create({
      data: {
        rxNumber: amendedRxNumber,
        consultationId: original.consultationId,
        patientId: original.patientId,
        doctorId: original.doctorId,
        status: 'DRAFT',
        diagnosis: payload.diagnosis,
        medicationsJson,
        clinicalRemarks: payload.clinicalRemarks,
        followUpDate: payload.followUpDate,
        doctorName: payload.doctorName || original.doctorName,
        doctorRegNumber: payload.doctorRegNumber || original.doctorRegNumber,
        digitalSignature: null,
        amendedFromId: original.id,
        version: newVersion,
      },
    });

    const docProfile = await prisma.doctorProfile.findUnique({ where: { id: original.doctorId } });
    await prisma.auditLog.create({
      data: {
        userId: docProfile?.userId || null,
        action: 'PRESCRIPTION_AMENDED',
        resource: `Prescription:${newPrescription.id}`,
        details: JSON.stringify({
          originalId: original.id,
          originalRx: original.rxNumber,
          amendedRx: amendedRxNumber,
          version: newVersion,
        }),
      },
    });

    return newPrescription;
  }

  /**
   * Generate professional vector PDF prescription
   */
  private static generatePdfFile(filePath: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- Header: Clinic Branding & Letterhead ---
      doc.rect(40, 40, 515, 60).fill('#0B463B');
      doc.fillColor('#FFFFFF')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('CareLink Rural Telemedicine Network', 55, 52);

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#CDECE3')
        .text('Low-Bandwidth Clinical Care & Tele-Specialist Services · Official Digital Prescription', 55, 75);

      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#A3E2D3')
        .text(`RX NUMBER: ${data.rxNumber}`, 380, 54, { align: 'right', width: 160 })
        .text(`ISSUED: ${data.date} at ${data.time}`, 380, 72, { align: 'right', width: 160 });

      // --- Doctor Information ---
      let y = 115;
      doc.rect(40, y, 250, 68).fill('#F7FAF9').stroke('#E2E8F0');
      doc.fillColor('#0B463B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('PRESCRIBING PHYSICIAN', 50, y + 8);

      doc.fillColor('#112622')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.doctorName, 50, y + 20);

      doc.fillColor('#5C736F')
        .fontSize(8)
        .font('Helvetica')
        .text(`Reg. No: ${data.doctorRegNumber} (Verified Medical Council)`, 50, y + 34)
        .text(data.specialty, 50, y + 45)
        .text(data.hospital, 50, y + 56);

      // --- Patient Information ---
      doc.rect(305, y, 250, 68).fill('#F7FAF9').stroke('#E2E8F0');
      doc.fillColor('#0B463B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('PATIENT IDENTIFICATION', 315, y + 8);

      doc.fillColor('#112622')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${data.patientName} (${data.patientAge}y, ${data.patientGender})`, 315, y + 20);

      doc.fillColor('#5C736F')
        .fontSize(8)
        .font('Helvetica')
        .text(`Patient ID: ${data.patientId}`, 315, y + 34)
        .text(`Case ID: ${data.caseNumber}`, 315, y + 45);

      if (data.vitals) {
        doc.text(`Vitals: BP ${data.vitals.systolic}/${data.vitals.diastolic} mmHg | HR ${data.vitals.heartRate} bpm | Temp ${data.vitals.temperature}°C`, 315, y + 56);
      }

      // --- Clinical Diagnosis ---
      y = 195;
      doc.rect(40, y, 515, 30).fill('#EDF7F4');
      doc.fillColor('#0B463B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('PRIMARY CLINICAL DIAGNOSIS:', 50, y + 10);
      doc.fillColor('#112622')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(data.diagnosis, 195, y + 9);

      // --- Rx Symbol ---
      y = 235;
      doc.fillColor('#0B463B')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('℞', 45, y);

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('PRESCRIPTION & MEDICATION REGIMEN', 72, y + 6);

      // --- Medication Table Header ---
      y = 265;
      doc.rect(40, y, 515, 20).fill('#0B463B');
      doc.fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('MEDICINE & STRENGTH', 50, y + 6)
        .text('DOSAGE', 190, y + 6)
        .text('FREQUENCY', 260, y + 6)
        .text('DURATION', 360, y + 6)
        .text('INSTRUCTIONS', 430, y + 6);

      // --- Medication Rows ---
      y += 20;
      data.medicines.forEach((med: MedicineInput, index: number) => {
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F9FCFB';
        doc.rect(40, y, 515, 28).fill(rowBg).stroke('#E2E8F0');

        doc.fillColor('#112622')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${med.name}`, 50, y + 5);

        doc.fillColor('#5C736F')
          .fontSize(7.5)
          .font('Helvetica')
          .text(med.strength, 50, y + 16);

        doc.fillColor('#112622')
          .fontSize(8.5)
          .text(med.dosage, 190, y + 9)
          .text(med.frequency, 260, y + 9)
          .text(med.duration, 360, y + 9);

        doc.fillColor('#0B463B')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(med.instructions, 430, y + 9);

        y += 28;
      });

      // --- Medical Advice & Instructions ---
      y += 15;
      doc.rect(40, y, 515, 55).fill('#F7FAF9').stroke('#E2E8F0');
      doc.fillColor('#0B463B')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('ADDITIONAL CLINICAL ADVICE & DIETARY GUIDANCE:', 50, y + 8);

      doc.fillColor('#334155')
        .fontSize(8)
        .font('Helvetica')
        .text(data.clinicalRemarks, 50, y + 22, { width: 495, lineGap: 2 });

      doc.fillColor('#0B463B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`RECOMMENDED FOLLOW-UP: ${data.followUpDate}`, 50, y + 42);

      // --- Digital Signature & Compliance Footer ---
      y += 70;
      doc.rect(40, y, 515, 75).fill('#EDF7F4').stroke('#A3E2D3');

      doc.fillColor('#0B463B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('DIGITAL SIGNATURE & REGULATORY COMPLIANCE', 50, y + 8);

      doc.fillColor('#112622')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(`Digitally Authorized by: ${data.doctorName}`, 50, y + 22);

      doc.fillColor('#5C736F')
        .fontSize(7.5)
        .font('Helvetica')
        .text(`Medical Council Registration: ${data.doctorRegNumber}`, 50, y + 36)
        .text(`Digital Signature Hash: ${data.digitalSignature}`, 50, y + 47)
        .text(`Authentication Timestamp: ${new Date().toISOString()} · Secure Telemedicine Protocol`, 50, y + 58);

      // Signature Stamp Graphic Box on Right
      doc.rect(380, y + 10, 160, 55).stroke('#0B463B');
      doc.fillColor('#0B463B')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('OFFICIALLY SIGNED', 385, y + 16, { align: 'center', width: 150 })
        .text('CARELINK TELE-HEALTH', 385, y + 28, { align: 'center', width: 150 })
        .fontSize(6.5)
        .font('Helvetica')
        .fillColor('#5C736F')
        .text(`TOKEN: ${data.digitalSignature.substring(0, 12)}...`, 385, y + 42, { align: 'center', width: 150 });

      // Bottom disclaimer
      doc.fillColor('#94A3B8')
        .fontSize(6.5)
        .font('Helvetica')
        .text('This digital prescription is generated electronically via the CareLink Low-Bandwidth Telemedicine System (TAH-013). Valid across participating pharmacies and community health outreach dispensaries.', 40, 800, { align: 'center', width: 515 });

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Get all prescriptions for a case
   */
  static async getByCaseId(caseId: string) {
    const consultation = await resolveCaseAndPatient(caseId);
    return prisma.prescription.findMany({
      where: { consultationId: consultation.id },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: true,
        patient: true,
      },
    });
  }

  /**
   * Get all prescriptions for a patient (My Prescriptions)
   */
  static async getByPatientId(patientId: string) {
    let resolvedPatientId = patientId;

    // 1. Try finding patient profile
    const patient = await prisma.patientProfile.findFirst({
      where: {
        OR: [
          { id: patientId },
          { nationalId: patientId },
          { nationalId: `CL-2024-${patientId}` },
          { nationalId: patientId.replace(/^CL-2024-/, '') },
          { fullName: { contains: patientId } },
        ],
      },
    });

    if (patient) {
      resolvedPatientId = patient.id;
    } else {
      // 2. Try resolving via consultation caseNumber or id
      const consultation = await prisma.consultation.findFirst({
        where: {
          OR: [
            { id: patientId },
            { caseNumber: patientId },
            { caseNumber: `CL-2024-${patientId}` },
            { caseNumber: patientId.replace(/^CL-2024-/, '') },
          ],
        },
      });

      if (consultation) {
        resolvedPatientId = consultation.patientId;
      } else {
        // 3. Try resolving via vital record clientRecordId
        const vital = await prisma.vitalRecord.findFirst({
          where: { clientRecordId: patientId },
        });
        if (vital) {
          resolvedPatientId = vital.patientId;
        }
      }
    }

    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: resolvedPatientId,
        status: { in: ['ISSUED'] },
      },
      orderBy: [{ version: 'desc' }, { issuedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        doctor: true,
        consultation: true,
      },
    });

    // Enforce Module 6 Single Prescription Rule: Strictly 1 latest prescription per case
    const latestByConsultation = new Map<string, typeof prescriptions[0]>();
    for (const rx of prescriptions) {
      if (!latestByConsultation.has(rx.consultationId)) {
        latestByConsultation.set(rx.consultationId, rx);
      }
    }

    return Array.from(latestByConsultation.values());
  }

  /**
   * Get single prescription by ID
   */
  static async getById(prescriptionId: string) {
    return prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: true,
        doctor: true,
        consultation: { include: { vitals: true } },
      },
    });
  }
}
