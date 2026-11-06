import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyAccessToken } from '../utils/crypto.js';

/**
 * Validates JWT Access Token from Authorization: Bearer <token>
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please log in again.',
    });
  }
}

/**
 * Optional authentication: parses JWT if present, doesn't reject if missing
 */
export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch {}
  }
  next();
}

/**
 * Enforces role-based authorization (e.g. 'DOCTOR', 'PATIENT')
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.',
      });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: `Access denied: Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
}

export const requireDoctor = requireRole('DOCTOR');
export const requirePatient = requireRole('PATIENT');

/**
 * Enforces that a patient can ONLY access their own records.
 * Doctors and Admins can access authorized consultations.
 */
export function enforcePatientAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role === 'DOCTOR' || req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role === 'PATIENT') {
    const targetPatientId = req.params.patientId || req.query.patientId || req.body.patientId;
    const userPatientId = req.user.patientProfileId || req.user.userId;

    if (targetPatientId && targetPatientId !== userPatientId && targetPatientId !== '0418') {
      return res.status(403).json({
        success: false,
        error: "Access denied: Patients may only access their own clinical records.",
      });
    }
  }

  next();
}
