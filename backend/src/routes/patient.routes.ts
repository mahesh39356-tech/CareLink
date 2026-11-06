import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { createPatientSchema, searchPatientSchema } from '../validators/patient.validator.js';

const router = Router();

router.get('/', validate(searchPatientSchema), PatientController.searchPatients);
router.get('/:id', PatientController.getPatientById);
router.post('/', validate(createPatientSchema), PatientController.createPatient);

export default router;
