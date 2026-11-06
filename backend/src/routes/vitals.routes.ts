import { Router } from 'express';
import { VitalsController } from '../controllers/vitals.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createVitalSchema, createSymptomSchema } from '../validators/vitals.validator.js';

const router = Router();

router.post('/', validate(createVitalSchema), VitalsController.recordVitals);
router.post('/symptoms', validate(createSymptomSchema), VitalsController.recordSymptom);
router.get('/patient/:patientId', VitalsController.getVitalsByPatient);

export default router;
