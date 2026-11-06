import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { syncBatchSchema } from '../validators/sync.validator.js';

const router = Router();

router.post('/batch', validate(syncBatchSchema), SyncController.batchSync);
router.get('/receipt/:idempotencyKey', SyncController.getReceipt);

export default router;
