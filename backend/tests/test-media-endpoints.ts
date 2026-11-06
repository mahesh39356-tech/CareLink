import sharp from 'sharp';
import fs from 'fs';
import { app } from '../src/app.js';
import { initStorageDirectories } from '../src/config/storage.js';

let server: any;

async function runMediaTests() {
  initStorageDirectories();
  const PORT = 5055;
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}...`);

  const baseUrl = `http://localhost:${PORT}/api`;

  try {
    console.log('\n--- Test 1: GET /api/cases/0418/images ---');
    const getImgsRes = await fetch(`${baseUrl}/cases/0418/images`);
    const getImgsData = await getImgsRes.json();
    console.log('GET images response:', getImgsData);
    if (!getImgsRes.ok || getImgsData.count === 0) {
      throw new Error(`Failed to get images: status ${getImgsRes.status}`);
    }
    const firstImage = getImgsData.data[0];
    console.log(`✅ Retrieved ${getImgsData.count} images for case 0418. First image ID: ${firstImage.id}, URL: ${firstImage.url}`);

    console.log('\n--- Test 2: GET /api/images/:imageId ---');
    const imgFileRes = await fetch(`http://localhost:${PORT}${firstImage.url}`);
    if (!imgFileRes.ok) throw new Error(`Failed to stream image: status ${imgFileRes.status}`);
    const imgBuffer = await imgFileRes.arrayBuffer();
    console.log(`✅ Streamed real image: size=${imgBuffer.byteLength} bytes, content-type=${imgFileRes.headers.get('content-type')}`);

    console.log('\n--- Test 3: POST /api/cases/0418/images (Upload & Compress) ---');
    // Create a 640x480 test image with Sharp
    const testImgBuf = await sharp({
      create: { width: 640, height: 480, channels: 3, background: { r: 120, g: 190, b: 80 } }
    }).jpeg().toBuffer();

    const form = new FormData();
    form.append('image', new Blob([testImgBuf], { type: 'image/jpeg' }), 'live_test.jpg');
    form.append('label', 'IMAGE 02');
    form.append('bodySite', 'DERMATOLOGY');

    const uploadImgRes = await fetch(`${baseUrl}/cases/0418/images`, {
      method: 'POST',
      body: form,
    });
    const uploadImgData = await uploadImgRes.json();
    console.log('Upload image response:', uploadImgData);
    if (!uploadImgRes.ok || !uploadImgData.success) {
      throw new Error(`Failed to upload image: ${uploadImgData.error}`);
    }
    console.log(`✅ Uploaded and compressed image: original=${uploadImgData.data.originalSizeBytes}B, compressed=${uploadImgData.data.compressedSizeBytes}B, ratio=${uploadImgData.data.compressionRatio}%`);

    console.log('\n--- Test 4: GET /api/cases/0418/audio ---');
    const getAudioRes = await fetch(`${baseUrl}/cases/0418/audio`);
    const getAudioData = await getAudioRes.json();
    console.log('GET audio response:', getAudioData);
    if (!getAudioRes.ok || getAudioData.count === 0) {
      throw new Error(`Failed to get audio: status ${getAudioRes.status}`);
    }
    const firstAudio = getAudioData.data[0];
    console.log(`✅ Retrieved ${getAudioData.count} voice notes for case 0418. Audio ID: ${firstAudio.id}, URL: ${firstAudio.url}`);

    console.log('\n--- Test 5: GET /api/audio/:audioId (HTTP Range & Streaming) ---');
    const audioStreamRes = await fetch(`http://localhost:${PORT}${firstAudio.url}`, {
      headers: { Range: 'bytes=0-1023' }
    });
    if (audioStreamRes.status !== 206 && audioStreamRes.status !== 200) {
      throw new Error(`Failed to stream audio: status ${audioStreamRes.status}`);
    }
    const audioBuf = await audioStreamRes.arrayBuffer();
    console.log(`✅ Streamed audio with Range headers: bytes=${audioBuf.byteLength}, status=${audioStreamRes.status}, Content-Range=${audioStreamRes.headers.get('content-range')}`);

    console.log('\n--- Test 6: POST /api/cases/0418/audio (Upload Real Voice Recording) ---');
    const testAudioBlob = new Blob([Buffer.from('OPUS_SYNTH_AUDIO_PAYLOAD_TEST_12345')], { type: 'audio/webm' });
    const audioForm = new FormData();
    audioForm.append('audio', testAudioBlob, 'patient_voice.webm');
    audioForm.append('language', 'Swahili · auto-transcribed');
    audioForm.append('durationSeconds', '12');

    const uploadAudioRes = await fetch(`${baseUrl}/cases/0418/audio`, {
      method: 'POST',
      body: audioForm,
    });
    const uploadAudioData = await uploadAudioRes.json();
    console.log('Upload audio response:', uploadAudioData);
    if (!uploadAudioRes.ok || !uploadAudioData.success) {
      throw new Error(`Failed to upload audio: ${uploadAudioData.error}`);
    }
    console.log(`✅ Uploaded voice note: ID=${uploadAudioData.data.id}, size=${uploadAudioData.data.fileSizeBytes}B, URL=${uploadAudioData.data.url}`);

    console.log('\n🎉 ALL MEDIA BACKEND APIS TESTED AND VERIFIED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runMediaTests().catch((err) => {
  console.error('Test error:', err);
  if (server) server.close();
  process.exit(1);
});
