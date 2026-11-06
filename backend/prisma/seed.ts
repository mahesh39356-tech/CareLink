import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { initStorageDirectories, storagePaths } from '../src/config/storage.js';

const prisma = new PrismaClient();

function generatePcmWavBuffer(durationSeconds = 4, sampleRate = 16000): Buffer {
  const numSamples = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // 1 channel
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Voice note cadence
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f1 = 350 + 80 * Math.sin(2 * Math.PI * 1.5 * t);
    const f2 = 700 + 120 * Math.cos(2 * Math.PI * 2.5 * t);
    const sample = (0.35 * Math.sin(2 * Math.PI * f1 * t) + 0.25 * Math.sin(2 * Math.PI * f2 * t)) * 32767;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sample))), 44 + i * 2);
  }

  return buffer;
}

async function main() {
  console.log('🌱 Seeding CareLink Telemedicine Database with Real Assets...');
  initStorageDirectories();

  const passwordHash = await bcrypt.hash('RuralCare2026!', 10);

  // 1. Seed Doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@carelink.org' },
    update: {},
    create: {
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

  // 2. Seed Health Worker
  await prisma.user.upsert({
    where: { email: 'asha.kijani@carelink.org' },
    update: {},
    create: {
      email: 'asha.kijani@carelink.org',
      phone: '+254711223344',
      passwordHash,
      role: 'HEALTH_WORKER',
    },
  });

  // 3. Seed Patients & Real Clinical Media
  const patientData = [
    {
      fullName: 'Amina Mwangi',
      age: 34,
      gender: 'Female',
      clinic: 'Kijani Clinic',
      village: 'Kijani Village',
      systolic: 128,
      diastolic: 82,
      temperature: 36.8,
      heartRate: 72,
      voiceLanguage: 'Swahili · auto-transcribed',
      reason: 'Persistent skin dermatitis & mild pruritus on forearm',
      clientRecordId: '0418',
      imageTitle: 'Forearm Lesion Sample 1',
    },
    {
      fullName: 'Joseph Otieno',
      age: 51,
      gender: 'Male',
      clinic: 'Mara Health Post',
      village: 'Mara Sub-Location',
      systolic: 135,
      diastolic: 88,
      temperature: 37.4,
      heartRate: 84,
      voiceLanguage: 'Swahili',
      reason: 'Elevated blood pressure following exertion, mild headache',
      clientRecordId: '0419',
      imageTitle: 'Anterior Foot Edema Check',
    },
    {
      fullName: 'Fatima Khalid',
      age: 29,
      gender: 'Female',
      clinic: 'Tana Dispensary',
      village: 'Tana North',
      systolic: 118,
      diastolic: 76,
      temperature: 36.5,
      heartRate: 68,
      voiceLanguage: 'Swahili / Somali',
      reason: 'Routine antenatal vitals logging and dietary follow-up',
      clientRecordId: '0420',
      imageTitle: 'Conjunctival Inspection Photo',
    },
    {
      fullName: 'Peter Kamau',
      age: 62,
      gender: 'Male',
      clinic: 'Nyeri Outreach',
      village: 'Nyeri Hill Area',
      systolic: 142,
      diastolic: 90,
      temperature: 37.1,
      heartRate: 80,
      voiceLanguage: 'Kikuyu / Swahili',
      reason: 'Chronic joint swelling and mild hypertension',
      clientRecordId: '0421',
      imageTitle: 'Joint Swelling Documentation',
    },
  ];

  for (let idx = 0; idx < patientData.length; idx++) {
    const p = patientData[idx];

    let patient = await prisma.patientProfile.findFirst({
      where: { fullName: p.fullName },
    });

    if (!patient) {
      patient = await prisma.patientProfile.create({
        data: {
          id: p.clientRecordId,
          nationalId: `CL-2024-${p.clientRecordId}`,
          fullName: p.fullName,
          age: p.age,
          gender: p.gender,
          clinic: p.clinic,
          village: p.village,
        },
      });
    }

    const vital = await prisma.vitalRecord.create({
      data: {
        patientId: patient.id,
        clientRecordId: p.clientRecordId,
        systolic: p.systolic,
        diastolic: p.diastolic,
        temperature: p.temperature,
        heartRate: p.heartRate,
        triageLevel: p.systolic > 140 ? 'ELEVATED' : 'NORMAL',
      },
    });

    const consultation = await prisma.consultation.create({
      data: {
        id: `case_${p.clientRecordId}`,
        caseNumber: `CL-2024-${p.clientRecordId}`,
        patientId: patient.id,
        doctorId: doctorUser.doctor?.id,
        status: 'PENDING',
        priority: p.systolic > 140 ? 'URGENT' : 'ROUTINE',
        reason: p.reason,
      },
    });

    // Create real image on disk
    const rawImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 160 + idx * 15, g: 95 + idx * 10, b: 55 + idx * 5, alpha: 1 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="800" height="600">
              <circle cx="400" cy="300" r="140" fill="#6A3215" opacity="0.6"/>
              <circle cx="400" cy="300" r="80" fill="#421908" opacity="0.8"/>
              <text x="30" y="550" font-size="28" font-family="sans-serif" font-weight="bold" fill="#ffffff">${p.fullName} - ${p.imageTitle}</text>
              <text x="30" y="580" font-size="20" font-family="sans-serif" fill="#A7F3D0">CareLink Telemedicine Record CL-2024-${p.clientRecordId}</text>
            </svg>`
          ),
        },
      ])
      .png()
      .toBuffer();

    const origImgName = `seed_img_${p.clientRecordId}.png`;
    const origImgPath = path.join(storagePaths.original.images, origImgName);
    await fs.promises.writeFile(origImgPath, rawImage);

    // Compressed WebP
    const compImage = await sharp(rawImage)
      .resize({ width: 1280, height: 1280, fit: 'inside' })
      .webp({ quality: 72 })
      .toBuffer();

    const compImgName = `seed_img_${p.clientRecordId}.webp`;
    const compImgPath = path.join(storagePaths.compressed.images, compImgName);
    await fs.promises.writeFile(compImgPath, compImage);

    const origHash = crypto.createHash('sha256').update(rawImage).digest('hex');
    const compHash = crypto.createHash('sha256').update(compImage).digest('hex');

    const fileRec = await prisma.fileRecord.create({
      data: {
        id: `img_file_${p.clientRecordId}`,
        category: 'images',
        originalFilename: origImgName,
        originalPath: origImgPath,
        compressedPath: compImgPath,
        originalSizeBytes: rawImage.length,
        compressedSizeBytes: compImage.length,
        mimeType: 'image/webp',
        compressionAlgorithm: 'SHARP_WEBP',
        originalSha256: origHash,
        decompressedSha256: compHash,
        isVerified: true,
      },
    });

    await prisma.clinicalImage.create({
      data: {
        id: `clin_img_${p.clientRecordId}`,
        patientId: patient.id,
        consultationId: consultation.id,
        vitalRecordId: vital.id,
        fileRecordId: fileRec.id,
        label: `IMAGE 01`,
        bodySite: 'DERMATOLOGY',
      },
    });

    // Create real audio on disk
    const audioWav = generatePcmWavBuffer(4 + idx, 16000);
    const audioName = `seed_audio_${p.clientRecordId}.wav`;
    const origAudioPath = path.join(storagePaths.original.audio, audioName);
    const compAudioPath = path.join(storagePaths.compressed.audio, audioName);
    await fs.promises.writeFile(origAudioPath, audioWav);
    await fs.promises.writeFile(compAudioPath, audioWav);

    const audioHash = crypto.createHash('sha256').update(audioWav).digest('hex');

    const audioFileRec = await prisma.fileRecord.create({
      data: {
        id: `audio_file_${p.clientRecordId}`,
        category: 'audio',
        originalFilename: audioName,
        originalPath: origAudioPath,
        compressedPath: compAudioPath,
        originalSizeBytes: audioWav.length,
        compressedSizeBytes: audioWav.length,
        mimeType: 'audio/wav',
        compressionAlgorithm: 'OPUS',
        originalSha256: audioHash,
        decompressedSha256: audioHash,
        isVerified: true,
      },
    });

    await prisma.voiceNote.create({
      data: {
        id: `voice_${p.clientRecordId}`,
        patientId: patient.id,
        consultationId: consultation.id,
        vitalRecordId: vital.id,
        fileRecordId: audioFileRec.id,
        language: p.voiceLanguage,
        durationSeconds: 4 + idx,
        codec: 'Opus',
      },
    });
  }

  console.log('✅ Seed complete: Doctor, Health Worker, 4 Patients with real images and real audio initialized.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
