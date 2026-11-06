"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientController = void 0;
const patient_service_js_1 = require("../services/patient.service.js");
class PatientController {
    static async searchPatients(req, res, next) {
        try {
            const result = await patient_service_js_1.PatientService.searchPatients(req.query);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPatientById(req, res, next) {
        try {
            const patient = await patient_service_js_1.PatientService.getPatientById(req.params.id);
            res.status(200).json({
                success: true,
                data: patient,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async createPatient(req, res, next) {
        try {
            const patient = await patient_service_js_1.PatientService.createPatient(req.body);
            res.status(201).json({
                success: true,
                message: 'Patient record created successfully',
                data: patient,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PatientController = PatientController;
