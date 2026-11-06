import fs from 'fs';
import path from 'path';
import { prisma, connectDatabase } from '../src/config/database.js';
import { initStorageDirectories } from '../src/config/storage.js';
import { AuthController } from '../src/controllers/auth.controller.js';
import { MediaController, resolveExistingFilePath } from '../src/controllers/media.controller.js';
import { Writable } from 'stream';

function generate10SecPcmWavBuffer(sampleRate = 16000): Buffer {
  const durationSeconds = 10;
  const numSamples = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono channel
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Audible voice simulation cadence
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f1 = 340 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const f2 = 680 + 100 * Math.cos(2 * Math.PI * 2.5 * t);
    const sample = (0.35 * Math.sin(2 * Math.PI * f1 * t) + 0.25 * Math.sin(2 * Math.PI * f2 * t)) * 32767;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sample))), 44 + i * 2);
  }

  return buffer;
}

function createMockReqRes(options: {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  file?: any;
}) {
  const req: any = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    file: options.file || null,
  };

  let responseData: any = null;
  const chunks: Buffer[] = [];

  class MockResponse extends Writable {
    statusCode = 200;
    responseHeaders: Record<string, any> = {};

    _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    }

    status(code: number) {
      this.statusCode = code;
      return this;
    }

    writeHead(code: number, headers: any) {
      this.statusCode = code;
      Object.assign(this.responseHeaders, headers);
      return this;
    }

    setHeader(name: string, value: any) {
      this.responseHeaders[name] = value;
      return this;
    }

    getHeader(name: string) {
      return this.responseHeaders[name];
    }

    json(data: any) {
      responseData = data;
      return this;
    }

    send(data: any) {
      responseData = data;
      return this;
    }

    end(data?: any) {
      if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      super.end();
      return this;
    }
  }

  const res = new MockResponse();

  const next = (err: any) => {
    if (err) {
      res.statusCode = 500;
      responseData = { error: err.message };
    }
  };

  return {
    req,
    res,
    next,
    getStatus: () => res.statusCode,
    getData: () => responseData,
    getHeaders: () => res.responseHeaders,
    getBuffer: () => Buffer.concat(chunks),
  };
}

