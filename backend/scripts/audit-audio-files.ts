import fs from 'fs';
import path from 'path';

const audioDir = path.resolve('storage/original/audio');
const files = fs.readdirSync(audioDir);

console.log('Auditing audio files in:', audioDir);
for (const file of files) {
  const filePath = path.join(audioDir, file);
  const stat = fs.statSync(filePath);
  const buf = Buffer.alloc(Math.min(stat.size, 64));
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);

  const hex = buf.toString('hex').slice(0, 32);
  const ascii = buf.toString('utf-8').replace(/[^\x20-\x7E]/g, '.').slice(0, 40);

  // Check magic bytes:
  // RIFF....WAVE = 52 49 46 46 .... 57 41 56 45 (WAV)
  // 1a 45 df a3 = WebM / Matroska
  // OggS = 4f 67 67 53 (OGG)
  let format = 'UNKNOWN';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WAVE') {
    format = 'VALID_RIFF_WAV';
  } else if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    format = 'VALID_WEBM';
  } else if (buf.slice(0, 4).toString() === 'OggS') {
    format = 'VALID_OGG';
  } else if (ascii.includes('OPUS_SYNTH')) {
    format = 'CORRUPT_TEST_ASCII_DUMMY (35 bytes)';
  }

  console.log(`${file.padEnd(34)} | ${stat.size.toString().padStart(7)} bytes | ${format} | ${ascii}`);
}
