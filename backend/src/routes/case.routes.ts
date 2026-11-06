import { Router } from 'express';
import multer from 'multer';
import { CaseController } from '../controllers/case.controller.js';
import { MediaController } from '../controllers/media.controller.js';
import { PrescriptionController } from '../controllers/prescription.controller.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Case Management
router.post('/', CaseController.createCase);
router.get('/', CaseController.getAllCases);
router.get('/:caseId', CaseController.getCaseById);

// Clinical Media linked to Case
router.post('/:caseId/images', upload.single('image'), MediaController.uploadCaseImage);
router.get('/:caseId/images', MediaController.getCaseImages);
router.post(
  '/:caseId/audio',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
  ]),
  MediaController.uploadCaseAudio
);
router.get('/:caseId/audio', MediaController.getCaseAudio);

// Single Consolidated Prescription linked to Case
router.post('/:caseId/prescriptions', PrescriptionController.createCasePrescription);
router.get('/:caseId/prescriptions', PrescriptionController.getByCase);

export default router;
