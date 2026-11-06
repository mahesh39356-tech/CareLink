"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
const client_1 = require("@prisma/client");
const env_js_1 = require("./env.js");
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: env_js_1.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
if (env_js_1.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        console.log('✅ Connected to database successfully.');
    }
    catch (err) {
        console.error('❌ Failed to connect to database:', err);
        throw err;
    }
}
