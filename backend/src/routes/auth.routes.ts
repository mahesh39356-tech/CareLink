import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerPatientSchema,
  registerDoctorSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Role-Specific Authentication
router.post('/patient/login', AuthController.patientLogin);
router.post('/doctor/login', AuthController.doctorLogin);
router.post('/patient/register', validate(registerPatientSchema), AuthController.registerPatient);
router.post('/doctor/register', validate(registerDoctorSchema), AuthController.registerDoctor);

// General Authentication
router.post('/register-patient', validate(registerPatientSchema), AuthController.registerPatient);
router.post('/register-doctor', validate(registerDoctorSchema), AuthController.registerDoctor);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
