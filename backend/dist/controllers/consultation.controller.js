"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationController = void 0;
const consultation_service_js_1 = require("../services/consultation.service.js");
class ConsultationController {
    static async requestConsultation(req, res, next) {
        try {
            const consultation = await consultation_service_js_1.ConsultationService.requestConsultation(req.body);
            res.status(201).json({
                success: true,
                message: 'Consultation requested successfully',
                data: consultation,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDoctorCases(req, res, next) {
        try {
            const cases = await consultation_service_js_1.ConsultationService.getDoctorCases();
            res.status(200).json({
                success: true,
                data: cases,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getConsultationDetail(req, res, next) {
        try {
            const detail = await consultation_service_js_1.ConsultationService.getConsultationDetail(req.params.id);
            res.status(200).json({
                success: true,
                data: detail,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async prescribe(req, res, next) {
        try {
            const doctorId = req.user?.doctorProfileId || 'dr_tele_specialist_01';
            const prescription = await consultation_service_js_1.ConsultationService.issuePrescription({
                consultationId: req.body.consultationId,
                doctorId,
                clinicalRemarks: req.body.clinicalRemarks,
                medications: req.body.medications,
                digitalSignature: req.body.digitalSignature,
            });
            res.status(201).json({
                success: true,
                message: 'Prescription & advice issued and queued for field worker',
                data: prescription,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ConsultationController = ConsultationController;
