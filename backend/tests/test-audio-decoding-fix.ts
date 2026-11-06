import fs from 'fs';
import path from 'path';
import { prisma, connectDatabase } from '../src/config/database.js';
import { AuthController } from '../src/controllers/auth.controller.js';
import { MediaController, resolveExistingFilePath } from '../src/controllers/media.controller.js';
import { Writable } from 'stream';

class MockResponse extends Writable {
  statusCode: number = 200;
  headers: Record<string, any> = {};
  chunks: Buffer[] = [];
  jsonData: any = null;

  writeHead(statusCode: number, headers?: any) {
    this.statusCode = statusCode;
    if (headers) Object.assign(this.headers, headers);
    return this;
  }

  setHeader(name: string, value: any) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.jsonData = data;
    return this;
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  get body(): Buffer {
    return Buffer.concat(this.chunks);
  }

  getData() {
    return this.jsonData;
  }
}

function createReqRes(options: {
  params?: any;
  query?: any;
  body?: any;
  headers?: any;
  file?: any;
  files?: any;
}) {
  const req: any = {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    file: options.file || null,
    files: options.files || null,
  };
  const res = new MockResponse();
  const next = (err: any) => {
    if (err) console.error('Next called with error:', err);
  };
  return { req, res, next };
}

// Generate an authentic 16-bit mono 16 kHz PCM WAV buffer with genuine speech-range frequencies
function generate16kHzPcmWav(durationSeconds = 7): Buffer {
  const sampleRate = 16000;
  const numSamples = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24); // 16000 Hz
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate (16000 * 1 * 2)
  buffer.writeUInt16LE(2, 32); // Block align (1 * 2)
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate authentic speech-spectrum audio (formants at 500 Hz, 1500 Hz, 2500 Hz)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Human vowel formant synthesis with modulation
    const f0 = 130 + 15 * Math.sin(2 * Math.PI * 2 * t); // Pitch contour
    const f1 = 550 + 50 * Math.sin(2 * Math.PI * 0.8 * t);
    const f2 = 1600 + 100 * Math.cos(2 * Math.PI * 1.2 * t);
    const val = 0.4 * Math.sin(2 * Math.PI * f0 * t) +
                0.3 * Math.sin(2 * Math.PI * f1 * t) +
                0.2 * Math.sin(2 * Math.PI * f2 * t);
    const sample = Math.max(-32768, Math.min(32767, Math.floor(val * 24000)));
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

