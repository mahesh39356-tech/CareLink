"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const validate_middleware_js_1 = require("../middleware/validate.middleware.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const auth_validator_js_1 = require("../validators/auth.validator.js");
const router = (0, express_1.Router)();
// Role-Specific Authentication
router.post('/patient/login', auth_controller_js_1.AuthController.patientLogin);
router.post('/doctor/login', auth_controller_js_1.AuthController.doctorLogin);
router.post('/patient/register', (0, validate_middleware_js_1.validate)(auth_validator_js_1.registerPatientSchema), auth_controller_js_1.AuthController.registerPatient);
router.post('/doctor/register', (0, validate_middleware_js_1.validate)(auth_validator_js_1.registerDoctorSchema), auth_controller_js_1.AuthController.registerDoctor);
// General Authentication
router.post('/register-patient', (0, validate_middleware_js_1.validate)(auth_validator_js_1.registerPatientSchema), auth_controller_js_1.AuthController.registerPatient);
router.post('/register-doctor', (0, validate_middleware_js_1.validate)(auth_validator_js_1.registerDoctorSchema), auth_controller_js_1.AuthController.registerDoctor);
router.post('/login', (0, validate_middleware_js_1.validate)(auth_validator_js_1.loginSchema), auth_controller_js_1.AuthController.login);
router.post('/refresh-token', (0, validate_middleware_js_1.validate)(auth_validator_js_1.refreshTokenSchema), auth_controller_js_1.AuthController.refreshToken);
router.get('/me', auth_middleware_js_1.authenticate, auth_controller_js_1.AuthController.getMe);
router.post('/logout', auth_controller_js_1.AuthController.logout);
exports.default = router;
