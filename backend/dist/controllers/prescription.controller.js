"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrescriptionController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_js_1 = require("../config/database.js");
const prescription_service_js_1 = require("../services/prescription.service.js");
const media_controller_js_1 = require("./media.controller.js");
class PrescriptionController {
    /**
     * POST /api/cases/:caseId/prescriptions
     * Creates or directly issues a consolidated prescription for a case.
     * Strictly enforces: Only ONE active prescription per case.
     * Prevents duplicate clicks and simultaneous duplicate requests.
     */
    static async createCasePrescription(req, res, next) {
        try {
            const caseId = req.params.caseId;
            const { diagnosis, medicines, clinicalRemarks, followUpDate, doctorName, doctorRegNumber, digitalSignature, isAmendment, amendmentReason, issueImmediately = true, } = req.body;
            const consultation = await (0, media_controller_js_1.resolveCaseAndPatient)(caseId);
            // Check if an issued prescription already exists for this case
            const existingIssued = await database_js_1.prisma.prescription.findFirst({
                where: {
                    consultationId: consultation.id,
                    status: 'ISSUED',
                },
            });
            // If already issued and not an explicit amendment, block creation to ensure immutability
            if (existingIssued && !isAmendment) {
                return res.status(409).json({
                    success: false,
                    error: 'Prescription already issued for this case. Direct overwrite blocked. Use controlled amendment to revise.',
                    data: {
                        ...existingIssued,
                        pdfDownloadUrl: existingIssued.pdfPath ? `/api/prescriptions/${existingIssued.id}/pdf` : null,
                    },
                });
            }
            // If this is a controlled amendment:
            if (existingIssued && isAmendment) {
                const amended = await prescription_service_js_1.PrescriptionService.amendPrescription(existingIssued.id, {
                    caseId,
                    diagnosis: diagnosis || existingIssued.diagnosis || 'Clinical evaluation - intake',
                    medicines: medicines || [],
                    clinicalRemarks: clinicalRemarks || `Amended: ${amendmentReason || 'Adjusted regimen'}`,
                    followUpDate,
                    doctorName: doctorName || existingIssued.doctorName,
                    doctorRegNumber: doctorRegNumber || existingIssued.doctorRegNumber,
                });
                // Issue the amended version immediately
                const issuedAmended = await prescription_service_js_1.PrescriptionService.issuePrescription(amended.id, {
                    doctorName: doctorName || existingIssued.doctorName || 'Dr. Sarah Kimani, MD',
                    doctorRegNumber: doctorRegNumber || existingIssued.doctorRegNumber || 'KMPDC-REG-48819',
                    clinicalRemarks,
                    followUpDate,
                });
                return res.status(201).json({
                    success: true,
                    message: 'Prescription amended successfully and new revision issued',
                    data: {
                        ...issuedAmended,
                        pdfDownloadUrl: `/api/prescriptions/${issuedAmended.id}/pdf`,
                    },
                });
            }
            // First-time issuance for this case:
            // Use transaction check for duplicate prevention if clicked rapidly
            const draft = await prescription_service_js_1.PrescriptionService.saveDraft({
                caseId,
                diagnosis: diagnosis || 'Clinical evaluation - intake',
                medicines: medicines || [],
                clinicalRemarks,
                followUpDate,
                doctorName: doctorName || 'Dr. Sarah Kimani, MD',
                doctorRegNumber: doctorRegNumber || 'KMPDC-REG-48819',
                digitalSignature,
            });
            if (issueImmediately) {
                const issued = await prescription_service_js_1.PrescriptionService.issuePrescription(draft.id, {
                    doctorName: doctorName || 'Dr. Sarah Kimani, MD',
                    doctorRegNumber: doctorRegNumber || 'KMPDC-REG-48819',
                    clinicalRemarks,
                    followUpDate,
                });
                // Mark consultation as REVIEWED
                await database_js_1.prisma.consultation.update({
                    where: { id: consultation.id },
                    data: { status: 'REVIEWED' },
                });
                return res.status(201).json({
                    success: true,
                    message: 'Prescription officially issued and signed successfully',
                    data: {
                        ...issued,
                        pdfDownloadUrl: `/api/prescriptions/${issued.id}/pdf`,
                    },
                });
            }
            res.status(200).json({
                success: true,
                message: 'Draft prescription saved successfully',
                data: draft,
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/prescriptions/draft
     * Create or update draft prescription
     */
    static async saveDraft(req, res, next) {
        try {
            const { caseId, diagnosis, medicines, clinicalRemarks, followUpDate, doctorName, doctorRegNumber, digitalSignature, } = req.body;
            if (!caseId) {
                return res.status(400).json({ success: false, error: 'Case ID is required' });
            }
            const draft = await prescription_service_js_1.PrescriptionService.saveDraft({
                caseId,
                diagnosis: diagnosis || 'Clinical evaluation - intake',
                medicines: medicines || [],
                clinicalRemarks,
                followUpDate,
                doctorName,
                doctorRegNumber,
                digitalSignature,
            });
            res.status(200).json({
                success: true,
                message: 'Draft prescription saved successfully',
                data: draft,
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/prescriptions/:id/issue
     * Officially signs and issues the prescription, generating downloadable PDF
     */
    static async issue(req, res, next) {
        try {
            const prescriptionId = req.params.id;
            const { doctorName, doctorRegNumber, digitalSignature, clinicalRemarks, followUpDate } = req.body;
            if (!doctorName || !doctorRegNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Doctor name and verified registration number are required to issue prescription',
                });
            }
            // Check if prescription already issued (idempotency check)
            const existing = await database_js_1.prisma.prescription.findUnique({
                where: { id: prescriptionId },
            });
            if (existing && existing.status === 'ISSUED') {
                return res.status(200).json({
                    success: true,
                    message: 'Prescription was already issued',
                    data: {
                        ...existing,
                        pdfDownloadUrl: existing.pdfPath ? `/api/prescriptions/${existing.id}/pdf` : null,
                    },
                });
            }
            const issued = await prescription_service_js_1.PrescriptionService.issuePrescription(prescriptionId, {
                doctorName,
                doctorRegNumber,
                digitalSignature,
                clinicalRemarks,
                followUpDate,
            });
            res.status(200).json({
                success: true,
                message: 'Prescription officially issued and signed successfully',
                data: {
                    ...issued,
                    pdfDownloadUrl: `/api/prescriptions/${issued.id}/pdf`,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/prescriptions/:id/amend
     * Creates an amended version of an issued prescription
     */
    static async amend(req, res, next) {
        try {
            const prescriptionId = req.params.id;
            const { diagnosis, medicines, clinicalRemarks, followUpDate, doctorName, doctorRegNumber } = req.body;
            const amended = await prescription_service_js_1.PrescriptionService.amendPrescription(prescriptionId, {
                caseId: '',
                diagnosis,
                medicines,
                clinicalRemarks,
                followUpDate,
                doctorName,
                doctorRegNumber,
            });
            res.status(201).json({
                success: true,
                message: 'Amended prescription draft created successfully',
                data: amended,
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/prescriptions/:id
     */
    static async getById(req, res, next) {
        try {
            const prescriptionId = req.params.id;
            const prescription = await prescription_service_js_1.PrescriptionService.getById(prescriptionId);
            if (!prescription) {
                return res.status(404).json({ success: false, error: 'Prescription not found' });
            }
            res.status(200).json({
                success: true,
                data: {
                    ...prescription,
                    pdfDownloadUrl: prescription.pdfPath ? `/api/prescriptions/${prescription.id}/pdf` : null,
                },
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/prescriptions/:id/pdf
     * Serves or downloads the generated PDF
     */
    static async getPdf(req, res, next) {
        try {
            const prescriptionId = req.params.id;
            const prescription = await prescription_service_js_1.PrescriptionService.getById(prescriptionId);
            if (!prescription || !prescription.pdfPath) {
                return res.status(404).json({ success: false, error: 'Prescription PDF not found' });
            }
            if (!fs_1.default.existsSync(prescription.pdfPath)) {
                return res.status(404).json({ success: false, error: 'PDF file does not exist on disk' });
            }
            const filename = path_1.default.basename(prescription.pdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            fs_1.default.createReadStream(prescription.pdfPath).pipe(res);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/cases/:caseId/prescriptions
     * Returns ONE consolidated active prescription for the case, plus history if amended.
     */
    static async getByCase(req, res, next) {
        try {
            const caseId = req.params.caseId;
            const allPrescriptions = await prescription_service_js_1.PrescriptionService.getByCaseId(caseId);
            // Identify single active prescription: the latest ISSUED, or latest DRAFT
            const activePrescription = allPrescriptions.find((p) => p.status === 'ISSUED') ||
                allPrescriptions.find((p) => p.status === 'DRAFT') ||
                allPrescriptions[0] ||
                null;
            const history = allPrescriptions.filter((p) => activePrescription && p.id !== activePrescription.id);
            res.status(200).json({
                success: true,
                count: activePrescription ? 1 : 0,
                data: activePrescription
                    ? [
                        {
                            ...activePrescription,
                            pdfDownloadUrl: activePrescription.pdfPath
                                ? `/api/prescriptions/${activePrescription.id}/pdf`
                                : null,
                        },
                    ]
                    : [],
                activePrescription: activePrescription
                    ? {
                        ...activePrescription,
                        pdfDownloadUrl: activePrescription.pdfPath
                            ? `/api/prescriptions/${activePrescription.id}/pdf`
                            : null,
                    }
                    : null,
                history: history.map((p) => ({
                    ...p,
                    pdfDownloadUrl: p.pdfPath ? `/api/prescriptions/${p.id}/pdf` : null,
                })),
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/patients/:patientId/prescriptions
     * Returns ONE consolidated prescription card per patient case.
     */
    static async getByPatient(req, res, next) {
        try {
            const patientId = req.params.patientId;
            const allPrescriptions = await prescription_service_js_1.PrescriptionService.getByPatientId(patientId);
            // Deduplicate by consultationId: strictly ONE prescription per case
            const caseMap = new Map();
            for (const rx of allPrescriptions) {
                if (!caseMap.has(rx.consultationId)) {
                    caseMap.set(rx.consultationId, {
                        ...rx,
                        pdfDownloadUrl: rx.pdfPath ? `/api/prescriptions/${rx.id}/pdf` : null,
                    });
                }
            }
            const consolidatedList = Array.from(caseMap.values());
            res.status(200).json({
                success: true,
                count: consolidatedList.length,
                data: consolidatedList,
            });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/consultations/:id/prescription (Module 11)
     */
    static async createConsultationPrescription(req, res, next) {
        req.params.caseId = req.params.id;
        return PrescriptionController.createCasePrescription(req, res, next);
    }
    /**
     * GET /api/patient/prescriptions (Module 11)
     */
    static async getPatientPrescriptions(req, res, next) {
        const patientId = req.user?.patientProfileId || req.user?.userId || req.query.patientId || '0418';
        req.params.patientId = String(patientId);
        return PrescriptionController.getByPatient(req, res, next);
    }
    /**
     * GET /api/doctor/consultations (Module 11)
     */
    static async getDoctorConsultations(req, res, next) {
        try {
            const consultations = await database_js_1.prisma.consultation.findMany({
                orderBy: { requestedAt: 'desc' },
                include: {
                    patient: true,
                    doctor: true,
                    vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
                    clinicalImages: { include: { fileRecord: true } },
                    voiceNotes: { include: { fileRecord: true } },
                    prescriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
            });
            const formatted = consultations.map((c) => ({
                id: c.id,
                caseNumber: c.caseNumber || `CL-2024-${c.id.slice(0, 4)}`,
                patientId: c.patientId,
                patientName: c.patient?.fullName || 'Patient',
                patientAge: c.patient?.age || 30,
                patientGender: c.patient?.gender || 'Female',
                clinic: c.patient?.clinic || 'Kijani Rural Clinic',
                submissionDate: c.requestedAt,
                status: c.prescriptions[0]?.status === 'ISSUED' ? 'COMPLETED' : c.status || 'PENDING',
                priority: c.priority,
                imagesCount: c.clinicalImages.length,
                audioCount: c.voiceNotes.length,
                hasPrescription: !!c.prescriptions[0],
                prescription: c.prescriptions[0] ? {
                    ...c.prescriptions[0],
                    pdfDownloadUrl: c.prescriptions[0].pdfPath ? `/api/prescriptions/${c.prescriptions[0].id}/pdf` : null,
                } : null,
            }));
            res.status(200).json({
                success: true,
                count: formatted.length,
                data: formatted,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PrescriptionController = PrescriptionController;
