import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { initStorageDirectories } from '../src/config/storage.js';

function generatePcmWavBuffer(durationSeconds = 10, sampleRate = 16000): Buffer {
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
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Real voice tone cadence for 10 seconds
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f1 = 300 + 120 * Math.sin(2 * Math.PI * 1.2 * t);
    const sample = (0.4 * Math.sin(2 * Math.PI * f1 * t)) * 32767;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sample))), 44 + i * 2);
  }

  return buffer;
}

let server: any;

async function runEndToEndVerification() {
  console.log('\n=============================================================');
  console.log('🩺 CareLink Telemedicine: Full End-to-End Verification (TEST A & TEST B)');
  console.log('=============================================================\n');

  initStorageDirectories();
  const PORT = 5092;
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => resolve());
  });
  const baseUrl = `http://127.0.0.1:${PORT}/api`;
  const caseId = `case_e2e_${Date.now()}`;

  try {
    // -------------------------------------------------------------------
    // TEST A: Three Different Images Upload, Compression & Doctor Retrieval
    // -------------------------------------------------------------------
    console.log('--- TEST A: Medical Image Upload, Compression & Retrieval ---');

    // 1. Create Image 1 (Dermatology Rash - Red/Amber)
    const img1Buf = await sharp({
      create: { width: 1024, height: 768, channels: 3, background: { r: 180, g: 60, b: 60 } }
    }).jpeg({ quality: 90 }).toBuffer();

    // 2. Create Image 2 (Deep Tissue / Wound - Dark Red/Brown)
    const img2Buf = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 130, g: 50, b: 30 } }
    }).png().toBuffer();

    // 3. Create Image 3 (Ophthalmic / General Lesion - Ochre/Gold)
    const img3Buf = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 190, g: 140, b: 50 } }
    }).jpeg({ quality: 85 }).toBuffer();

    console.log(`[Step 1 & 2] Uploading 3 distinct clinical images for case ${caseId}...`);

    // Upload Image 1
    const form1 = new FormData();
    form1.append('image', new Blob([img1Buf], { type: 'image/jpeg' }), 'forearm_rash.jpg');
    form1.append('label', 'IMAGE 01');
    form1.append('bodySite', 'DERMATOLOGY');
    const res1 = await fetch(`${baseUrl}/cases/${caseId}/images`, { method: 'POST', body: form1 });
    const data1 = await res1.json();
    console.log(`  Uploaded Image 1: Original ${data1.data.originalSizeBytes}B -> Compressed ${data1.data.compressedSizeBytes}B (${data1.data.compressionRatio}% saved)`);

    // Upload Image 2
    const form2 = new FormData();
    form2.append('image', new Blob([img2Buf], { type: 'image/png' }), 'wound_bed.png');
    form2.append('label', 'IMAGE 02');
    form2.append('bodySite', 'WOUND');
    const res2 = await fetch(`${baseUrl}/cases/${caseId}/images`, { method: 'POST', body: form2 });
    const data2 = await res2.json();
    console.log(`  Uploaded Image 2: Original ${data2.data.originalSizeBytes}B -> Compressed ${data2.data.compressedSizeBytes}B (${data2.data.compressionRatio}% saved)`);

    // Upload Image 3
    const form3 = new FormData();
    form3.append('image', new Blob([img3Buf], { type: 'image/jpeg' }), 'lesion_margin.jpg');
    form3.append('label', 'IMAGE 03');
    form3.append('bodySite', 'GENERAL');
    const res3 = await fetch(`${baseUrl}/cases/${caseId}/images`, { method: 'POST', body: form3 });
    const data3 = await res3.json();
    console.log(`  Uploaded Image 3: Original ${data3.data.originalSizeBytes}B -> Compressed ${data3.data.compressedSizeBytes}B (${data3.data.compressionRatio}% saved)`);

    // 3. Query Doctor Dashboard View: GET /api/cases/:caseId/images
    console.log(`[Step 5 & 6] Doctor Dashboard querying images for case ${caseId}...`);
    const docImagesRes = await fetch(`${baseUrl}/cases/${caseId}/images`);
    const docImagesData = await docImagesRes.json();

    if (!docImagesRes.ok || docImagesData.count !== 3) {
      throw new Error(`Expected 3 images, received count=${docImagesData.count}`);
    }
    console.log(`  ✅ Verified: Doctor Dashboard retrieved exactly ${docImagesData.count} clinical images!`);

    // 4. Verify each image is readable and streamable
    for (const [index, img] of docImagesData.data.entries()) {
      const imgStreamRes = await fetch(`http://localhost:${PORT}${img.url}`);
      if (!imgStreamRes.ok) throw new Error(`Image ${index + 1} stream failed: status ${imgStreamRes.status}`);
      const arrayBuf = await imgStreamRes.arrayBuffer();
      const headerStr = Buffer.from(arrayBuf.slice(0, 12)).toString('ascii');
      console.log(`  ✅ Image ${index + 1} (${img.label}): size=${arrayBuf.byteLength}B, type=${imgStreamRes.headers.get('content-type')}, header=${headerStr}`);
    }

    // -------------------------------------------------------------------
    // TEST B: 10-Second Voice Recording, Upload & Audible Doctor Playback
    // -------------------------------------------------------------------
    console.log('\n--- TEST B: 10-Second Voice Note Recording & Playback ---');

    console.log('[Step 1 & 2] Generating 10-second voice note buffer (16kHz PCM)...');
    const voiceBuffer = generatePcmWavBuffer(10, 16000);
    console.log(`  Generated 10s audio: size=${voiceBuffer.length} bytes (approx ${(voiceBuffer.length / 1024).toFixed(1)} KB)`);

    console.log('[Step 3 & 4] Uploading voice note to backend...');
    const audioForm = new FormData();
    audioForm.append('audio', new Blob([voiceBuffer], { type: 'audio/wav' }), 'patient_10s_voice.wav');
    audioForm.append('language', 'Swahili · auto-transcribed');
    audioForm.append('durationSeconds', '10');

    const audioUploadRes = await fetch(`${baseUrl}/cases/${caseId}/audio`, {
      method: 'POST',
      body: audioForm,
    });
    const audioUploadData = await audioUploadRes.json();
    if (!audioUploadRes.ok || !audioUploadData.success) {
      throw new Error(`Failed to upload audio: ${audioUploadData.error}`);
    }
    console.log(`  Uploaded Audio: ID=${audioUploadData.data.id}, duration=${audioUploadData.data.durationSeconds}s, URL=${audioUploadData.data.url}`);

    // 5. Doctor Dashboard queries voice notes for case
    console.log('[Step 5 & 6] Doctor Dashboard retrieving voice note...');
    const docAudioRes = await fetch(`${baseUrl}/cases/${caseId}/audio`);
    const docAudioData = await docAudioRes.json();
    if (!docAudioRes.ok || docAudioData.count === 0) {
      throw new Error(`Doctor Dashboard failed to find audio note`);
    }

    const docVoiceNote = docAudioData.data[0];
    console.log(`  ✅ Doctor Dashboard retrieved voice note: Language="${docVoiceNote.language}", Duration=${docVoiceNote.durationSeconds}s, Size=${docVoiceNote.sizeKb} KB`);

    // 6. Test Doctor Audio Stream (HTTP Range Request)
    console.log('[Step 7 & 8] Streaming audio for playback in Doctor Dashboard...');
    const playbackStreamRes = await fetch(`http://localhost:${PORT}${docVoiceNote.url}`, {
      headers: { Range: 'bytes=0-4095' }
    });
    if (playbackStreamRes.status !== 206 && playbackStreamRes.status !== 200) {
      throw new Error(`Playback stream failed with status ${playbackStreamRes.status}`);
    }
    const streamBuffer = await playbackStreamRes.arrayBuffer();
    console.log(`  ✅ Playback Stream verified: status=${playbackStreamRes.status}, chunk=${streamBuffer.byteLength}B, Content-Range=${playbackStreamRes.headers.get('content-range')}`);

    console.log('\n=============================================================');
    console.log('🎉 TEST A & TEST B VERIFIED: COMPLETE END-TO-END FLOW SUCCEEDED!');
    console.log('=============================================================\n');
  } finally {
    server.close();
  }
}

runEndToEndVerification().catch((err) => {
  console.error('E2E Verification Error:', err);
  if (server) server.close();
  process.exit(1);
});
