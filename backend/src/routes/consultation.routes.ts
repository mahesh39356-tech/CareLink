import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller.js';
import { PrescriptionController } from '../controllers/prescription.controller.js';
import { MediaController } from '../controllers/media.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requestConsultationSchema, prescribeSchema } from '../validators/consultation.validator.js';

const router = Router();

router.post('/', validate(requestConsultationSchema), ConsultationController.requestConsultation);
router.get('/cases', ConsultationController.getDoctorCases);
router.get('/:id', ConsultationController.getConsultationDetail);
router.get('/:id/files', MediaController.getConsultationFiles);
router.post('/prescribe', validate(prescribeSchema), ConsultationController.prescribe);
router.post('/:id/prescription', PrescriptionController.createConsultationPrescription);

export default router;
