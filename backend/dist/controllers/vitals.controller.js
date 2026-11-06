"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VitalsController = void 0;
const vitals_service_js_1 = require("../services/vitals.service.js");
class VitalsController {
    static async recordVitals(req, res, next) {
        try {
            const vital = await vitals_service_js_1.VitalsService.recordVitals(req.body);
            res.status(201).json({
                success: true,
                message: 'Vitals recorded successfully',
                data: vital,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async recordSymptom(req, res, next) {
        try {
            const symptom = await vitals_service_js_1.VitalsService.recordSymptom(req.body);
            res.status(201).json({
                success: true,
                message: 'Symptom recorded successfully',
                data: symptom,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getVitalsByPatient(req, res, next) {
        try {
            const vitals = await vitals_service_js_1.VitalsService.getVitalsByPatient(req.params.patientId);
            res.status(200).json({
                success: true,
                data: vitals,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VitalsController = VitalsController;
