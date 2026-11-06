import { prisma } from '../src/config/database.js';

async function check() {
  const c = await prisma.consultation.findUnique({
    where: { id: '1cb69aeb-0c00-4e52-8afa-d0923bc72198' },
    include: { patient: true },
  });
  console.log('Consultation 1cb69aeb:', c?.caseNumber, c?.patient?.fullName, c?.patient?.nationalId);
}

check().catch(console.error).finally(() => prisma.$disconnect());
