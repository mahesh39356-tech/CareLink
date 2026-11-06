import { prisma } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { storagePaths, initStorageDirectories } from '../src/config/storage.js';

async function cleanAllDatabaseEntries() {
  console.log('========================================================');
  console.log('🧹 CARELINK — CLEAN ALL ENTRIES INSIDE DATABASE');
  console.log('   (Preserving Database & Table Structures)');
  console.log('========================================================\n');

  // Step 1: Clean entries from all tables (child tables first to satisfy foreign keys)
  console.log('--- 1. DELETING ALL ENTRIES FROM TABLES ---');

  const countClinicalImages = await prisma.clinicalImage.deleteMany();
  console.log(`  ✓ Cleared ClinicalImage table (${countClinicalImages.count} deleted)`);

  const countVoiceNotes = await prisma.voiceNote.deleteMany();
  console.log(`  ✓ Cleared VoiceNote table (${countVoiceNotes.count} deleted)`);

  const countFileRecords = await prisma.fileRecord.deleteMany();
  console.log(`  ✓ Cleared FileRecord table (${countFileRecords.count} deleted)`);

  const countPrescriptions = await prisma.prescription.deleteMany();
  console.log(`  ✓ Cleared Prescription table (${countPrescriptions.count} deleted)`);

  const countVitals = await prisma.vitalRecord.deleteMany();
  console.log(`  ✓ Cleared VitalRecord table (${countVitals.count} deleted)`);

  const countSymptoms = await prisma.symptomRecord.deleteMany();
  console.log(`  ✓ Cleared SymptomRecord table (${countSymptoms.count} deleted)`);

  const countMedicalRecords = await prisma.medicalRecord.deleteMany();
  console.log(`  ✓ Cleared MedicalRecord table (${countMedicalRecords.count} deleted)`);

  const countConsultations = await prisma.consultation.deleteMany();
  console.log(`  ✓ Cleared Consultation table (${countConsultations.count} deleted)`);

  const countSyncRecords = await prisma.syncRecord.deleteMany();
  console.log(`  ✓ Cleared SyncRecord table (${countSyncRecords.count} deleted)`);

  const countAuditLogs = await prisma.auditLog.deleteMany();
  console.log(`  ✓ Cleared AuditLog table (${countAuditLogs.count} deleted)`);

  const countDoctorProfiles = await prisma.doctorProfile.deleteMany();
  console.log(`  ✓ Cleared DoctorProfile table (${countDoctorProfiles.count} deleted)`);

  const countPatientProfiles = await prisma.patientProfile.deleteMany();
  console.log(`  ✓ Cleared PatientProfile table (${countPatientProfiles.count} deleted)`);

  const countUsers = await prisma.user.deleteMany();
  console.log(`  ✓ Cleared User table (${countUsers.count} deleted)`);

  // Step 2: Clean physical storage directories
  console.log('\n--- 2. CLEANING PHYSICAL STORAGE DIRECTORIES ---');
  const storageDirsToClean = [
    storagePaths.original.images,
    storagePaths.compressed.images,
    storagePaths.original.audio,
    storagePaths.compressed.audio,
    storagePaths.prescriptions,
    storagePaths.original.json,
    storagePaths.compressed.json,
    storagePaths.decompressed.json,
  ];

  let filesRemovedCount = 0;
  for (const dir of storageDirsToClean) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fullPath = path.join(dir, f);
        try {
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
            filesRemovedCount++;
          }
        } catch {}
      }
    }
  }
  console.log(`  ✓ Removed ${filesRemovedCount} lingering files from ./storage directories`);

  // Ensure directories exist for upcoming uploads
  initStorageDirectories();
  console.log('  ✓ Initialized clean ./storage folder structure');

  // Step 3: Seed Clean Baseline Accounts (ZERO media, ZERO images, ZERO voice notes)
  // This allows the user to immediately log in as Patient 0418 or Doctor without 401 errors
  console.log('\n--- 3. SEEDING CLEAN BASELINE ACCOUNTS (NO MEDIA) ---');
  const passwordHash = await bcrypt.hash('RuralCare2026!', 10);

  // 1. Clean Doctor Account
  const doctorUser = await prisma.user.create({
    data: {
      email: 'doctor@carelink.org',
      passwordHash,
      role: 'DOCTOR',
      doctor: {
        create: {
          fullName: 'Dr. Sarah Nduta',
          licenseNumber: 'MED-KE-2024-0881',
          specialty: 'Tele-Dermatology & Internal Medicine',
          hospital: 'CareLink Regional Referral Hub',
        },
      },
    },
    include: { doctor: true },
  });
  console.log(`  ✓ Created Doctor Account: ${doctorUser.email} (Dr. Sarah Nduta)`);

  // 2. Clean Health Worker Account
  const healthWorker = await prisma.user.create({
    data: {
      email: 'asha.kijani@carelink.org',
      phone: '+254711223344',
      passwordHash,
      role: 'HEALTH_WORKER',
    },
  });
  console.log(`  ✓ Created Health Worker Account: ${healthWorker.email}`);

  // 3. Clean Baseline Patients (Amina 0418, Joseph 0419, Fatima 0420, Peter 0421)
  const patientsToSeed = [
    {
      id: '0418',
      nationalId: 'CL-2024-0418',
      fullName: 'Amina Mwangi',
      age: 34,
      gender: 'Female',
      clinic: 'Kijani Clinic',
      village: 'Kijani Village',
    },
    {
      id: '0419',
      nationalId: 'CL-2024-0419',
      fullName: 'Joseph Otieno',
      age: 51,
      gender: 'Male',
      clinic: 'Mara Health Post',
      village: 'Mara Sub-Location',
    },
    {
      id: '0420',
      nationalId: 'CL-2024-0420',
      fullName: 'Fatima Khalid',
      age: 29,
      gender: 'Female',
      clinic: 'Tana Dispensary',
      village: 'Tana North',
    },
    {
      id: '0421',
      nationalId: 'CL-2024-0421',
      fullName: 'Peter Kamau',
      age: 62,
      gender: 'Male',
      clinic: 'Nyeri Outreach',
      village: 'Nyeri Hill Area',
    },
  ];

  for (const p of patientsToSeed) {
    const patientRecord = await prisma.patientProfile.create({
      data: {
        id: p.id,
        nationalId: p.nationalId,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        clinic: p.clinic,
        village: p.village,
      },
    });

    // Create fresh empty consultation with 0 images, 0 voice notes
    await prisma.consultation.create({
      data: {
        id: `case_${p.id}`,
        caseNumber: p.nationalId,
        patientId: patientRecord.id,
        doctorId: doctorUser.doctor?.id,
        status: 'PENDING',
        priority: 'ROUTINE',
        reason: `Telemedicine Intake (${p.fullName})`,
      },
    });
    console.log(`  ✓ Initialized Clean Patient: ${p.fullName} (ID: ${p.id}, Case: ${p.nationalId}) — 0 images, 0 audio`);
  }

  // Step 4: Verify Database State
  console.log('\n--- 4. FINAL DATABASE STATUS ---');
  console.log('ClinicalImages:  ', await prisma.clinicalImage.count(), '(Clean 0 - Ready for upload)');
  console.log('VoiceNotes:      ', await prisma.voiceNote.count(), '(Clean 0 - Ready for recording)');
  console.log('FileRecords:     ', await prisma.fileRecord.count(), '(Clean 0)');
  console.log('Prescriptions:   ', await prisma.prescription.count(), '(Clean 0)');
  console.log('PatientProfiles: ', await prisma.patientProfile.count(), '(4 baseline demo accounts ready)');
  console.log('DoctorProfiles:  ', await prisma.doctorProfile.count(), '(1 doctor account ready)');
  console.log('Consultations:   ', await prisma.consultation.count(), '(4 fresh consultations with 0 media)');

  console.log('\n========================================================');
  console.log('🎉 DATABASE ENTRIES SUCCESSFULLY CLEANED!');
  console.log('   All tables & databases preserved.');
  console.log('   You can now upload brand new photos inside CareLink.');
  console.log('========================================================\n');
}

cleanAllDatabaseEntries()
  .catch((err) => {
    console.error('❌ Failed to clean database entries:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
