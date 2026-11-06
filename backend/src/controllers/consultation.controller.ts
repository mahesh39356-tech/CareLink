import { Request, Response, NextFunction } from 'express';
import { ConsultationService } from '../services/consultation.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ConsultationController {
  static async requestConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const consultation = await ConsultationService.requestConsultation(req.body);
      res.status(201).json({
        success: true,
        message: 'Consultation requested successfully',
        data: consultation,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDoctorCases(req: Request, res: Response, next: NextFunction) {
    try {
      const cases = await ConsultationService.getDoctorCases();
      res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getConsultationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await ConsultationService.getConsultationDetail(req.params.id);
      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (err) {
      next(err);
    }
  }

  static async prescribe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorProfileId || 'dr_tele_specialist_01';
      const prescription = await ConsultationService.issuePrescription({
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
    } catch (err) {
      next(err);
    }
  }
}
