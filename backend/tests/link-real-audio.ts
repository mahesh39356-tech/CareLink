import { prisma } from '../src/config/database.js';

async function check() {
  const vn = await prisma.voiceNote.findUnique({
    where: { id: '3c130343-89b2-43f6-8372-73bcaefaf306' },
    include: { fileRecord: true },
  });
  console.log('VoiceNote 3c130343:', {
    id: vn?.id,
    consultationId: vn?.consultationId,
    fileRecord: vn?.fileRecord,
  });

  if (vn) {
    await prisma.voiceNote.update({
      where: { id: vn.id },
      data: {
        consultationId: 'case_0418',
        recordedAt: new Date(),
      },
    });
    console.log('Successfully linked VoiceNote 3c130343 to case_0418!');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
