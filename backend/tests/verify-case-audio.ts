import { MediaController } from '../src/controllers/media.controller.js';

async function verify() {
  const req: any = {
    params: { caseId: '0418' },
  };

  let jsonResult: any = null;
  let statusCode = 200;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonResult = data;
      return res;
    },
  };

  const next = (err: any) => {
    if (err) console.error('Next called with error:', err);
  };

  await MediaController.getCaseAudio(req, res, next);

  console.log(`HTTP ${statusCode} Response:`, {
    success: jsonResult?.success,
    caseId: jsonResult?.caseId,
    count: jsonResult?.count,
    firstRecording: jsonResult?.data?.[0],
  });
}

verify().catch(console.error);
