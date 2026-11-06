import { Router } from 'express';
import multer from 'multer';
import { MediaController } from '../controllers/media.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

const router = Router();

// Case-scoped media endpoints
router.post('/cases/:caseId/images', upload.single('image'), MediaController.uploadCaseImage);
router.get('/cases/:caseId/images', MediaController.getCaseImages);

router.post(
  '/cases/:caseId/audio',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
  ]),
  MediaController.uploadCaseAudio
);
router.get('/cases/:caseId/audio', MediaController.getCaseAudio);

// Direct media streaming and download endpoints
router.get('/images/:imageId', MediaController.getImageFile);
router.get('/audio/:audioId', MediaController.getAudioFile);

export default router;
