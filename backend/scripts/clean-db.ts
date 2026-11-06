import { prisma } from '../src/config/database.js';

async function inspectCounts() {
  console.log('--- Current Database Table Counts ---');
  console.log('ClinicalImages:  ', await prisma.clinicalImage.count());
  console.log('VoiceNotes:      ', await prisma.voiceNote.count());
  console.log('FileRecords:     ', await prisma.fileRecord.count());
  console.log('Prescriptions:   ', await prisma.prescription.count());
  console.log('SyncRecords:     ', await prisma.syncRecord.count());
  console.log('AuditLogs:       ', await prisma.auditLog.count());
  console.log('VitalRecords:    ', await prisma.vitalRecord.count());
  console.log('SymptomRecords:  ', await prisma.symptomRecord.count());
  console.log('MedicalRecords:  ', await prisma.medicalRecord.count());
  console.log('Consultations:   ', await prisma.consultation.count());
  console.log('PatientProfiles: ', await prisma.patientProfile.count());
  console.log('DoctorProfiles:  ', await prisma.doctorProfile.count());
  console.log('Users:           ', await prisma.user.count());
}

inspectCounts().catch(console.error);
