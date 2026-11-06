import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

const router = Router();

router.post('/upload', upload.single('file'), FileController.upload);
router.post('/:id/compress', FileController.compress);
router.post('/:id/decompress', FileController.decompress);
router.get('/:id', FileController.getFile);
router.get('/:id/download/original', FileController.downloadOriginal);
router.get('/:id/download/compressed', FileController.downloadCompressed);
router.get('/:id/download/decompressed', FileController.downloadDecompressed);

export default router;
