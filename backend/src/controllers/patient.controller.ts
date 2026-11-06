import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patient.service.js';

export class PatientController {
  static async searchPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PatientService.searchPatients(req.query as any);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatientById(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.getPatientById(req.params.id);
      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.createPatient(req.body);
      res.status(201).json({
        success: true,
        message: 'Patient record created successfully',
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }
}
