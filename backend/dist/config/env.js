"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().default('file:./dev.db'),
    JWT_SECRET: zod_1.z.string().default('carelink_super_secret_jwt_key_rural_telemedicine_2026'),
    JWT_REFRESH_SECRET: zod_1.z.string().default('carelink_super_secret_refresh_key_2026'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173,http://localhost:4173,capacitor://localhost'),
    UPLOAD_MAX_FILE_SIZE_MB: zod_1.z.coerce.number().default(25),
    STORAGE_ROOT: zod_1.z.string().default(path_1.default.resolve(process.cwd(), 'storage')),
});
exports.env = envSchema.parse(process.env);
