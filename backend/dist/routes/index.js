"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const patient_routes_js_1 = __importDefault(require("./patient.routes.js"));
const vitals_routes_js_1 = __importDefault(require("./vitals.routes.js"));
const file_routes_js_1 = __importDefault(require("./file.routes.js"));
const consultation_routes_js_1 = __importDefault(require("./consultation.routes.js"));
const sync_routes_js_1 = __importDefault(require("./sync.routes.js"));
const media_routes_js_1 = __importDefault(require("./media.routes.js"));
const prescription_routes_js_1 = __importDefault(require("./prescription.routes.js"));
const case_routes_js_1 = __importDefault(require("./case.routes.js"));
const prescription_controller_js_1 = require("../controllers/prescription.controller.js");
const media_controller_js_1 = require("../controllers/media.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'CareLink Rural Telemedicine Backend',
        database: 'connected',
    });
});
router.use('/auth', auth_routes_js_1.default);
router.use('/patients', patient_routes_js_1.default);
router.use('/vitals', vitals_routes_js_1.default);
router.use('/files', file_routes_js_1.default);
router.use('/cases', case_routes_js_1.default);
router.use('/consultations', consultation_routes_js_1.default);
router.use('/sync', sync_routes_js_1.default);
router.use('/prescriptions', prescription_routes_js_1.default);
// Case and Patient specific prescription queries
router.get('/cases/:caseId/prescriptions', prescription_controller_js_1.PrescriptionController.getByCase);
router.get('/patients/:patientId/prescriptions', auth_middleware_js_1.optionalAuthenticate, auth_middleware_js_1.enforcePatientAccess, prescription_controller_js_1.PrescriptionController.getByPatient);
// MODULE 11: SPECIFIED REST API ENDPOINTS
// 1. Uploads
router.post('/uploads/image', upload.single('image'), media_controller_js_1.MediaController.uploadGenericImage);
router.post('/uploads/audio', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
]), media_controller_js_1.MediaController.uploadGenericAudio);
// 2. Consultation files
router.get('/consultations/:id/files', media_controller_js_1.MediaController.getConsultationFiles);
// 3. File retrieval
router.get('/files/:id/original', media_controller_js_1.MediaController.getOriginalFile);
router.get('/files/:id/processed', media_controller_js_1.MediaController.getProcessedFile);
router.get('/files/:id/audio', media_controller_js_1.MediaController.getAudioFile);
// 4. Consultation prescription & doctor consultation list
router.post('/consultations/:id/prescription', prescription_controller_js_1.PrescriptionController.createConsultationPrescription);
router.get('/patient/prescriptions', auth_middleware_js_1.optionalAuthenticate, prescription_controller_js_1.PrescriptionController.getPatientPrescriptions);
router.get('/doctor/consultations', prescription_controller_js_1.PrescriptionController.getDoctorConsultations);
// Media routes (images & audio direct streams)
router.use('/', media_routes_js_1.default);
// Doctor specific aliases
router.use('/doctors/cases', (req, res, next) => {
    req.url = '/cases';
    (0, consultation_routes_js_1.default)(req, res, next);
});
exports.default = router;
