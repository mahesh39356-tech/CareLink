import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database.js';

async function testResolution() {
  const vn = await prisma.voiceNote.findFirst({
    where: {
      fileRecord: {
        originalFilename: { contains: 'seed_audio' },
      },
    },
    include: { fileRecord: true },
  });

  if (!vn || !vn.fileRecord) {
    console.log('No seed audio found');
    return;
  }

  const p = vn.fileRecord.compressedPath || vn.fileRecord.originalPath;
  console.log('Testing path from DB:', p);
  console.log('Current cwd:', process.cwd());
  console.log('Direct fs.existsSync(p):', fs.existsSync(p));

  // Resolved from backend
  const resolved = path.resolve(process.cwd(), p);
  console.log('Resolved path:', resolved);
  console.log('fs.existsSync(resolved):', fs.existsSync(resolved));
}

testResolution().catch(console.error).finally(() => prisma.$disconnect());
