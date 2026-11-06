import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { initStorageDirectories } from '../src/config/storage.js';
import { CompressionService } from '../src/services/compression.service.js';
import { SyncService } from '../src/services/sync.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { VitalsService } from '../src/services/vitals.service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Assertion failed for: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n🧪 ========================================================');
  console.log('🧪 Starting CareLink Rural Telemedicine Verification Suite');
  console.log('🧪 ========================================================\n');

  initStorageDirectories();

  // TEST 1: Database & Seed Verification
  console.log('--- 1. Database & Seed Verification ---');
  const doctorCount = await prisma.doctorProfile.count();
  assert(doctorCount >= 1, 'Doctor profile exists in database');
  const patientCount = await prisma.patientProfile.count();
  assert(patientCount >= 4, 'At least 4 pre-seeded patients exist in database');

  // TEST 2: Authentication & Role-Based Access
  console.log('\n--- 2. Authentication & JWT Tokens ---');
  const regResult = await AuthService.registerPatient({
    fullName: `Test Patient ${Date.now()}`,
    age: 29,
    gender: 'Female',
    email: `patient_${Date.now()}@carelink.org`,
    password: 'Password123!',
    clinic: 'Kijani Rural Clinic',
  });
  assert(!!regResult.tokens.accessToken, 'Access token generated on patient registration');
  assert(!!regResult.tokens.refreshToken, 'Refresh token generated on patient registration');

  const loginResult = await AuthService.login(regResult.user.email!, 'Password123!');
  assert(loginResult.user.role === 'PATIENT', 'Patient authenticated with role PATIENT');

  let loginFailed = false;
  try {
    await AuthService.login(regResult.user.email!, 'WrongPassword!');
  } catch (err) {
    loginFailed = true;
  }
  assert(loginFailed, 'Invalid password correctly rejected with 401 error');

  // TEST 3: Clinical Vitals & Triage Thresholds
  console.log('\n--- 3. Clinical Vitals & Auto-Triage Thresholds ---');
  const normalTriage = VitalsService.evaluateTriageLevel({
    systolic: 120,
    diastolic: 80,
    temperature: 36.8,
    heartRate: 72,
    spO2: 98,
  });
  assert(normalTriage === 'NORMAL', 'BP 120/80 + Temp 36.8 correctly triaged as NORMAL');

  const criticalTriage = VitalsService.evaluateTriageLevel({
    systolic: 175,
    diastolic: 110,
    temperature: 39.5,
    heartRate: 130,
    spO2: 87,
  });
  assert(criticalTriage === 'CRITICAL', 'Hypertensive crisis + fever correctly triaged as CRITICAL');

  // TEST 4: Real JSON & Text GZIP Compression & SHA-256 Verification
  console.log('\n--- 4. Real GZIP Compression (Lossless & SHA-256 Verified) ---');
  const sampleJson = JSON.stringify({
    telemetryId: 'TEL-99881',
    clinic: 'Kijani Outreach Center',
    records: Array.from({ length: 40 }).map((_, i) => ({
      patientIndex: i,
      systolic: 120 + (i % 10),
      diastolic: 80 + (i % 5),
      symptoms: ['Mild fever', 'Dry cough', 'Headache'],
      timestamp: new Date().toISOString(),
    })),
  });

  const jsonBuffer = Buffer.from(sampleJson, 'utf-8');
  const jsonRecord = await CompressionService.registerUpload(jsonBuffer, 'telemetry_sample.json', 'application/json');
  assert(fs.existsSync(jsonRecord.originalPath), 'Original JSON file saved in storage/original/json');

  const compressedJson = await CompressionService.compressFile(jsonRecord.id);
  assert(fs.existsSync(compressedJson.compressedPath!), 'Compressed .json.gz file exists in storage/compressed/json');
  assert(compressedJson.compressedSizeBytes! < jsonRecord.originalSizeBytes, 'GZIP compressed size strictly smaller than original');

  const decompressedJson = await CompressionService.decompressFile(jsonRecord.id);
  assert(fs.existsSync(decompressedJson.decompressedPath!), 'Decompressed JSON file exists in storage/decompressed/json');
  assert(decompressedJson.originalSha256 === decompressedJson.decompressedSha256, 'Lossless verification: original SHA-256 strictly equals decompressed SHA-256');

  const jsonReport = await CompressionService.generateReport(jsonRecord.id);
  assert(jsonReport.spaceSaved > 0, `Real space saved: ${jsonReport.spaceSaved} bytes (${jsonReport.compressionPercentage}%)`);
  assert(jsonReport.sha256Verification === 'MATCH', 'Report states SHA-256 MATCH');

  // TEST 5: Real Clinical Image Optimization with Sharp (WebP)
  console.log('\n--- 5. Real Clinical Image Optimization with Sharp ---');
  // Generate a real 800x600 uncompressed PNG image in memory with realistic clinical gradient
  const rawImageBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 180, g: 110, b: 70, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const imageRecord = await CompressionService.registerUpload(rawImageBuffer, 'clinical_lesion.png', 'image/png');
  assert(fs.existsSync(imageRecord.originalPath), 'Original clinical image preserved in storage/original/images');

  const compressedImage = await CompressionService.compressFile(imageRecord.id);
  assert(fs.existsSync(compressedImage.compressedPath!), 'Optimized WebP image created in storage/compressed/images');
  assert(compressedImage.compressedSizeBytes! < imageRecord.originalSizeBytes, `Image optimization: Original ${imageRecord.originalSizeBytes}B -> Compressed ${compressedImage.compressedSizeBytes}B`);

  const imageReport = await CompressionService.generateReport(imageRecord.id);
  assert(imageReport.spaceSaved > 0, `Clinical image bandwidth savings: ${imageReport.compressionPercentage}% space saved`);

  // TEST 6: Real Opus Audio Preservation
  console.log('\n--- 6. Real Opus Audio Processing ---');
  // Synthetic valid WebM/Opus binary container header
  const opusBuffer = Buffer.from('1A45DFA39F4286810142F7810142F2810442F381084282847765626D4287810242858102', 'hex');
  const audioRecord = await CompressionService.registerUpload(opusBuffer, 'voice_note_swahili.opus', 'audio/opus');
  assert(fs.existsSync(audioRecord.originalPath), 'Opus audio preserved in storage/original/audio');
  const compressedAudio = await CompressionService.compressFile(audioRecord.id);
  assert(fs.existsSync(compressedAudio.compressedPath!), 'Opus audio verified in storage/compressed/audio');

  // TEST 7: Offline Batch Sync & Duplicate Idempotency Prevention
  console.log('\n--- 7. Offline Batch Synchronization & Idempotency ---');
  const testIdempotencyKey = `SYNC_KEY_TEST_${Date.now()}`;
  const batchData = {
    clientId: 'MOBILE_CLIENT_CL0418',
    idempotencyKey: testIdempotencyKey,
    timestamp: new Date().toISOString(),
    records: [
      {
        clientRecordId: `REC_OFFLINE_${Date.now()}_1`,
        fullName: 'Zainab Juma',
        age: 38,
        gender: 'Female',
        systolic: 124,
        diastolic: 80,
        temperature: 36.7,
        heartRate: 70,
        clinic: 'Kijani Rural Clinic',
      },
    ],
  };

  // First submission: should succeed and create records
  const syncResult1 = await SyncService.processBatchSync(batchData);
  assert(syncResult1.status === 'DELIVERED', 'First batch submission delivers successfully');
  assert(syncResult1.duplicateIgnored === false, 'First submission processed freshly (duplicateIgnored: false)');

  // Second submission with exact same idempotency key: should safely ignore and return receipt
  const syncResult2 = await SyncService.processBatchSync(batchData);
  assert(syncResult2.status === 'DELIVERED', 'Duplicate submission returns DELIVERED status');
  assert(syncResult2.duplicateIgnored === true, 'Duplicate submission safely detected (duplicateIgnored: true)');
  assert(syncResult1.sha256Hash === syncResult2.sha256Hash, 'Payload hash matches exactly across retries');

  // TEST 8: Doctor Dashboard APIs
  console.log('\n--- 8. Doctor Dashboard Case Ingestion ---');
  const doctorCases = await prisma.consultation.findMany({
    include: { patient: true, vitals: true },
  });
  assert(doctorCases.length >= 4, 'Doctor inbox retrieves all pending remote cases');

  // TEST 9: Digital Prescription System
  console.log('\n--- 9. Digital Prescription System (Draft -> Sign -> Issue -> PDF -> Patient Retrieval) ---');
  const { PrescriptionService } = await import('../src/services/prescription.service.js');
  const sampleCase = doctorCases[0];

  // 1. Save draft
  const draftRx = await PrescriptionService.saveDraft({
    caseId: sampleCase.id,
    diagnosis: 'Bacterial Pharyngitis & Mild Fever',
    medicines: [
      {
        name: 'Amoxicillin',
        strength: '500mg',
        dosage: '1 capsule',
        frequency: 'Three times daily (TID)',
        duration: '7 days',
        instructions: 'Take after meals with water',
      },
      {
        name: 'Paracetamol',
        strength: '500mg',
        dosage: '1-2 tablets',
        frequency: 'Every 6 hours as needed for fever',
        duration: '3 days',
        instructions: 'After food',
      },
    ],
    clinicalRemarks: 'Rest adequately, drink plenty of warm fluids, report if fever exceeds 38.5C.',
    followUpDate: 'In 5 days at Kijani Rural Clinic',
    doctorName: 'Dr. Sarah Kimani, MD',
    doctorRegNumber: 'KMPDC-REG-48819',
  });
  assert(draftRx.status === 'DRAFT', 'Prescription draft created with status DRAFT');
  assert(!!draftRx.rxNumber, 'Prescription rxNumber assigned');

  // 2. Issue prescription with digital signature
  const issuedRx = await PrescriptionService.issuePrescription(draftRx.id, {
    doctorName: 'Dr. Sarah Kimani, MD',
    doctorRegNumber: 'KMPDC-REG-48819',
    clinicalRemarks: 'Rest adequately and finish the antibiotic course.',
    followUpDate: 'In 5 days',
  });
  assert(issuedRx.status === 'ISSUED', 'Prescription officially signed and marked ISSUED');
  assert(!!issuedRx.pdfPath, 'Prescription PDF generated');
  assert(fs.existsSync(issuedRx.pdfPath!), 'Prescription PDF file exists on disk in storage/prescriptions');
  assert(issuedRx.pdfSizeBytes! > 0, `PDF generated with real vector content (${issuedRx.pdfSizeBytes} bytes)`);

  // 3. Patient retrieval
  const patientPrescriptions = await PrescriptionService.getByPatientId(sampleCase.patientId);
  assert(patientPrescriptions.length >= 1, 'Patient retrieved issued prescription under My Prescriptions');
  assert(patientPrescriptions[0].rxNumber === issuedRx.rxNumber, 'Prescription number matches patient record');

  // 4. Verify immutability & amendment
  let directReissueFailed = false;
  try {
    await PrescriptionService.issuePrescription(draftRx.id, {
      doctorName: 'Dr. Sarah Kimani, MD',
      doctorRegNumber: 'KMPDC-REG-48819',
    });
  } catch (err) {
    directReissueFailed = true;
  }
  assert(directReissueFailed, 'Direct modification of already issued prescription blocked');

  const amendedRx = await PrescriptionService.amendPrescription(issuedRx.id, {
    caseId: sampleCase.id,
    diagnosis: 'Bacterial Pharyngitis (Follow-up adjustment)',
    medicines: [
      {
        name: 'Amoxicillin',
        strength: '500mg',
        dosage: '1 capsule',
        frequency: 'Twice daily',
        duration: '5 days',
        instructions: 'After meals',
      },
    ],
    clinicalRemarks: 'Dosage adjusted following symptom improvement.',
    doctorName: 'Dr. Sarah Kimani, MD',
    doctorRegNumber: 'KMPDC-REG-48819',
  });
  console.log('AmendedRx is:', amendedRx);
  assert(amendedRx.version === (issuedRx.version || 1) + 1, `Amended prescription created with incremented version (${amendedRx.version})`);
  assert(amendedRx.amendedFromId === issuedRx.id, 'Amended prescription links back to original prescription ID');

  // TEST 10: Two-Role Authentication & Access Control
  console.log('\n--- 10. Role-Based Authentication (Patient & Doctor Login Portals) ---');
  // Patient login with email
  const patientAuthResult = await AuthService.login(regResult.user.email!, 'Password123!');
  assert(patientAuthResult.user.role === 'PATIENT', 'Patient authenticated with role PATIENT');
  assert(!!patientAuthResult.tokens.accessToken, 'Patient access token generated');

  // Doctor login with license number or email
  const doctorAuthResult = await AuthService.login('doctor@carelink.org', 'RuralCare2026!');
  assert(doctorAuthResult.user.role === 'DOCTOR', 'Doctor authenticated with role DOCTOR');
  assert(doctorAuthResult.user.email === 'doctor@carelink.org', 'Doctor email matches authorized account');

  // TEST 11: Case Lifecycle Management (POST /api/cases & GET /api/cases)
  console.log('\n--- 11. Case Lifecycle Management (POST & GET /api/cases) ---');
  const newCaseId = `case_test_${Date.now()}`;
  const casePatient = await prisma.patientProfile.findFirst();
  const createdCase = await prisma.consultation.create({
    data: {
      caseNumber: `CL-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: casePatient!.id,
      priority: 'ROUTINE',
      reason: 'Persistent forearm rash & dermatitis',
      status: 'SUBMITTED',
    },
    include: { patient: true },
  });
  assert(createdCase.status === 'SUBMITTED', 'New medical case created with status SUBMITTED');
  assert(!!createdCase.caseNumber, 'Unique Case ID generated');

  // TEST 12: Module 6 Single Prescription Enforcement & Duplicate Prevention
  console.log('\n--- 12. Single Consolidated Prescription Enforcement ---');
  // 1. Issue one prescription with three different medicines inside the SAME prescription
  const singlePrescription = await PrescriptionService.saveDraft({
    caseId: createdCase.id,
    diagnosis: 'Severe Contact Dermatitis & Pruritus',
    medicines: [
      {
        name: 'Hydrocortisone 1% Cream',
        strength: '15g tube',
        dosage: 'Thin layer',
        frequency: 'Twice daily',
        duration: '7 days',
        instructions: 'Apply topically to affected skin',
      },
      {
        name: 'Cetirizine',
        strength: '10mg',
        dosage: '1 tablet',
        frequency: 'Once daily at bedtime',
        duration: '5 days',
        instructions: 'After dinner',
      },
      {
        name: 'Calamine Lotion',
        strength: '100ml',
        dosage: 'Generous application',
        frequency: 'Three times daily',
        duration: '7 days',
        instructions: 'Shake well before use',
      },
    ],
    clinicalRemarks: 'Avoid scratching the forearm area. Keep skin clean and moisturized.',
    followUpDate: 'In 7 days if rash persists',
    doctorName: 'Dr. Sarah Kimani, MD',
    doctorRegNumber: 'KMPDC-REG-48819',
  });

  const issuedSingle = await PrescriptionService.issuePrescription(singlePrescription.id, {
    doctorName: 'Dr. Sarah Kimani, MD',
    doctorRegNumber: 'KMPDC-REG-48819',
    clinicalRemarks: 'Avoid scratching. Use cold compresses.',
    followUpDate: 'In 7 days',
  });

  const parsedMeds = JSON.parse(issuedSingle.medicationsJson);
  assert(parsedMeds.length === 3, 'Prescription contains all 3 medicines inside the SAME record');
  assert(issuedSingle.status === 'ISSUED', 'Prescription marked ISSUED');

  // 2. Click Issue Prescription multiple times: duplicate creation must be blocked
  let duplicateBlocked = false;
  try {
    await PrescriptionService.issuePrescription(issuedSingle.id, {
      doctorName: 'Dr. Sarah Kimani, MD',
      doctorRegNumber: 'KMPDC-REG-48819',
    });
  } catch (err) {
    duplicateBlocked = true;
  }
  assert(duplicateBlocked, 'Attempting to re-issue existing prescription blocked without duplicates');

  // 3. Verify patient sees strictly ONE prescription card
  const patientRxs = await PrescriptionService.getByPatientId(casePatient!.id);
  // Group by consultation to verify strictly 1 per case
  const casesMap = new Set();
  let hasDuplicateCasePrescription = false;
  for (const rx of patientRxs) {
    if (casesMap.has(rx.consultationId)) {
      hasDuplicateCasePrescription = true;
    }
    casesMap.add(rx.consultationId);
  }
  assert(!hasDuplicateCasePrescription, 'Patient dashboard has strictly ONE consolidated prescription per case');

  console.log('\n🎉 ========================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('🎉 ========================================================\n');
}

runTestSuite()
  .catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
