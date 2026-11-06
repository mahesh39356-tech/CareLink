import { Request, Response, NextFunction } from 'express';
import { VitalsService } from '../services/vitals.service.js';

export class VitalsController {
  static async recordVitals(req: Request, res: Response, next: NextFunction) {
    try {
      const vital = await VitalsService.recordVitals(req.body);
      res.status(201).json({
        success: true,
        message: 'Vitals recorded successfully',
        data: vital,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordSymptom(req: Request, res: Response, next: NextFunction) {
    try {
      const symptom = await VitalsService.recordSymptom(req.body as any);
      res.status(201).json({
        success: true,
        message: 'Symptom recorded successfully',
        data: symptom,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getVitalsByPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const vitals = await VitalsService.getVitalsByPatient(req.params.patientId);
      res.status(200).json({
        success: true,
        data: vitals,
      });
    } catch (err) {
      next(err);
    }
  }
}
