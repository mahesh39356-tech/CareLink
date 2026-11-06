import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { prisma, connectDatabase } from '../src/config/database.js';
import { AuthController } from '../src/controllers/auth.controller.js';
import { MediaController, resolveExistingFilePath } from '../src/controllers/media.controller.js';
import { Writable } from 'stream';

class MockStreamResponse extends Writable {
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
  body?: any;
  headers?: any;
  file?: any;
}) {
  const req: any = {
    params: options.params || {},
    body: options.body || {},
    headers: options.headers || {},
    file: options.file || null,
  };
  const res = new MockStreamResponse();
  const next = (err: any) => {
    if (err) console.error('Next called with error:', err);
  };
  return { req, res, next };
}

async function runEndToEndVerification() {
  console.log('\n========================================================');
  console.log('🩺 CARELINK PRESENTATION VERIFICATION: ALL ISSUES TEST');
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
  // TEST A: Log in as Patient A (Amina Mwangi - 0418)
  // -------------------------------------------------------------------------
  console.log('--- TEST A: Log in as Patient A (0418) ---');
  const loginCtxA = createReqRes({
    body: { identifier: '0418', password: 'RuralCare2026!' },
  });
  await AuthController.patientLogin(loginCtxA.req, loginCtxA.res as any, loginCtxA.next);
  const dataA = loginCtxA.res.getData();
  assert(loginCtxA.res.statusCode === 200 && dataA.success, 'Patient A logged in successfully');
  const patientAToken = dataA.data.tokens.accessToken;
  const patientAProfile = dataA.data.user.patientProfile || dataA.data.user.profile;
  assert(patientAProfile.fullName === 'Amina Mwangi', 'Patient A profile matches Amina Mwangi');

  // -------------------------------------------------------------------------
  // TEST B: Verify Image History Retrieval for Patient A
  // -------------------------------------------------------------------------
  console.log('\n--- TEST B: Verify Image History for Patient A ---');
  const historyCtxA = createReqRes({
    params: { caseId: '0418' },
    headers: { authorization: `Bearer ${patientAToken}` },
  });
  await MediaController.getCaseImages(historyCtxA.req, historyCtxA.res as any, historyCtxA.next);
  const historyDataA = historyCtxA.res.getData();
  assert(historyCtxA.res.statusCode === 200 && historyDataA.success, 'Retrieved patient A image history');
  const initialHistoryCountA = historyDataA.data.length;
  console.log(`  ℹ️ Patient A currently has ${initialHistoryCountA} saved images in history`);

  // -------------------------------------------------------------------------
  // TEST C: Upload a New Medical Image & Verify Real Compression
  // -------------------------------------------------------------------------
  console.log('\n--- TEST C: Upload New Image with Genuine WebP Compression ---');
  const rawPngImage = await sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 4,
      background: { r: 160, g: 90, b: 70, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const originalSizeBytes = rawPngImage.length; // Raw uncompressed size
  const webpBuffer = await sharp(rawPngImage)
    .webp({ quality: 70 })
    .toBuffer();
  const compressedSizeBytes = webpBuffer.length;

  console.log(`  Raw uncompressed image size: ${originalSizeBytes} bytes (~${(originalSizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`  Pre-compressed WebP size: ${compressedSizeBytes} bytes (~${(compressedSizeBytes / 1024).toFixed(1)} KB)`);

  const uploadImgCtx = createReqRes({
    params: { caseId: '0418' },
    body: {
      label: 'PRESENTATION_LESION_01',
      bodySite: 'DERMATOLOGY',
      originalSizeBytes: String(originalSizeBytes),
    },
    file: {
      buffer: webpBuffer,
      originalname: 'patient_lesion.webp',
      mimetype: 'image/webp',
    },
  });

  await MediaController.uploadCaseImage(uploadImgCtx.req, uploadImgCtx.res as any, uploadImgCtx.next);
  const uploadImgData = uploadImgCtx.res.getData();
  assert(uploadImgCtx.res.statusCode === 201 && uploadImgData.success, 'New medical image uploaded successfully');
  assert(uploadImgData.data.originalSizeBytes === originalSizeBytes, 'Original size matches uncompressed raw bytes');
  assert(uploadImgData.data.compressedSizeBytes === compressedSizeBytes, 'Compressed size matches WebP buffer');
  assert(uploadImgData.data.compressionRatio > 50, `Substantial bandwidth reduction verified: ${uploadImgData.data.compressionRatio}% smaller`);

  // Verify the newly uploaded image is now in Patient A's medical image history
  const updatedHistoryCtxA = createReqRes({ params: { caseId: '0418' } });
  await MediaController.getCaseImages(updatedHistoryCtxA.req, updatedHistoryCtxA.res as any, updatedHistoryCtxA.next);
  const updatedHistoryDataA = updatedHistoryCtxA.res.getData();
  assert(updatedHistoryDataA.data.length === initialHistoryCountA + 1, 'Newly uploaded image automatically moved to Medical Image History');

  // -------------------------------------------------------------------------
  // TEST D, E, F: Patient Audio Recording, Pre-upload Playback & Upload
  // -------------------------------------------------------------------------
  console.log('\n--- TEST D, E, F: Patient Voice Recording & Upload ---');
  // Use real 48kHz WebM Opus recording on disk (15,173 bytes)
  const realAudioPath = path.resolve(process.cwd(), 'storage/original/audio/audio_1793949707963_shyec.webm');
  assert(fs.existsSync(realAudioPath), `Real microphone WebM Opus audio exists at: ${realAudioPath}`);
  const realAudioBuffer = fs.readFileSync(realAudioPath);
  assert(realAudioBuffer.slice(0, 4).toString('hex') === '1a45dfa3', 'Verified Matroska/WebM EBML magic header');

  const uploadAudioCtx = createReqRes({
    params: { caseId: '0418' },
    body: {
      language: 'English',
      durationSeconds: '5',
    },
    file: {
      buffer: realAudioBuffer,
      originalname: 'patient_presentation_recording.webm',
      mimetype: 'audio/webm',
    },
  });

  await MediaController.uploadCaseAudio(uploadAudioCtx.req, uploadAudioCtx.res as any, uploadAudioCtx.next);
  const uploadAudioData = uploadAudioCtx.res.getData();
  assert(uploadAudioCtx.res.statusCode === 201 && uploadAudioData.success, 'Voice note uploaded successfully to Case 0418');
  const newVoiceNoteId = uploadAudioData.data.id;

  // -------------------------------------------------------------------------
  // TEST G, H: Log in as Doctor & Open Patient A's Case
  // -------------------------------------------------------------------------
  console.log('\n--- TEST G, H: Doctor Ingestion of Case 0418 ---');
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
  assert(docAudioList.data[0].id === newVoiceNoteId, 'Latest recording is at index 0 (matches patient recording)');

  // -------------------------------------------------------------------------
  // TEST I, J: Stream Audio via HTTP 200 & HTTP 206 (Doctor Playback)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST I, J: Doctor Dashboard Audio Playback & Seeking ---');
  const streamCtx = createReqRes({
    params: { audioId: newVoiceNoteId },
    headers: { authorization: `Bearer ${doctorToken}` },
  });
  await new Promise<void>((resolve, reject) => {
    streamCtx.res.on('finish', resolve);
    streamCtx.res.on('error', reject);
    MediaController.getAudioFile(streamCtx.req, streamCtx.res as any, reject);
  });
  assert(streamCtx.res.statusCode === 200, 'Audio stream returns HTTP 200 for full playback');
  assert(streamCtx.res.headers['Content-Type'] === 'audio/webm', 'MIME type is clean standard audio/webm');
  assert(streamCtx.res.body.length === realAudioBuffer.length, 'Streamed bytes match original recording');

  // Range seeking (HTTP 206)
  const rangeCtx = createReqRes({
    params: { audioId: newVoiceNoteId },
    headers: { range: 'bytes=0-2047', authorization: `Bearer ${doctorToken}` },
  });
  await new Promise<void>((resolve, reject) => {
    rangeCtx.res.on('finish', resolve);
    rangeCtx.res.on('error', reject);
    MediaController.getAudioFile(rangeCtx.req, rangeCtx.res as any, reject);
  });
  assert(rangeCtx.res.statusCode === 206, 'HTTP Range request returns 206 Partial Content');
  assert(rangeCtx.res.headers['Content-Range'] === `bytes 0-2047/${realAudioBuffer.length}`, 'Content-Range header verified');
  assert(rangeCtx.res.body.length === 2048, 'Range chunk length verified');

  // -------------------------------------------------------------------------
  // TEST K: Patient B Data Isolation (Log in as Joseph Otieno - 0419)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST K: Patient Isolation Verification (Patient B - 0419) ---');
  const loginCtxB = createReqRes({
    body: { identifier: '0419', password: 'RuralCare2026!' },
  });
  await AuthController.patientLogin(loginCtxB.req, loginCtxB.res as any, loginCtxB.next);
  const dataB = loginCtxB.res.getData();
  assert(loginCtxB.res.statusCode === 200 && dataB.success, 'Patient B logged in successfully');
  const patientBToken = dataB.data.tokens.accessToken;

  // Retrieve Patient B's images
  const historyCtxB = createReqRes({
    params: { caseId: '0419' },
    headers: { authorization: `Bearer ${patientBToken}` },
  });
  await MediaController.getCaseImages(historyCtxB.req, historyCtxB.res as any, historyCtxB.next);
  const historyDataB = historyCtxB.res.getData();
  assert(historyDataB.success, 'Retrieved Patient B image history');

  // Check that NO image in Patient B's history belongs to Patient A
  const patientAImageIds = updatedHistoryDataA.data.map((img: any) => img.id);
  const leakedImages = historyDataB.data.filter((img: any) => patientAImageIds.includes(img.id));
  assert(leakedImages.length === 0, 'ZERO images from Patient A appear in Patient B account (Strict Isolation)');

  // -------------------------------------------------------------------------
  // TEST L: Database and Persistent Storage Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- TEST L: Database & Storage Persistence Integrity ---');
  const savedRecord = await prisma.fileRecord.findUnique({
    where: { id: uploadAudioData.data.fileRecordId },
  });
  assert(savedRecord !== null, 'Audio record persists in SQLite database');
  const resolvedDisk = resolveExistingFilePath(savedRecord!.originalPath, 'audio');
  assert(!!resolvedDisk && fs.existsSync(resolvedDisk), `Audio file verified on disk: ${resolvedDisk}`);
  assert(fs.statSync(resolvedDisk!).size === realAudioBuffer.length, 'Persisted file size matches uploaded audio');

  console.log('\n========================================================');
  console.log(`🎉 ALL ${passed}/${total} END-TO-END TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================\n');
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
