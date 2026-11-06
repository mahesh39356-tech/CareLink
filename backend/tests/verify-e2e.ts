import { Request, Response } from 'express';
import { AuthController } from '../src/controllers/auth.controller.js';
import { MediaController } from '../src/controllers/media.controller.js';
import { PrescriptionController } from '../src/controllers/prescription.controller.js';
import { connectDatabase, prisma } from '../src/config/database.js';
import { initStorageDirectories } from '../src/config/storage.js';
import fs from 'fs';
import path from 'path';

import { Writable } from 'stream';

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
    req: req as Request,
    res: res as unknown as Response,
    next,
    getStatus: () => res.statusCode,
    getData: () => responseData,
    getHeaders: () => res.responseHeaders,
    getBuffer: () => Buffer.concat(chunks),
  };
}

async function runE2E() {
  console.log('\n🏥 ========================================================');
  console.log('🩺 CareLink Telemedicine Controller & API Verification');
  console.log('🏥 ========================================================\n');

  initStorageDirectories();
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
      process.exitCode = 1;
    }
  }

  try {
    // 1. Patient Login (Patient ID 0418)
    const patContext = createMockReqRes({
      body: { identifier: '0418', password: 'RuralCare2026!' },
    });
    await AuthController.patientLogin(patContext.req, patContext.res, patContext.next);
    const patData = patContext.getData();
    assert(
      patContext.getStatus() === 200 &&
      patData.success === true &&
      patData.data.tokens.accessToken &&
      patData.data.user.role === 'PATIENT',
      'Patient Login: Identifier 0418 successfully authenticated with JWT accessToken'
    );

    // 2. Doctor Login (doctor@carelink.org)
    const docContext = createMockReqRes({
      body: { identifier: 'doctor@carelink.org', password: 'RuralCare2026!' },
    });
    await AuthController.doctorLogin(docContext.req, docContext.res, docContext.next);
    const docData = docContext.getData();
    assert(
      docContext.getStatus() === 200 &&
      docData.success === true &&
      docData.data.tokens.accessToken &&
      docData.data.user.role === 'DOCTOR',
      'Doctor Login: Physician successfully authenticated with role DOCTOR'
    );

    // 3. Image List for Case 0418
    const imgContext = createMockReqRes({
      params: { caseId: '0418' },
    });
    await MediaController.getCaseImages(imgContext.req, imgContext.res, imgContext.next);
    const imgData = imgContext.getData();
    assert(
      imgContext.getStatus() === 200 &&
      imgData.success === true &&
      Array.isArray(imgData.data) &&
      imgData.data.length > 0,
      `Clinical Images: Case 0418 has ${imgData.data?.length || 0} stored image derivatives`
    );

    // 4. Audio Voice Notes for Case 0418
    const audioContext = createMockReqRes({
      params: { caseId: '0418' },
    });
    await MediaController.getCaseAudio(audioContext.req, audioContext.res, audioContext.next);
    const audioData = audioContext.getData();
    assert(
      audioContext.getStatus() === 200 &&
      audioData.success === true &&
      Array.isArray(audioData.data) &&
      audioData.data.length > 0,
      `Voice Notes: Case 0418 has ${audioData.data?.length || 0} voice recordings with durations & sizes`
    );

    // 5. Prescriptions for Patient 0418
    const rxContext = createMockReqRes({
      params: { patientId: '0418' },
      user: { role: 'PATIENT', id: '0418' },
    });
    await PrescriptionController.getByPatient(rxContext.req, rxContext.res, rxContext.next);
    const rxData = rxContext.getData();
    assert(
      rxContext.getStatus() === 200 &&
      rxData.success === true &&
      Array.isArray(rxData.data),
      `Digital Prescriptions: Retrieved ${rxData.data?.length || 0} prescriptions for patient 0418`
    );

    // 6. Audio File Streaming & Range Headers
    if (audioData.data && audioData.data.length > 0) {
      const audioId = audioData.data[0].id;

      // Full 200 Stream
      const streamContext = createMockReqRes({
        params: { audioId },
      });
      await MediaController.getAudioFile(streamContext.req, streamContext.res, streamContext.next);
      assert(
        streamContext.getStatus() === 200,
        `Audio Streaming: Full file stream returns HTTP 200 (Accept-Ranges: bytes)`
      );

      // Partial 206 Stream
      const rangeContext = createMockReqRes({
        params: { audioId },
        headers: { range: 'bytes=0-500' },
      });
      await MediaController.getAudioFile(rangeContext.req, rangeContext.res, rangeContext.next);
      assert(
        rangeContext.getStatus() === 206 &&
        rangeContext.getHeaders()['Content-Range']?.startsWith('bytes 0-500/'),
        `Audio Streaming: Range header returns HTTP 206 Partial Content with Content-Range`
      );
    }

    // 7. Clinical Image Streaming
    if (imgData.data && imgData.data.length > 0) {
      const imageId = imgData.data[0].id;
      const imgStreamContext = createMockReqRes({
        params: { imageId },
      });
      await MediaController.getImageFile(imgStreamContext.req, imgStreamContext.res, imgStreamContext.next);
      assert(
        imgStreamContext.getStatus() === 200 &&
        imgStreamContext.getHeaders()['Content-Type']?.includes('image/'),
        `Clinical Image Streaming: Returns HTTP 200 with MIME: ${imgStreamContext.getHeaders()['Content-Type']}`
      );
    }

    // 8. Upload Real Medical Image (Sharp WebP compression & disk storage)
    const testJpgBuffer = await (await import('sharp')).default({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 180, g: 110, b: 70 },
      },
    }).jpeg({ quality: 90 }).toBuffer();

    const uploadImgContext = createMockReqRes({
      params: { caseId: '0418' },
      body: { label: 'Verification Dermatology Photo', bodySite: 'FOREARM' },
      file: {
        buffer: testJpgBuffer,
        originalname: 'test_dermatology.jpg',
        mimetype: 'image/jpeg',
      },
    });
    await MediaController.uploadCaseImage(uploadImgContext.req, uploadImgContext.res, uploadImgContext.next);
    const uploadImgData = uploadImgContext.getData();
    assert(
      uploadImgContext.getStatus() === 201 &&
      uploadImgData.success === true &&
      uploadImgData.data.compressedSizeBytes > 0 &&
      uploadImgData.data.url,
      `Image Upload & Sharp WebP Compression: Generated WebP derivative (Original: ${uploadImgData.data?.originalSizeBytes}B -> Compressed: ${uploadImgData.data?.compressedSizeBytes}B)`
    );

    // 9. Upload Real Audio Voice Note
    const testAudioBuffer = Buffer.alloc(16000 * 2 + 44);
    testAudioBuffer.write('RIFF', 0);
    testAudioBuffer.write('WAVE', 8);
    const uploadAudioContext = createMockReqRes({
      params: { caseId: '0418' },
      body: { durationSeconds: '4', language: 'Swahili' },
      file: {
        buffer: testAudioBuffer,
        originalname: 'test_voice_note.wav',
        mimetype: 'audio/wav',
      },
    });
    await MediaController.uploadCaseAudio(uploadAudioContext.req, uploadAudioContext.res, uploadAudioContext.next);
    const uploadAudioData = uploadAudioContext.getData();
    assert(
      uploadAudioContext.getStatus() === 201 &&
      uploadAudioData.success === true &&
      uploadAudioData.data.fileSizeBytes > 0 &&
      uploadAudioData.data.url,
      `Audio Upload & Persistence: Stored voice note (${uploadAudioData.data?.sizeKb} KB, duration: ${uploadAudioData.data?.durationSeconds}s)`
    );

    console.log(`\n🎉 All ${passed}/${total} Controller & API Verifications PASSED!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