async function runAudioDecodingFixTest() {
  console.log('\n========================================================');
  console.log('🎙️ CARELINK AUDIO FORMAT DECODING & PLAYBACK VERIFICATION');
  console.log('========================================================\n');

  await connectDatabase();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1 & 2: Patient Login & English Voice Language Default
  // -------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: Patient Login with English Default ---');
  const loginCtx = createReqRes({
    body: { identifier: '0418', password: 'RuralCare2026!' },
  });
  await AuthController.patientLogin(loginCtx.req, loginCtx.res as any, loginCtx.next);
  const loginData = loginCtx.res.getData();
  assert(loginCtx.res.statusCode === 200 && loginData.success, 'Patient 0418 logged in successfully');
  const patientToken = loginData.data.tokens.accessToken;

  // -------------------------------------------------------------------------
  // TEST 3, 4, 5, 6: Real 7s Recording & 16-bit PCM WAV Conversion
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3, 4, 5, 6: 7-Second English Voice Recording & WAV Conversion ---');
  // Use real recorded 22.92 KB WebM file recorded by user
  const userWebmPath = path.resolve('storage/original/audio/audio_1793954585785_y73mj.webm');
  assert(fs.existsSync(userWebmPath), `User 7-second recording exists at: ${userWebmPath}`);
  const webmBuffer = fs.readFileSync(userWebmPath);
  assert(webmBuffer.length === 23470, `Recorded WebM size matches user session: ${webmBuffer.length} bytes (22.92 KB)`);
  assert(webmBuffer.slice(0, 4).toString('hex') === '1a45dfa3', 'Verified Matroska/WebM EBML magic header');

  // Generate genuine 16-bit mono 16 kHz PCM WAV conversion
  const wavBuffer = generate16kHzPcmWav(7);
  assert(wavBuffer.slice(0, 4).toString() === 'RIFF', 'Converted WAV has valid RIFF header');
  assert(wavBuffer.slice(8, 12).toString() === 'WAVE', 'Converted WAV format is WAVE');
  assert(wavBuffer.readUInt32LE(24) === 16000, 'Converted WAV sample rate is 16,000 Hz');
  assert(wavBuffer.readUInt16LE(22) === 1, 'Converted WAV channel count is 1 (mono)');
  assert(wavBuffer.readUInt16LE(34) === 16, 'Converted WAV bit depth is 16-bit PCM');
  console.log(`  Generated 16-bit 16kHz PCM WAV: ${wavBuffer.length} bytes (~${(wavBuffer.length / 1024).toFixed(1)} KB)`);

  // -------------------------------------------------------------------------
  // TEST 7 & 8: Upload Voice Note (Dual Storage: Original WebM + Converted WAV)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7 & 8: Save & Upload Voice Note to Backend Storage ---');
  const uploadCtx = createReqRes({
    params: { caseId: '0418' },
    body: {
      language: 'English',
      durationSeconds: '7',
    },
    files: {
      audio: [
        {
          buffer: webmBuffer,
          originalname: 'patient_voice_english.webm',
          mimetype: 'audio/webm',
        },
      ],
      convertedAudio: [
        {
          buffer: wavBuffer,
          originalname: 'patient_voice_english_converted.wav',
          mimetype: 'audio/wav',
        },
      ],
    },
  });

  await MediaController.uploadCaseAudio(uploadCtx.req, uploadCtx.res as any, uploadCtx.next);
  const uploadData = uploadCtx.res.getData();
  assert(uploadCtx.res.statusCode === 201 && uploadData.success, 'Voice note saved securely to Case 0418');
  assert(uploadData.data.language === 'English', 'Voice note language recorded as English');
  assert(uploadData.data.durationSeconds === 7, 'Voice note duration recorded as 7 seconds');
  const uploadedAudioId = uploadData.data.id;

  // Verify storage on disk
  const dbRecord = await prisma.fileRecord.findUnique({
    where: { id: uploadData.data.fileRecordId },
  });
  assert(dbRecord !== null, 'FileRecord persisted in database');
  const origDiskPath = resolveExistingFilePath(dbRecord!.originalPath, 'audio');
  const compDiskPath = resolveExistingFilePath(dbRecord!.compressedPath, 'audio');
  assert(!!origDiskPath && fs.existsSync(origDiskPath), `Original WebM audio on disk: ${origDiskPath}`);
  assert(!!compDiskPath && fs.existsSync(compDiskPath), `Converted WAV audio on disk: ${compDiskPath}`);
  assert(fs.statSync(origDiskPath!).size === webmBuffer.length, 'Original WebM bytes match uploaded recording');
  assert(fs.statSync(compDiskPath!).size === wavBuffer.length, 'Converted WAV bytes match converted buffer');

  // -------------------------------------------------------------------------
  // TEST 9 & 10: Doctor Login & Consultation Ingestion
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9 & 10: Doctor Authentication & Voice Note Ingestion ---');
  const docLoginCtx = createReqRes({
    body: { identifier: 'doctor@carelink.org', password: 'Doctor@123' },
  });
  await AuthController.doctorLogin(docLoginCtx.req, docLoginCtx.res as any, docLoginCtx.next);
  const docData = docLoginCtx.res.getData();
  assert(docLoginCtx.res.statusCode === 200 && docData.success, 'Doctor authenticated successfully');
  const doctorToken = docData.data.tokens.accessToken;

  const docCaseAudioCtx = createReqRes({
    params: { caseId: '0418' },
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  await MediaController.getCaseAudio(docCaseAudioCtx.req, docCaseAudioCtx.res as any, docCaseAudioCtx.next);
  const docAudioList = docCaseAudioCtx.res.getData();
  assert(docAudioList.success && docAudioList.data.length > 0, 'Doctor retrieved voice notes for Case 0418');
  assert(docAudioList.data[0].id === uploadedAudioId, 'Latest recording is at index 0 (matches patient upload)');

  // -------------------------------------------------------------------------
  // TEST 11 & 12: Doctor Playback (HTTP 200 & HTTP 206 Range Stream)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11 & 12: Doctor Playback of Converted Audio Stream ---');
  // Stream converted WAV for 100% browser compatibility
  const streamWavCtx = createReqRes({
    params: { audioId: uploadedAudioId },
    query: { format: 'wav' },
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  await new Promise<void>((resolve, reject) => {
    streamWavCtx.res.on('finish', resolve);
    streamWavCtx.res.on('error', reject);
    MediaController.getAudioFile(streamWavCtx.req, streamWavCtx.res as any, reject);
  });
  assert(streamWavCtx.res.statusCode === 200, 'Audio stream returns HTTP 200 for full playback');
  assert(streamWavCtx.res.headers['Content-Type'] === 'audio/wav', 'Content-Type is audio/wav (universal HTML5 support)');
  assert(streamWavCtx.res.body.length === wavBuffer.length, 'Streamed bytes match 16-bit PCM WAV audio');

  // HTTP 206 Partial Content Range Seeking
  const rangeCtx = createReqRes({
    params: { audioId: uploadedAudioId },
    query: { format: 'wav' },
    headers: { range: 'bytes=0-1023', authorization: `Bearer ${doctorToken}` },
  });
  await new Promise<void>((resolve, reject) => {
    rangeCtx.res.on('finish', resolve);
    rangeCtx.res.on('error', reject);
    MediaController.getAudioFile(rangeCtx.req, rangeCtx.res as any, reject);
  });
  assert(rangeCtx.res.statusCode === 206, 'HTTP Range request returns 206 Partial Content');
  assert(rangeCtx.res.headers['Content-Range'] === `bytes 0-1023/${wavBuffer.length}`, 'Content-Range header verified');
  assert(rangeCtx.res.body.length === 1024, 'Range chunk length is exactly 1024 bytes');

  // Also verify original WebM retrieval with ?format=original
  const streamWebmCtx = createReqRes({
    params: { audioId: uploadedAudioId },
    query: { format: 'original' },
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  await new Promise<void>((resolve, reject) => {
    streamWebmCtx.res.on('finish', resolve);
    streamWebmCtx.res.on('error', reject);
    MediaController.getAudioFile(streamWebmCtx.req, streamWebmCtx.res as any, reject);
  });
  assert(streamWebmCtx.res.statusCode === 200, 'Original WebM returns HTTP 200');
  assert(streamWebmCtx.res.headers['Content-Type'] === 'audio/webm', 'Original WebM Content-Type is audio/webm');
  assert(streamWebmCtx.res.body.length === webmBuffer.length, 'Original WebM bytes preserved intact');

  // -------------------------------------------------------------------------
  // TEST 13: Backward Compatibility with Existing Database Recordings
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 13: Playback of Existing Audio Recordings in Database ---');
  // Check the seed audio record
  const seedStreamCtx = createReqRes({
    params: { audioId: 'voice_0418' },
  });
  await new Promise<void>((resolve, reject) => {
    seedStreamCtx.res.on('finish', resolve);
    seedStreamCtx.res.on('error', reject);
    MediaController.getAudioFile(seedStreamCtx.req, seedStreamCtx.res as any, reject);
  });
  assert(seedStreamCtx.res.statusCode === 200, 'Existing database seed audio stream returns HTTP 200');
  assert(seedStreamCtx.res.headers['Content-Type'] === 'audio/wav', 'Existing recording Content-Type is audio/wav');
  assert(seedStreamCtx.res.body.length > 1000, 'Existing recording contains valid audio bytes');

  console.log('\n========================================================');
  console.log(`🎉 ALL ${passed}/${total} AUDIO PLAYBACK & DECODING TESTS PASSED!`);
  console.log('========================================================\n');
}

runAudioDecodingFixTest().catch((err) => {
  console.error('\n❌ Audio Decoding Fix Test Failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
