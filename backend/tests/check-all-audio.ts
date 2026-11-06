import fs from 'fs';
import path from 'path';

const audioDir = 'C:\\Users\\VICKY\\.gemini\\antigravity\\scratch\\carelink-telemedicine-app\\backend\\storage\\original\\audio';
const files = fs.readdirSync(audioDir);

for (const f of files) {
  if (f.endsWith('.webm') || f.endsWith('.wav')) {
    const full = path.join(audioDir, f);
    const stat = fs.statSync(full);
    const buf = fs.readFileSync(full);
    const magic = buf.slice(0, 4).toString('hex');
    const isWav = buf.slice(0, 4).toString() === 'RIFF';
    const isWebm = magic === '1a45dfa3';
    console.log(`${f} | Size: ${stat.size}B | WAV: ${isWav} | WebM: ${isWebm}`);
  }
}
