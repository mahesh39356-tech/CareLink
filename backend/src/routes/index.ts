import { Router } from 'express';
import multer from 'multer';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import vitalsRoutes from './vitals.routes.js';
import fileRoutes from './file.routes.js';
import consultationRoutes from './consultation.routes.js';
import syncRoutes from './sync.routes.js';
import mediaRoutes from './media.routes.js';
import prescriptionRoutes from './prescription.routes.js';
import caseRoutes from './case.routes.js';
import { PrescriptionController } from '../controllers/prescription.controller.js';
import { MediaController } from '../controllers/media.controller.js';
import { authenticate, optionalAuthenticate, requireDoctor, requirePatient, enforcePatientAccess } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'CareLink Rural Telemedicine Backend',
    database: 'connected',
  });
});

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/vitals', vitalsRoutes);
router.use('/files', fileRoutes);
router.use('/cases', caseRoutes);
router.use('/consultations', consultationRoutes);
router.use('/sync', syncRoutes);
router.use('/prescriptions', prescriptionRoutes);

// Case and Patient specific prescription queries
router.get('/cases/:caseId/prescriptions', PrescriptionController.getByCase);
router.get('/patients/:patientId/prescriptions', optionalAuthenticate, enforcePatientAccess, PrescriptionController.getByPatient);

// MODULE 11: SPECIFIED REST API ENDPOINTS
// 1. Uploads
router.post('/uploads/image', upload.single('image'), MediaController.uploadGenericImage);
router.post(
  '/uploads/audio',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
  ]),
  MediaController.uploadGenericAudio
);

// 2. Consultation files
router.get('/consultations/:id/files', MediaController.getConsultationFiles);

// 3. File retrieval
router.get('/files/:id/original', MediaController.getOriginalFile);
router.get('/files/:id/processed', MediaController.getProcessedFile);
router.get('/files/:id/audio', MediaController.getAudioFile);

// 4. Consultation prescription & doctor consultation list
router.post('/consultations/:id/prescription', PrescriptionController.createConsultationPrescription);
router.get('/patient/prescriptions', optionalAuthenticate, PrescriptionController.getPatientPrescriptions);
router.get('/doctor/consultations', PrescriptionController.getDoctorConsultations);

// Media routes (images & audio direct streams)
router.use('/', mediaRoutes);

// Doctor specific aliases
router.use('/doctors/cases', (req, res, next) => {
  req.url = '/cases';
  consultationRoutes(req, res, next);
});

export default router;
