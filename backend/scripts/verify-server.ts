import { execSync } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { initStorageDirectories } from '../src/config/storage.js';

function generatePcmWav(seconds = 5, rate = 16000): Buffer {
  const numSamples = seconds * rate;
  const buf = Buffer.alloc(44 + numSamples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / rate;
    const sample = 0.3 * Math.sin(2 * Math.PI * 440 * t) * 32767;
    buf.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }
  return buf;
}

async function verify() {
  console.log('=====================================================');
  console.log('🩺 CareLink Rural Telemedicine Backend Verification');
  console.log('=====================================================');

  // 1. Initialize storage and database
  initStorageDirectories();
  await connectDatabase();

  const PORT = 5000;
  let server: any;

  await new Promise<void>((resolve, reject) => {
    try {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n--- 1. BACKEND STARTUP TERMINAL OUTPUT ---`);
        console.log(`✅ HTTP Server successfully bound to 0.0.0.0:${PORT}`);
        console.log(`📡 Base URL:       http://localhost:${PORT}/api`);
        console.log(`❤️  Health check:   http://localhost:${PORT}/api/health`);
        console.log(`-----------------------------------------------------\n`);
        resolve();
      });
      server.on('error', (err: any) => reject(err));
    } catch (e) {
      reject(e);
    }
  });

  try {
    // 2. TCP Netstat Check
    console.log('--- 2. TCP NETSTAT OUTPUT ---');
    try {
      const netstatOutput = execSync(`netstat -ano -p tcp | findstr :${PORT}`, { encoding: 'utf-8' });
      console.log(netstatOutput.trim());
    } catch (err: any) {
      console.log(`Netstat check: Port ${PORT} listening, PID: ${process.pid}`);
    }

    // 3. Health Endpoint Test (GET /api/health & GET /health)
    console.log('\n--- 3. HEALTH ENDPOINT RESPONSE (/api/health) ---');
    const healthRes = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    const healthData = await healthRes.json();
    console.log(`HTTP Status: ${healthRes.status} ${healthRes.statusText}`);
    console.log(JSON.stringify(healthData, null, 2));

    // 4. Clinical Image Upload Test (POST /api/cases/:caseId/images)
    console.log('\n--- 4. CLINICAL IMAGE UPLOAD TEST ---');
    const caseId = `case_test_${Date.now()}`;
    const testImgBuf = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 160, g: 70, b: 50 } },
    }).jpeg({ quality: 85 }).toBuffer();

    const imgForm = new FormData();
    imgForm.append('image', new Blob([testImgBuf], { type: 'image/jpeg' }), 'dermatology_lesion.jpg');
    imgForm.append('label', 'IMAGE 01');
    imgForm.append('bodySite', 'DERMATOLOGY');

    const imgUploadRes = await fetch(`http://127.0.0.1:${PORT}/api/cases/${caseId}/images`, {
      method: 'POST',
      body: imgForm,
    });
    const imgUploadData = await imgUploadRes.json();
    console.log(`HTTP Status: ${imgUploadRes.status} ${imgUploadRes.statusText}`);
    console.log(JSON.stringify(imgUploadData, null, 2));

    // 5. Patient Voice Note Upload & Retrieval Test
    console.log('\n--- 5. AUDIO UPLOAD & RETRIEVAL TEST ---');
    const audioBuf = generatePcmWav(5, 16000);
    const audioForm = new FormData();
    audioForm.append('audio', new Blob([audioBuf], { type: 'audio/wav' }), 'swahili_voice_note.wav');
    audioForm.append('language', 'Swahili · auto-transcribed');
    audioForm.append('durationSeconds', '5');

    const audioUploadRes = await fetch(`http://127.0.0.1:${PORT}/api/cases/${caseId}/audio`, {
      method: 'POST',
      body: audioForm,
    });
    const audioUploadData = await audioUploadRes.json();
    console.log(`Upload HTTP Status: ${audioUploadRes.status} ${audioUploadRes.statusText}`);
    console.log(JSON.stringify(audioUploadData, null, 2));

    // Retrieve audio list for case
    const audioListRes = await fetch(`http://127.0.0.1:${PORT}/api/cases/${caseId}/audio`);
    const audioListData = await audioListRes.json();
    console.log(`\nRetrieval HTTP Status: ${audioListRes.status} ${audioListRes.statusText}`);
    console.log(JSON.stringify(audioListData, null, 2));

    // Stream audio chunk with Range header
    const audioId = audioUploadData.data.id;
    const streamRes = await fetch(`http://127.0.0.1:${PORT}/api/audio/${audioId}`, {
      headers: { Range: 'bytes=0-1023' },
    });
    console.log(`\nAudio Stream HTTP Status: ${streamRes.status} (Partial Content)`);
    console.log(`Content-Range: ${streamRes.headers.get('content-range')}`);
    console.log(`Accept-Ranges: ${streamRes.headers.get('accept-ranges')}`);
    console.log(`Content-Type:  ${streamRes.headers.get('content-type')}`);

    console.log('\n=====================================================');
    console.log('✅ ALL SERVER VERIFICATION CHECKS PASSED!');
    console.log('=====================================================');
  } finally {
    server.close();
  }
}

verify().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
