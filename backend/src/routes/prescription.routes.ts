import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller.js';

const router = Router();

// Draft & Issue endpoints
router.post('/draft', PrescriptionController.saveDraft);
router.post('/:id/issue', PrescriptionController.issue);
router.post('/:id/amend', PrescriptionController.amend);

// Retrieval endpoints
router.get('/:id/pdf', PrescriptionController.getPdf);
router.get('/:id', PrescriptionController.getById);

export default router;
