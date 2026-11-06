import { Request } from 'express';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'HEALTH_WORKER' | 'ADMIN';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email?: string;
  phone?: string;
  patientProfileId?: string;
  doctorProfileId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export interface FileCompressionReport {
  id: string;
  originalFilename: string;
  category: 'json' | 'images' | 'audio';
  originalSize: number; // bytes
  compressedSize: number; // bytes
  spaceSaved: number; // bytes
  compressionPercentage: number; // %
  compressionAlgorithm: string;
  decompressionStatus: 'NOT_DECOMPRESSED' | 'VERIFIED' | 'FAILED';
  originalSha256: string;
  decompressedSha256?: string;
  sha256Verification: 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE_LOSSY';
  createdAt: string;
}
