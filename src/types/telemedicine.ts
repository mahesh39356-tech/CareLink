export type ScreenId =
  | 'portal-select'
  | 'patient-login'
  | 'doctor-login'
  | 'register'
  | 'vitals'
  | 'media'
  | 'outbox'
  | 'success'
  | 'doctor'
  | 'prescriptions';

export type UserRole = 'PATIENT' | 'DOCTOR' | null;

export interface MedicineItem {
  id?: string;
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionRecord {
  id: string;
  rxNumber?: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  status: 'DRAFT' | 'ISSUED' | 'AMENDED';
  diagnosis?: string;
  medicationsJson: string;
  clinicalRemarks?: string;
  followUpDate?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  digitalSignature?: string;
  signedAt?: string;
  issuedAt?: string;
  pdfPath?: string;
  pdfDownloadUrl?: string;
  pdfSizeBytes?: number;
  version?: number;
  amendedFromId?: string;
  createdAt: string;
  doctor?: {
    fullName: string;
    licenseNumber: string;
    specialty: string;
    hospital?: string;
  };
  patient?: {
    fullName: string;
    age: number;
    gender: string;
    nationalId?: string;
  };
}

export interface PatientRecord {
  id: string;
  fullName: string;
  age: number | string;
  gender: 'Male' | 'Female' | 'Other' | '';
  syncHistoryOnConnect: boolean;
  timestamp: string;
  dateLabel: string;
  // Vitals
  systolic: number | string;
  diastolic: number | string;
  temperature: number | string;
  heartRate: number | string;
  // Media
  photoUrl?: string;
  photoOriginalSizeKb?: number;
  photoCompressedSizeKb?: number;
  photoCompressionRatio?: number;
  uploadedImages?: Array<{
    id: string;
    url: string;
    label: string;
    originalSizeBytes: number;
    compressedSizeBytes: number;
    compressionRatio: number;
    originalFilename?: string;
    capturedAt?: string;
    downloadUrl?: string;
    bodySite?: string;
  }>;
  // Voice note
  audioBlob?: Blob;
  audioUrl?: string;
  audioDurationSeconds?: number;
  audioSizeKb?: number;
  voiceLanguage?: string;
  // Payload & Sync Status
  totalPayloadKb: number;
  status: 'PENDING NETWORK' | 'SYNCING' | 'DELIVERED';
  initials: string;
  badgeIndex?: number;
  clinic?: string;
  timeAgo?: string;
}

export interface CompressionResult {
  compressedDataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
  quality: number;
}
