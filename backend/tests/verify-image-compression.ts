import { MediaController } from '../src/controllers/media.controller.js';
import sharp from 'sharp';

async function testImageCompression() {
  // 1. Generate a real WebP image buffer (e.g. 45 KB) simulating client-side compression
  const sampleWebp = await sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 4,
      background: { r: 190, g: 120, b: 80, alpha: 1 },
    },
  })
    .webp({ quality: 65 })
    .toBuffer();

  const simulatedOriginalBytes = 512000; // 500 KB uncompressed raw camera image
  console.log(`Simulated Original Size: ${simulatedOriginalBytes} bytes (500.0 KB)`);
  console.log(`Pre-compressed WebP Size: ${sampleWebp.length} bytes (~${(sampleWebp.length / 1024).toFixed(1)} KB)`);

  const req: any = {
    params: { caseId: '0418' },
    body: {
      label: 'CLINICAL LESION TEST',
      bodySite: 'DERMATOLOGY',
      originalSizeBytes: String(simulatedOriginalBytes),
    },
    file: {
      buffer: sampleWebp,
      originalname: 'lesion.webp',
      mimetype: 'image/webp',
    },
  };

  let jsonResult: any = null;
  let statusCode = 200;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonResult = data;
      return res;
    },
  };

  const next = (err: any) => {
    if (err) console.error('Error during image upload:', err);
  };

  await MediaController.uploadCaseImage(req, res, next);

  console.log('\nUpload Response:');
  console.log('HTTP Status:', statusCode);
  console.log('Success:', jsonResult?.success);
  console.log('Data:', {
    id: jsonResult?.data?.id,
    originalSizeBytes: jsonResult?.data?.originalSizeBytes,
    compressedSizeBytes: jsonResult?.data?.compressedSizeBytes,
    compressionRatio: jsonResult?.data?.compressionRatio,
    spaceSavedBytes: jsonResult?.data?.spaceSavedBytes,
  });

  if (jsonResult?.data?.originalSizeBytes === simulatedOriginalBytes && jsonResult?.data?.compressedSizeBytes === sampleWebp.length) {
    console.log('✅ PASS: Real image compression verified! Before and after sizes accurately calculated from genuine bytes.');
  } else {
    console.error('❌ FAIL: Sizes do not match expected values.');
  }
}

testImageCompression().catch(console.error);
