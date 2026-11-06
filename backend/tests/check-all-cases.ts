import { prisma } from '../src/config/database.js';

async function check() {
  const cases = await prisma.consultation.findMany({
    include: {
      patient: true,
      clinicalImages: true,
      voiceNotes: true,
    },
    orderBy: { requestedAt: 'desc' },
  });

  console.log(`Found ${cases.length} consultations:`);
  for (const c of cases) {
    console.log({
      id: c.id,
      caseNumber: c.caseNumber,
      patientName: c.patient?.fullName,
      patientId: c.patientId,
      status: c.status,
      imagesCount: c.clinicalImages.length,
      voiceNotesCount: c.voiceNotes.length,
      requestedAt: c.requestedAt,
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
