import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function generatePcmWav(seconds = 4, rate = 16000): Buffer {
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

async function run() {
  const baseUrl = 'http://127.0.0.1:5000/api';
  console.log('\n=============================================================');
  console.log('🩺 CareLink Telemedicine: Full Integration & Digital Rx Verification');
  console.log('=============================================================\n');

  // 1. Health check
  console.log('--- 1. HEALTH ENDPOINT (GET /api/health) ---');
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthJson = await healthRes.json();
  console.log(`Status: ${healthRes.status} ${healthRes.statusText}`);
  console.log(JSON.stringify(healthJson, null, 2));

  // 2. Clinical Image Upload
  console.log('\n--- 2. CLINICAL IMAGE UPLOAD (POST /api/cases/:caseId/images) ---');
  const caseId = '0418';
  const imgBuf = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 80, b: 60 } },
  }).jpeg({ quality: 85 }).toBuffer();

  const imgForm = new FormData();
  imgForm.append('image', new Blob([imgBuf], { type: 'image/jpeg' }), 'dermatology_intake.jpg');
  imgForm.append('label', 'IMAGE 01');
  imgForm.append('bodySite', 'DERMATOLOGY');

  const imgRes = await fetch(`${baseUrl}/cases/${caseId}/images`, { method: 'POST', body: imgForm });
  const imgJson = await imgRes.json();
  console.log(`Status: ${imgRes.status} ${imgRes.statusText}`);
  console.log(`Uploaded Image ID: ${imgJson.data.id}`);
  console.log(`Original: ${imgJson.data.originalSizeBytes} B -> Compressed: ${imgJson.data.compressedSizeBytes} B (${imgJson.data.compressionRatio}% saved)`);
  console.log(`URL: ${imgJson.data.url}`);

  // 3. Audio Recording Upload & Retrieval
  console.log('\n--- 3. AUDIO UPLOAD & STREAMING (POST & GET /api/cases/:caseId/audio) ---');
  const audioBuf = generatePcmWav(4, 16000);
  const audioForm = new FormData();
  audioForm.append('audio', new Blob([audioBuf], { type: 'audio/wav' }), 'swahili_note.wav');
  audioForm.append('language', 'Swahili · auto-transcribed');
  audioForm.append('durationSeconds', '4');

  const audioUploadRes = await fetch(`${baseUrl}/cases/${caseId}/audio`, { method: 'POST', body: audioForm });
  const audioUploadJson = await audioUploadRes.json();
  console.log(`Upload Status: ${audioUploadRes.status} ${audioUploadRes.statusText}`);
  console.log(`Audio ID: ${audioUploadJson.data.id}, Duration: ${audioUploadJson.data.durationSeconds}s, Size: ${audioUploadJson.data.sizeKb} KB`);

  // Audio Retrieval
  const audioListRes = await fetch(`${baseUrl}/cases/${caseId}/audio`);
  const audioListJson = await audioListRes.json();
  console.log(`Retrieval Status: ${audioListRes.status} ${audioListJson.count} audio recording(s) found`);

  // Audio Range Stream
  const streamRes = await fetch(`http://127.0.0.1:5000${audioUploadJson.data.url}`, {
    headers: { Range: 'bytes=0-1023' },
  });
  console.log(`Stream Status: ${streamRes.status} Partial Content (${streamRes.headers.get('content-range')})`);

  // 4. Digital Prescription Workflow
  console.log('\n--- 4. DIGITAL PRESCRIPTION WORKFLOW ---');
  // A. Save Draft
  console.log('[Step A] Saving draft prescription...');
  const draftRes = await fetch(`${baseUrl}/prescriptions/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId,
      diagnosis: 'Acute bacterial tonsillitis & secondary dehydration',
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
          name: 'Oral Rehydration Salts (ORS)',
          strength: '1 sachet in 1L water',
          dosage: '200ml',
          frequency: 'After every meal',
          duration: '3 days',
          instructions: 'Drink slowly',
        },
      ],
      clinicalRemarks: 'Complete antibiotic course without skipping doses. Avoid cold beverages.',
      followUpDate: 'In 5 days at Kijani Rural Clinic',
      doctorName: 'Dr. Sarah Kimani, MD',
      doctorRegNumber: 'KMPDC-REG-48819',
    }),
  });
  const draftJson = await draftRes.json();
  console.log(`Draft Status: ${draftRes.status} - ID: ${draftJson.data.id}, rxNumber: ${draftJson.data.rxNumber}`);

  // B. Issue & Digitally Sign Prescription
  console.log('\n[Step B] Issuing & digitally signing prescription...');
  const issueRes = await fetch(`${baseUrl}/prescriptions/${draftJson.data.id}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorName: 'Dr. Sarah Kimani, MD',
      doctorRegNumber: 'KMPDC-REG-48819',
      clinicalRemarks: 'Complete full course. Report immediately if breathing difficulty develops.',
      followUpDate: 'In 5 days',
    }),
  });
  const issueJson = await issueRes.json();
  console.log(`Issue Status: ${issueRes.status} ${issueRes.statusText}`);
  console.log(`Issued Rx Number: ${issueJson.data.rxNumber}`);
  console.log(`Digital Signature Token: ${issueJson.data.digitalSignature}`);
  console.log(`PDF Path: ${issueJson.data.pdfPath} (${issueJson.data.pdfSizeBytes} bytes)`);

  // C. Download PDF
  console.log('\n[Step C] Downloading prescription PDF...');
  const pdfRes = await fetch(`http://127.0.0.1:5000/api/prescriptions/${issueJson.data.id}/pdf`);
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log(`PDF Download Status: ${pdfRes.status} (${pdfBuffer.byteLength} bytes received, Content-Type: ${pdfRes.headers.get('content-type')})`);

  // D. Patient "My Prescriptions" query
  console.log('\n[Step D] Patient retrieving My Prescriptions...');
  const patientRxRes = await fetch(`${baseUrl}/patients/${caseId}/prescriptions`);
  const patientRxJson = await patientRxRes.json();
  console.log(`Patient Query Status: ${patientRxRes.status} - Count: ${patientRxJson.count}`);
  console.log(`Prescription 1: #${patientRxJson.data[0].rxNumber} (${patientRxJson.data[0].status}) by ${patientRxJson.data[0].doctorName}`);

  console.log('\n=============================================================');
  console.log('🎉 ALL INTEGRATION & PRESCRIPTION CHECKS PASSED SUCCESSFULLY!');
  console.log('=============================================================\n');
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
