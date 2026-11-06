"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prescription_controller_js_1 = require("../controllers/prescription.controller.js");
const router = (0, express_1.Router)();
// Draft & Issue endpoints
router.post('/draft', prescription_controller_js_1.PrescriptionController.saveDraft);
router.post('/:id/issue', prescription_controller_js_1.PrescriptionController.issue);
router.post('/:id/amend', prescription_controller_js_1.PrescriptionController.amend);
// Retrieval endpoints
router.get('/:id/pdf', prescription_controller_js_1.PrescriptionController.getPdf);
router.get('/:id', prescription_controller_js_1.PrescriptionController.getById);
exports.default = router;
