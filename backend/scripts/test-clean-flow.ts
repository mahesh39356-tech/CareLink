import { MediaController } from '../src/controllers/media.controller.js';
import { AuthController } from '../src/controllers/auth.controller.js';

async function testCleanFlow() {
  console.log('--- VERIFYING CLEAN DATABASE API RESPONSES ---');

  // 1. Patient Login check
  let patientAuthData: any = null;
  const mockResLogin: any = {
    status: (code: number) => ({
      json: (data: any) => {
        patientAuthData = data;
        return data;
      },
    }),
  };
  await AuthController.patientLogin(
    { body: { identifier: '0418', password: 'RuralCare2026!' } } as any,
    mockResLogin,
    () => {}
  );

  console.log('  ✓ Patient 0418 login response:', patientAuthData?.success ? 'SUCCESS (Authenticated)' : 'FAILED');

  // 2. Patient Images check
  let imagesResult: any = null;
  const mockResImages: any = {
    status: (code: number) => ({
      json: (data: any) => {
        imagesResult = data;
        return data;
      },
    }),
  };
  await MediaController.getCaseImages({ params: { caseId: '0418' } } as any, mockResImages, () => {});

  console.log(`  ✓ Patient 0418 saved images count: ${imagesResult?.count} (Clean 0)`);
  if (imagesResult?.count !== 0) {
    throw new Error(`Expected 0 images, got ${imagesResult?.count}`);
  }

  // 3. Doctor Login check
  let doctorAuthData: any = null;
  const mockResDoc: any = {
    status: (code: number) => ({
      json: (data: any) => {
        doctorAuthData = data;
        return data;
      },
    }),
  };
  await AuthController.doctorLogin(
    { body: { identifier: 'doctor@carelink.org', password: 'RuralCare2026!' } } as any,
    mockResDoc,
    () => {}
  );
  console.log('  ✓ Doctor login response:', doctorAuthData?.success ? 'SUCCESS (Authenticated)' : 'FAILED');

  // 4. Voice notes check
  let audioResult: any = null;
  const mockResAudio: any = {
    status: (code: number) => ({
      json: (data: any) => {
        audioResult = data;
        return data;
      },
    }),
  };
  await MediaController.getCaseAudio({ params: { caseId: '0418' } } as any, mockResAudio, () => {});
  console.log(`  ✓ Patient 0418 voice notes count: ${audioResult?.count} (Clean 0)`);
  if (audioResult?.count !== 0) {
    throw new Error(`Expected 0 voice notes, got ${audioResult?.count}`);
  }

  console.log('\n✅ VERIFICATION COMPLETE: Database is clean, responsive, and ready for fresh uploads!');
}

testCleanFlow().catch(console.error);
