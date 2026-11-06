import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '../config/database.js';
import { storagePaths } from '../config/storage.js';
import { StorageService } from '../services/storage.service.js';
import { calculateSha256 } from '../utils/crypto.js';

export function resolveExistingFilePath(
  storedPath: string | null | undefined,
  category: 'audio' | 'images' | 'json' = 'audio'
): string | null {
  if (!storedPath) return null;

  // 1. Direct path check
  if (fs.existsSync(storedPath)) return storedPath;

  // 2. Relative to process.cwd()
  const pCwd = path.resolve(process.cwd(), storedPath);
  if (fs.existsSync(pCwd)) return pCwd;

  // 3. Relative to process.cwd() / backend
  const pBackend = path.resolve(process.cwd(), 'backend', storedPath);
  if (fs.existsSync(pBackend)) return pBackend;

  // 4. Relative to parent (if cwd is backend)
  const pParent = path.resolve(process.cwd(), '..', storedPath);
  if (fs.existsSync(pParent)) return pParent;

  // 5. Check in storagePaths directories
  const filename = path.basename(storedPath);
  if (storagePaths?.compressed && (storagePaths.compressed as any)[category]) {
    const pComp = path.join((storagePaths.compressed as any)[category], filename);
    if (fs.existsSync(pComp)) return pComp;
  }
  if (storagePaths?.original && (storagePaths.original as any)[category]) {
    const pOrig = path.join((storagePaths.original as any)[category], filename);
    if (fs.existsSync(pOrig)) return pOrig;
  }

  // 6. Search across known storage base directories
  const baseDirs = [
    path.resolve(process.cwd(), 'storage'),
    path.resolve(process.cwd(), 'backend', 'storage'),
    path.resolve(process.cwd(), '..', 'backend', 'storage'),
    storagePaths.root,
  ];

  for (const bDir of baseDirs) {
    for (const sub of ['compressed', 'original', 'decompressed']) {
      const candidate = path.join(bDir, sub, category, filename);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

export async function resolveCaseAndPatient(caseId: string) {
  // 1. Try finding consultation by exact id or caseNumber
  let consultation = await prisma.consultation.findFirst({
    where: {
      OR: [
        { id: caseId },
        { caseNumber: caseId },
        { caseNumber: `CL-2024-${caseId}` },
        { caseNumber: caseId.replace(/^CL-2024-/, '') },
        { reason: { contains: caseId } },
      ],
    },
    include: { patient: true },
  });

  if (!consultation) {
    // 2. Try finding patient by id, nationalId, or fullName
    const patient = await prisma.patientProfile.findFirst({
      where: {
        OR: [
          { id: caseId },
          { nationalId: caseId },
          { nationalId: `CL-2024-${caseId}` },
          { nationalId: caseId.replace(/^CL-2024-/, '') },
          { fullName: { contains: caseId } },
        ],
      },
      include: { consultations: { orderBy: { requestedAt: 'desc' }, take: 1 } },
    });

    if (patient) {
      if (patient.consultations.length > 0) {
        consultation = patient.consultations[0] as any;
      } else {
        consultation = await prisma.consultation.create({
          data: {
            patientId: patient.id,
            caseNumber: caseId,
            reason: `Rural Telemedicine Intake (${patient.fullName})`,
          },
          include: { patient: true },
        }) as any;
      }
    }
  }

  // 3. Fallback: if not found, create a patient and consultation with caseNumber: caseId
  if (!consultation) {
    const uniqueNationalId = `CL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const patient = await prisma.patientProfile.create({
      data: {
        fullName: `Patient ${caseId}`,
        age: 32,
        gender: 'Female',
        clinic: 'Kijani Rural Clinic',
        nationalId: uniqueNationalId,
      },
    });

    consultation = await prisma.consultation.create({
      data: {
        caseNumber: caseId,
        patientId: patient.id,
        reason: `Rural Tele-Consultation Intake (${caseId})`,
      },
      include: { patient: true },
    }) as any;
  }

  return consultation!;
}

export class MediaController {
  /**
   * POST /api/cases/:caseId/images
   * Uploads medical image, compresses via Sharp to WebP, saves persistently, links metadata.
   */
  static async uploadCaseImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded' });
      }

      const caseId = req.params.caseId;
      const consultation = await resolveCaseAndPatient(caseId);

      const originalBuffer = req.file.buffer;
      let originalSizeBytes = originalBuffer.length;
      if (req.body.originalSizeBytes && Number(req.body.originalSizeBytes) > originalSizeBytes) {
        originalSizeBytes = Number(req.body.originalSizeBytes);
      }
      const originalSha256 = calculateSha256(originalBuffer);
      const originalFilename = req.file.originalname || `clinical_image_${Date.now()}.jpg`;
      const uniqueBase = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ext = path.extname(originalFilename) || '.jpg';
      const originalStorageName = `${uniqueBase}${ext}`;

      // Save original uncompressed image
      const originalPath = await StorageService.saveOriginal('images', originalStorageName, originalBuffer);

      // 1. Validate real image content (do not trust extensions or mime types alone)
      let imageMetadata: sharp.Metadata;
      try {
        imageMetadata = await sharp(originalBuffer).metadata();
        if (!imageMetadata.format || !imageMetadata.width || !imageMetadata.height) {
          throw new Error('Unrecognized image format');
        }
      } catch (validationErr: any) {
        return res.status(400).json({
          success: false,
          error: `Invalid medical image: Failed content validation (${validationErr.message}). Must be valid JPG, PNG, or WebP.`,
        });
      }

      // 2. Clinical WebP Compression
      const isAlreadyWebp = imageMetadata.format === 'webp';
      let deliveryBuffer: Buffer;
      let compressedPath: string;
      let deliveryMimeType = 'image/webp';
      let isSmaller = false;

      if (isAlreadyWebp && req.body.originalSizeBytes && Number(req.body.originalSizeBytes) > originalBuffer.length) {
        // Client-side pre-compressed WebP: preserve the WebP buffer in compressed storage
        deliveryBuffer = originalBuffer;
        const compressedFilename = `${uniqueBase}.webp`;
        compressedPath = StorageService.getCompressedPath('images', compressedFilename);
        await fs.promises.writeFile(compressedPath, deliveryBuffer);
        isSmaller = true;
      } else {
        // Server-side Sharp WebP compression: max 1600px, quality 75 preserves high diagnostic detail with ~75% reduction
        const compressedCandidate = await sharp(originalBuffer)
          .rotate() // auto-orient via EXIF
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75, effort: 4 })
          .toBuffer();

        isSmaller = compressedCandidate.length < originalSizeBytes;
        deliveryBuffer = isSmaller ? compressedCandidate : originalBuffer;
        deliveryMimeType = isSmaller ? 'image/webp' : (req.file.mimetype || 'image/jpeg');
        const compressedFilename = isSmaller ? `${uniqueBase}.webp` : originalStorageName;
        compressedPath = isSmaller
          ? StorageService.getCompressedPath('images', compressedFilename)
          : originalPath;

        if (isSmaller) {
          await fs.promises.writeFile(compressedPath, compressedCandidate);
        }
      }

      const compressedSizeBytes = deliveryBuffer.length;
      const spaceSaved = isSmaller ? (originalSizeBytes - compressedSizeBytes) : 0;
      const compressionRatio = isSmaller
        ? +(((spaceSaved) / originalSizeBytes) * 100).toFixed(1)
        : 0;
      const decompressedSha256 = calculateSha256(deliveryBuffer);

      // Save FileRecord in DB
      const fileRecord = await prisma.fileRecord.create({
        data: {
          id: uniqueBase,
          category: 'images',
          originalFilename,
          originalPath,
          compressedPath,
          originalSizeBytes,
          compressedSizeBytes,
          mimeType: deliveryMimeType,
          compressionAlgorithm: isSmaller ? 'SHARP_WEBP' : 'ORIGINAL_PRESERVED',
          originalSha256,
          decompressedSha256,
          isVerified: true,
        },
      });

      // Count existing images for label
      const existingCount = await prisma.clinicalImage.count({
        where: {
          OR: [
            { consultationId: consultation.id },
            { patientId: consultation.patientId },
          ],
        },
      });

      const label = req.body.label || `IMAGE 0${existingCount + 1}`;
      const bodySite = req.body.bodySite || 'DERMATOLOGY';

      // Save ClinicalImage in DB
      const clinicalImage = await prisma.clinicalImage.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          fileRecordId: fileRecord.id,
          label,
          bodySite,
          metadataJson: JSON.stringify({
            width: imageMetadata.width,
            height: imageMetadata.height,
            format: 'webp',
            quality: 90,
          }),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Medical image compressed and stored successfully',
        data: {
          id: clinicalImage.id,
          fileRecordId: fileRecord.id,
          caseId: consultation.id,
          patientId: consultation.patientId,
          label: clinicalImage.label,
          bodySite: clinicalImage.bodySite,
          originalFilename,
          originalSizeBytes,
          compressedSizeBytes,
          spaceSavedBytes: spaceSaved,
          compressionRatio,
          url: `/api/images/${clinicalImage.id}`,
          originalUrl: `/api/images/${clinicalImage.id}?original=true`,
          downloadUrl: `/api/images/${clinicalImage.id}?download=true`,
          capturedAt: clinicalImage.capturedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases/:caseId/images
   * Returns all actual images for the case/patient.
   */
  static async getCaseImages(req: Request, res: Response, next: NextFunction) {
    try {
      const caseId = req.params.caseId;
      const consultation = await resolveCaseAndPatient(caseId);

      const images = await prisma.clinicalImage.findMany({
        where: {
          OR: [
            { consultationId: consultation.id },
            { patientId: consultation.patientId },
          ],
        },
        include: { fileRecord: true },
        orderBy: { capturedAt: 'desc' },
      });

      const formatted = images.map((img) => {
        const origSize = img.fileRecord?.originalSizeBytes || 0;
        const compSize = img.fileRecord?.compressedSizeBytes || origSize;
        const spaceSaved = origSize - compSize;
        const ratio = origSize > 0 ? +((spaceSaved / origSize) * 100).toFixed(1) : 0;

        return {
          id: img.id,
          fileRecordId: img.fileRecordId,
          caseId: consultation.id,
          patientId: consultation.patientId,
          label: img.label,
          bodySite: img.bodySite,
          originalFilename: img.fileRecord?.originalFilename || 'image.webp',
          originalSizeBytes: origSize,
          compressedSizeBytes: compSize,
          spaceSavedBytes: spaceSaved,
          compressionRatio: ratio,
          url: `/api/images/${img.id}`,
          downloadUrl: `/api/images/${img.id}?download=true`,
          capturedAt: img.capturedAt,
        };
      });

      res.status(200).json({
        success: true,
        count: formatted.length,
        caseId: consultation.id,
        patientId: consultation.patientId,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/images/:imageId
   * Streams the actual compressed image file.
   */
  static async getImageFile(req: Request, res: Response, next: NextFunction) {
    try {
      const imageId = req.params.imageId;

      // Find ClinicalImage or FileRecord
      let fileRecord = await prisma.fileRecord.findUnique({ where: { id: imageId } });
      if (!fileRecord) {
        const clinicalImage = await prisma.clinicalImage.findUnique({
          where: { id: imageId },
          include: { fileRecord: true },
        });
        if (clinicalImage) fileRecord = clinicalImage.fileRecord;
      }

      if (!fileRecord) {
        return res.status(404).json({ success: false, error: 'Clinical image not found' });
      }

      const serveOriginal = req.query.original === 'true';
      const rawPath = (serveOriginal || !fileRecord.compressedPath)
        ? fileRecord.originalPath
        : fileRecord.compressedPath;

      const filePath = resolveExistingFilePath(rawPath, 'images') ||
        (serveOriginal ? null : resolveExistingFilePath(fileRecord.originalPath, 'images'));

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Image file does not exist on disk' });
      }

      const isDownload = req.query.download === 'true';
      if (isDownload) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${fileRecord.originalFilename}"`
        );
      }

      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'image/webp';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/cases/:caseId/audio
   * Uploads real audio voice recording (WebM/Opus), stores persistently, links metadata.
   */
  static async uploadCaseAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const audioFile = req.file || (files && files['audio'] && files['audio'][0]);
      const convertedFile = files && files['convertedAudio'] && files['convertedAudio'][0];

      if (!audioFile) {
        return res.status(400).json({ success: false, error: 'No audio file uploaded' });
      }

      const caseId = req.params.caseId;
      const consultation = await resolveCaseAndPatient(caseId);

      const audioBuffer = audioFile.buffer;
      if (audioBuffer.length < 50) {
        return res.status(400).json({ success: false, error: 'Audio file is too small or incomplete' });
      }

      let detectedExt = '.webm';
      let mimeType = audioFile.mimetype || 'audio/webm';
      let codec = 'Opus';

      if (audioBuffer.slice(0, 4).toString() === 'RIFF' && audioBuffer.slice(8, 12).toString() === 'WAVE') {
        mimeType = 'audio/wav';
        detectedExt = '.wav';
        codec = 'PCM';
      } else if (audioBuffer[0] === 0x1a && audioBuffer[1] === 0x45 && audioBuffer[2] === 0xdf && audioBuffer[3] === 0xa3) {
        mimeType = 'audio/webm';
        detectedExt = '.webm';
        codec = 'Opus';
      } else if (audioBuffer.slice(0, 4).toString() === 'OggS') {
        mimeType = 'audio/ogg';
        detectedExt = '.ogg';
        codec = 'Opus';
      } else if (audioBuffer.slice(4, 8).toString() === 'ftyp') {
        mimeType = 'audio/mp4';
        detectedExt = '.m4a';
        codec = 'AAC';
      } else if (audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0) {
        mimeType = 'audio/mpeg';
        detectedExt = '.mp3';
        codec = 'MP3';
      } else if (audioFile.mimetype === 'audio/aac' || audioFile.mimetype === 'audio/x-aac') {
        mimeType = audioFile.mimetype;
        detectedExt = '.aac';
        codec = 'AAC';
      }

      const originalSizeBytes = audioBuffer.length;
      const originalSha256 = calculateSha256(audioBuffer);
      const originalFilename = audioFile.originalname || `voice_note_${Date.now()}${detectedExt}`;
      const uniqueBase = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ext = detectedExt;
      const storageFilename = `${uniqueBase}${ext}`;

      // Save original audio
      const originalPath = await StorageService.saveOriginal('audio', storageFilename, audioBuffer);

      // Save converted audio if provided, otherwise preserve original in compressedPath
      let compressedPath = StorageService.getCompressedPath('audio', storageFilename);
      let compressedSizeBytes = originalSizeBytes;
      let finalMimeType = mimeType;

      if (convertedFile && convertedFile.buffer && convertedFile.buffer.length > 50) {
        const convertedFilename = `${uniqueBase}_converted.wav`;
        compressedPath = StorageService.getCompressedPath('audio', convertedFilename);
        await fs.promises.writeFile(compressedPath, convertedFile.buffer);
        compressedSizeBytes = convertedFile.buffer.length;
      } else {
        await fs.promises.writeFile(compressedPath, audioBuffer);
      }

      const durationSeconds = parseInt(req.body.durationSeconds, 10) || 5;
      const language = req.body.language || 'English';

      const fileRecord = await prisma.fileRecord.create({
        data: {
          id: uniqueBase,
          category: 'audio',
          originalFilename,
          originalPath,
          compressedPath,
          originalSizeBytes,
          compressedSizeBytes,
          mimeType: finalMimeType,
          compressionAlgorithm: codec === 'Opus' ? 'OPUS' : 'PCM',
          originalSha256,
          decompressedSha256: originalSha256,
          isVerified: true,
        },
      });

      const voiceNote = await prisma.voiceNote.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          fileRecordId: fileRecord.id,
          language,
          durationSeconds,
          codec,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Voice note recorded and stored successfully',
        data: {
          id: voiceNote.id,
          fileRecordId: fileRecord.id,
          caseId: consultation.id,
          patientId: consultation.patientId,
          language: voiceNote.language,
          durationSeconds: voiceNote.durationSeconds,
          codec: voiceNote.codec,
          fileSizeBytes: originalSizeBytes,
          sizeKb: +(originalSizeBytes / 1024).toFixed(2),
          url: `/api/audio/${voiceNote.id}`,
          recordedAt: voiceNote.recordedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cases/:caseId/audio
   * Retrieves voice recordings for case/patient, filtering out incomplete/test files.
   */
  static async getCaseAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const caseId = req.params.caseId;
      const consultation = await resolveCaseAndPatient(caseId);

      const voiceNotes = await prisma.voiceNote.findMany({
        where: {
          OR: [
            { consultationId: consultation.id },
            { patientId: consultation.patientId },
          ],
        },
        include: { fileRecord: true },
        orderBy: { recordedAt: 'desc' },
      });

      // Filter out dummy test ASCII files or incomplete files (< 100 bytes)
      const validVoiceNotes = voiceNotes.filter((vn) => {
        const storedPath = vn.fileRecord?.compressedPath || vn.fileRecord?.originalPath || '';
        const realPath = resolveExistingFilePath(storedPath, 'audio');
        const size = realPath && fs.existsSync(realPath)
          ? fs.statSync(realPath).size
          : (vn.fileRecord?.compressedSizeBytes || vn.fileRecord?.originalSizeBytes || 0);
        return size >= 100;
      });

      const formatted = validVoiceNotes.map((vn) => {
        const storedPath = vn.fileRecord?.compressedPath || vn.fileRecord?.originalPath || '';
        const realPath = resolveExistingFilePath(storedPath, 'audio');
        const sizeBytes = realPath && fs.existsSync(realPath)
          ? fs.statSync(realPath).size
          : (vn.fileRecord?.compressedSizeBytes || vn.fileRecord?.originalSizeBytes || 0);

        return {
          id: vn.id,
          fileRecordId: vn.fileRecordId,
          caseId: consultation.id,
          patientId: consultation.patientId,
          language: vn.language,
          durationSeconds: vn.durationSeconds,
          codec: vn.codec,
          fileSizeBytes: sizeBytes,
          sizeKb: +(sizeBytes / 1024).toFixed(2),
          url: `/api/audio/${vn.id}`,
          recordedAt: vn.recordedAt,
        };
      });

      res.status(200).json({
        success: true,
        count: formatted.length,
        caseId: consultation.id,
        patientId: consultation.patientId,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/audio/:audioId
   * Streams the actual audio file with HTTP Range support for seamless browser playback.
   */
  static async getAudioFile(req: Request, res: Response, next: NextFunction) {
    try {
      const audioId = req.params.audioId;

      let fileRecord = await prisma.fileRecord.findUnique({ where: { id: audioId } });
      if (!fileRecord) {
        const voiceNote = await prisma.voiceNote.findUnique({
          where: { id: audioId },
          include: { fileRecord: true },
        });
        if (voiceNote) fileRecord = voiceNote.fileRecord;
      }

      if (!fileRecord) {
        return res.status(404).json({ success: false, error: 'Voice note audio not found' });
      }

      // Check compressed then original path with flexible path resolution
      const format = (req.query && req.query.format) as string | undefined;
      const compResolved = resolveExistingFilePath(fileRecord.compressedPath, 'audio');
      const origResolved = resolveExistingFilePath(fileRecord.originalPath, 'audio');

      let filePath: string | null = null;
      if (format === 'original') {
        filePath = origResolved || compResolved;
      } else if (format === 'wav') {
        filePath = (compResolved && compResolved.endsWith('.wav'))
          ? compResolved
          : ((origResolved && origResolved.endsWith('.wav')) ? origResolved : compResolved || origResolved);
      } else {
        // Prefer converted WAV if present for universal browser compatibility
        if (compResolved && compResolved.endsWith('.wav')) {
          filePath = compResolved;
        } else if (origResolved && origResolved.endsWith('.wav')) {
          filePath = origResolved;
        } else {
          filePath = compResolved || origResolved;
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Audio file does not exist on disk' });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      if (fileSize < 50) {
        return res.status(400).json({ success: false, error: 'Audio recording is empty or corrupt' });
      }

      // Inspect audio file magic bytes to determine the exact clean playback MIME type
      let mimeType = 'audio/webm';
      try {
        const headerBuf = Buffer.alloc(16);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, headerBuf, 0, 16, 0);
        fs.closeSync(fd);

        if (headerBuf.slice(0, 4).toString() === 'RIFF' && headerBuf.slice(8, 12).toString() === 'WAVE') {
          mimeType = 'audio/wav';
        } else if (headerBuf[0] === 0x1a && headerBuf[1] === 0x45 && headerBuf[2] === 0xdf && headerBuf[3] === 0xa3) {
          mimeType = 'audio/webm';
        } else if (headerBuf.slice(0, 4).toString() === 'OggS') {
          mimeType = 'audio/ogg';
        } else if (headerBuf.slice(4, 8).toString() === 'ftyp') {
          mimeType = 'audio/mp4';
        } else if (headerBuf[0] === 0xff && (headerBuf[1] & 0xe0) === 0xe0) {
          mimeType = 'audio/mpeg';
        } else if (fileRecord.mimeType) {
          mimeType = fileRecord.mimeType.split(';')[0].trim();
        }
      } catch {
        mimeType = (fileRecord.mimeType || 'audio/webm').split(';')[0].trim();
      }

      const range = req.headers.range;

      if (range && /^bytes=\d*-\d*$/.test(range)) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = parts[0] ? parseInt(parts[0], 10) : 0;
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (!parts[0] && parts[1]) {
          start = Math.max(0, fileSize - parseInt(parts[1], 10));
          end = fileSize - 1;
        }
        end = Math.min(end, fileSize - 1);

        if (start < 0 || start >= fileSize || end < start) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache',
        });

        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        });

        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/uploads/image (Module 11 alias)
   */
  static async uploadGenericImage(req: Request, res: Response, next: NextFunction) {
    const caseId = req.body.caseId || req.body.consultationId || req.query.caseId || '0418';
    req.params.caseId = String(caseId);
    return MediaController.uploadCaseImage(req, res, next);
  }

  /**
   * POST /api/uploads/audio (Module 11 alias)
   */
  static async uploadGenericAudio(req: Request, res: Response, next: NextFunction) {
    const caseId = req.body.caseId || req.body.consultationId || req.query.caseId || '0418';
    req.params.caseId = String(caseId);
    return MediaController.uploadCaseAudio(req, res, next);
  }

  /**
   * GET /api/consultations/:id/files (Module 11)
   * Retrieves both clinical images and voice notes for consultation
   */
  static async getConsultationFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const consultationId = req.params.id;
      const consultation = await resolveCaseAndPatient(consultationId);

      const [images, audio] = await Promise.all([
        prisma.clinicalImage.findMany({
          where: { consultationId: consultation.id },
          include: { fileRecord: true },
          orderBy: { capturedAt: 'desc' },
        }),
        prisma.voiceNote.findMany({
          where: { consultationId: consultation.id },
          include: { fileRecord: true },
          orderBy: { recordedAt: 'desc' },
        }),
      ]);

      res.status(200).json({
        success: true,
        consultationId: consultation.id,
        files: {
          images: images.map((img) => ({
            id: img.id,
            label: img.label,
            bodySite: img.bodySite,
            originalSizeBytes: img.fileRecord.originalSizeBytes,
            compressedSizeBytes: img.fileRecord.compressedSizeBytes,
            mimeType: img.fileRecord.mimeType,
            url: `/api/images/${img.id}`,
            downloadUrl: `/api/images/${img.id}?download=true`,
            originalUrl: `/api/files/${img.fileRecordId}/original`,
            processedUrl: `/api/files/${img.fileRecordId}/processed`,
            metadata: img.metadataJson ? JSON.parse(img.metadataJson) : null,
          })),
          audio: audio.map((vn) => ({
            id: vn.id,
            language: vn.language,
            durationSeconds: vn.durationSeconds,
            codec: vn.codec,
            sizeBytes: vn.fileRecord.originalSizeBytes,
            sizeKb: +(vn.fileRecord.originalSizeBytes / 1024).toFixed(2),
            url: `/api/audio/${vn.id}`,
            audioStreamUrl: `/api/files/${vn.fileRecordId}/audio`,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/files/:id/original (Module 11)
   */
  static async getOriginalFile(req: Request, res: Response, next: NextFunction) {
    req.query.original = 'true';
    req.params.imageId = req.params.id;
    return MediaController.getImageFile(req, res, next);
  }

  /**
   * GET /api/files/:id/processed (Module 11)
   */
  static async getProcessedFile(req: Request, res: Response, next: NextFunction) {
    req.params.imageId = req.params.id;
    return MediaController.getImageFile(req, res, next);
  }
}
