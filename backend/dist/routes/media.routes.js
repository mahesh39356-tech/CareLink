"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const media_controller_js_1 = require("../controllers/media.controller.js");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});
const router = (0, express_1.Router)();
// Case-scoped media endpoints
router.post('/cases/:caseId/images', upload.single('image'), media_controller_js_1.MediaController.uploadCaseImage);
router.get('/cases/:caseId/images', media_controller_js_1.MediaController.getCaseImages);
router.post('/cases/:caseId/audio', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'convertedAudio', maxCount: 1 },
]), media_controller_js_1.MediaController.uploadCaseAudio);
router.get('/cases/:caseId/audio', media_controller_js_1.MediaController.getCaseAudio);
// Direct media streaming and download endpoints
router.get('/images/:imageId', media_controller_js_1.MediaController.getImageFile);
router.get('/audio/:audioId', media_controller_js_1.MediaController.getAudioFile);
exports.default = router;
