import { prisma } from '../src/config/database.js';
import fs from 'fs';

async function check() {
  const vns = await prisma.voiceNote.findMany({
    include: { fileRecord: true, consultation: true },
    orderBy: { recordedAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${vns.length} recent VoiceNotes:`);
  for (const vn of vns) {
    const origPath = vn.fileRecord?.originalPath || '';
    const compPath = vn.fileRecord?.compressedPath || '';
    const origExists = fs.existsSync(origPath);
    const compExists = fs.existsSync(compPath);
    const origSize = origExists ? fs.statSync(origPath).size : -1;
    const compSize = compExists ? fs.statSync(compPath).size : -1;

    console.log({
      vnId: vn.id,
      patientId: vn.patientId,
      caseNumber: vn.consultation?.caseNumber,
      fileRecordId: vn.fileRecordId,
      mimeType: vn.fileRecord?.mimeType,
      origPath,
      origExists,
      origSize,
      compPath,
      compExists,
      compSize,
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
