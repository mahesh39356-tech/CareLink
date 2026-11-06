"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const case_controller_js_1 = require("../controllers/case.controller.js");
const media_controller_js_1 = require("../controllers/media.controller.js");
const prescription_controller_js_1 = require("../controllers/prescription.controller.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});
// Case Management
router.post('/', case_controller_js_1.CaseController.createCase);
router.get('/', case_controller_js_1.CaseController.getAllCases);
router.get('/:caseId', case_controller_js_1.CaseController.getCaseById);
// Clinical Media linked to Case
router.post('/:caseId/images', upload.single('image'), media_controller_js_1.MediaController.uploadCaseImage);
router.get('/:caseId/images', media_controller_js_1.MediaController.getCaseImages);
router.post('/:caseId/audio', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
]), media_controller_js_1.MediaController.uploadCaseAudio);
router.get('/:caseId/audio', media_controller_js_1.MediaController.getCaseAudio);
// Single Consolidated Prescription linked to Case
router.post('/:caseId/prescriptions', prescription_controller_js_1.PrescriptionController.createCasePrescription);
router.get('/:caseId/prescriptions', prescription_controller_js_1.PrescriptionController.getByCase);
exports.default = router;
