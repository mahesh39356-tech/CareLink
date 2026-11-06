import fs from 'fs';

function inspectWebm(filepath: string) {
  const buf = fs.readFileSync(filepath);
  console.log(`=== Inspecting ${filepath} ===`);
  console.log('Size:', buf.length, 'bytes');

  // Look for OpusHead or TrackEntry
  const opusHeadIdx = buf.indexOf(Buffer.from('OpusHead'));
  if (opusHeadIdx !== -1) {
    console.log('Found OpusHead at index:', opusHeadIdx);
    const channels = buf[opusHeadIdx + 9];
    const preSkip = buf.readUInt16LE(opusHeadIdx + 10);
    const sampleRate = buf.readUInt32LE(opusHeadIdx + 12);
    console.log({ channels, preSkip, sampleRate });
  } else {
    console.log('No OpusHead marker found directly (standard for Matroska SimpleBlocks)');
  }

  // Look for DocType
  const docTypeIdx = buf.indexOf(Buffer.from('webm'));
  console.log('DocType webm found:', docTypeIdx !== -1);
}

inspectWebm('C:\\Users\\VICKY\\.gemini\\antigravity\\scratch\\carelink-telemedicine-app\\backend\\storage\\original\\audio\\audio_1793949707963_shyec.webm');
inspectWebm('C:\\Users\\VICKY\\.gemini\antigravity\\scratch\\carelink-telemedicine-app\\backend\\storage\\original\\audio\\audio_1793948099285_ar7bk.webm');
