import { prisma } from '../src/config/database.js';

async function main() {
  const vns = await prisma.voiceNote.findMany({
    include: { fileRecord: true },
    orderBy: { recordedAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${vns.length} voice notes:`);
  for (const v of vns) {
    console.log({
      id: v.id,
      consultationId: v.consultationId,
      patientId: v.patientId,
      codec: v.codec,
      duration: v.durationSeconds,
      path: v.fileRecord?.originalPath,
      sizeBytes: v.fileRecord?.originalSizeBytes,
      mimeType: v.fileRecord?.mimeType,
      recordedAt: v.recordedAt,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