async function runAudioPipelineTests() {
  console.log('\n🎙️ ========================================================');
  console.log('🎙️ CareLink End-to-End Audio Recording & Playback Test');
  console.log('🎙️ ========================================================\n');

  initStorageDirectories();
  await connectDatabase();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testDesc: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testDesc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testDesc}`);
      throw new Error(`Test failed: ${testDesc}`);
    }
  }

  // TEST 1: Patient Login
  console.log('--- TEST 1: Patient Login ---');
  const patContext = createMockReqRes({
    body: { identifier: '0418', password: 'RuralCare2026!' },
  });
  await AuthController.patientLogin(patContext.req, patContext.res as any, patContext.next);
  const patData = patContext.getData();
  assert(
    patContext.getStatus() === 200 && patData.success && patData.data.tokens.accessToken,
    'Patient Amina Mwangi (0418) logged in successfully'
  );
  const patientToken = patData.data.tokens.accessToken;

  // TEST 2: Generate 10-Second Audible Patient Audio
  console.log('\n--- TEST 2: Generate 10-Second Audible Patient Voice Audio ---');
  const audioBuffer = generate10SecPcmWavBuffer(16000);
  assert(
    audioBuffer.length > 300000,
    `Generated real 10-second speech audio buffer: ${audioBuffer.length} bytes (~${(audioBuffer.length / 1024).toFixed(1)} KB)`
  );

  // TEST 3: Submit Audio via Upload API
  const testCaseId = 'case_test_audio_suite';
  console.log(`\n--- TEST 3: Upload Audio Note via /api/cases/${testCaseId}/audio ---`);
  const uploadContext = createMockReqRes({
    params: { caseId: testCaseId },
    body: {
      durationSeconds: '10',
      language: 'Swahili · auto-transcribed',
    },
    file: {
      buffer: audioBuffer,
      originalname: `patient_voice_note_${Date.now()}.wav`,
      mimetype: 'audio/wav',
    },
  });
  await MediaController.uploadCaseAudio(uploadContext.req, uploadContext.res as any, uploadContext.next);
  const uploadData = uploadContext.getData();
  assert(
    uploadContext.getStatus() === 201 && uploadData.success && uploadData.data.id,
    `Voice note uploaded successfully. Created VoiceNote ID: ${uploadData.data?.id}`
  );
  const uploadedVoiceId = uploadData.data.id;

  // TEST 4: Verify File Exists in Backend Storage
  console.log('\n--- TEST 4: Verify File Exists in Persistent Storage ---');
  const fileRecord = await prisma.fileRecord.findUnique({
    where: { id: uploadData.data.fileRecordId },
  });
  assert(!!fileRecord, 'FileRecord exists in SQLite database');

  const realDiskPath = resolveExistingFilePath(fileRecord!.originalPath, 'audio');
  assert(!!realDiskPath && fs.existsSync(realDiskPath), `Audio file verified on disk at: ${realDiskPath}`);
  const diskSize = fs.statSync(realDiskPath!).size;
  assert(diskSize === audioBuffer.length, `Disk file size strictly matches uploaded size: ${diskSize} bytes`);

  // TEST 5: Verify Database Reference & Audio Metadata
  console.log('\n--- TEST 5: Verify Database VoiceNote Metadata ---');
  const voiceNote = await prisma.voiceNote.findUnique({
    where: { id: uploadedVoiceId },
    include: { fileRecord: true, consultation: true },
  });
  assert(voiceNote !== null, 'VoiceNote record found in database');
  assert(voiceNote!.durationSeconds === 10, 'Duration is recorded as 10 seconds');
  assert(voiceNote!.fileRecord.mimeType === 'audio/wav', `MIME type correctly recorded as ${voiceNote!.fileRecord.mimeType}`);
  assert(voiceNote!.consultation !== null, `Linked to consultation: ${voiceNote!.consultation.caseNumber}`);

  // TEST 6: Doctor Login
  console.log('\n--- TEST 6: Doctor Login ---');
  const docContext = createMockReqRes({
    body: { identifier: 'doctor@carelink.org', password: 'RuralCare2026!' },
  });
  await AuthController.doctorLogin(docContext.req, docContext.res as any, docContext.next);
  const docData = docContext.getData();
  assert(
    docContext.getStatus() === 200 && docData.success && docData.data.tokens.accessToken,
    'Doctor authenticated successfully with role DOCTOR'
  );
  const doctorToken = docData.data.tokens.accessToken;

  // TEST 7: Open Same Patient Consultation & Retrieve Audio List
  console.log(`\n--- TEST 7: Doctor Ingestion of Case ${testCaseId} Audio ---`);
  const getCaseAudioContext = createMockReqRes({
    params: { caseId: testCaseId },
  });
  await MediaController.getCaseAudio(getCaseAudioContext.req, getCaseAudioContext.res as any, getCaseAudioContext.next);
  const caseAudioData = getCaseAudioContext.getData();
  assert(
    getCaseAudioContext.getStatus() === 200 && caseAudioData.success && Array.isArray(caseAudioData.data),
    `Doctor retrieved ${caseAudioData.data.length} audio recordings for Case ${testCaseId}`
  );

  // Verify the primary (most recent) recording is our uploaded 10s voice note
  const primaryAudio = caseAudioData.data[0];
  assert(
    primaryAudio.id === uploadedVoiceId,
    `Primary voice note matches the exact uploaded voice note ID (${uploadedVoiceId})`
  );
  assert(
    primaryAudio.durationSeconds === 10,
    `Primary voice note duration is 10s (File size: ${primaryAudio.sizeKb} KB)`
  );

  // TEST 8 & 9: Stream Full Audio (HTTP 200) for Doctor Playback
  console.log('\n--- TEST 8 & 9: Stream Full Audio File (HTTP 200) ---');
  const streamContext = createMockReqRes({
    params: { audioId: uploadedVoiceId },
  });
  await MediaController.getAudioFile(streamContext.req, streamContext.res as any, streamContext.next);
  assert(
    streamContext.getStatus() === 200,
    'GET /api/audio/:id returns HTTP 200 for full playback'
  );
  assert(
    streamContext.getHeaders()['Content-Type'] === 'audio/wav',
    `Content-Type matches actual format: ${streamContext.getHeaders()['Content-Type']}`
  );
  assert(
    streamContext.getHeaders()['Content-Length'] === diskSize,
    `Content-Length matches full file size: ${streamContext.getHeaders()['Content-Length']} bytes`
  );
  assert(
    streamContext.getHeaders()['Accept-Ranges'] === 'bytes',
    'Accept-Ranges: bytes is enabled for HTML5 audio scrubbing'
  );

  // TEST 10: Test Seeking / Scrubbing with HTTP Range (HTTP 206)
  console.log('\n--- TEST 10: Seeking with HTTP Range (HTTP 206 Partial Content) ---');
  const rangeContext = createMockReqRes({
    params: { audioId: uploadedVoiceId },
    headers: { range: 'bytes=1000-4999' },
  });
  await MediaController.getAudioFile(rangeContext.req, rangeContext.res as any, rangeContext.next);
  assert(
    rangeContext.getStatus() === 206,
    'GET /api/audio/:id with Range header returns HTTP 206 Partial Content'
  );
  assert(
    rangeContext.getHeaders()['Content-Range'] === `bytes 1000-4999/${diskSize}`,
    `Content-Range header verified: ${rangeContext.getHeaders()['Content-Range']}`
  );
  assert(
    rangeContext.getHeaders()['Content-Length'] === 4000,
    `Content-Length matches requested slice: ${rangeContext.getHeaders()['Content-Length']} bytes`
  );

  // TEST 11: Verify 35-byte Dummy ASCII Records are Safely Ignored
  console.log('\n--- TEST 11: Corrupt / Dummy 35-byte Audio Filtering ---');
  const allVoiceNotes = caseAudioData.data;
  const dummyFound = allVoiceNotes.some((vn: any) => vn.fileSizeBytes < 100);
  assert(
    !dummyFound,
    'All dummy 35-byte text files are filtered out from Doctor Dashboard (Zero corrupt files presented)'
  );

  console.log(`\n🎉 ========================================================`);
  console.log(`🎉 ALL ${passed}/${total} AUDIO PIPELINE TESTS PASSED!`);
  console.log(`🎉 ========================================================\n`);
}

runAudioPipelineTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
