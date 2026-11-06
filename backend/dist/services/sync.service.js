"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const database_js_1 = require("../config/database.js");
const crypto_js_1 = require("../utils/crypto.js");
class SyncService {
    static async processBatchSync(data) {
        const { clientId, idempotencyKey, records } = data;
        // Check for duplicate submission using idempotency key
        const existingSync = await database_js_1.prisma.syncRecord.findUnique({
            where: { idempotencyKey },
        });
        if (existingSync) {
            return {
                status: existingSync.status,
                batchId: existingSync.batchId,
                idempotencyKey: existingSync.idempotencyKey,
                recordsCount: existingSync.recordsCount,
                payloadBytes: existingSync.payloadBytes,
                sha256Hash: existingSync.sha256Hash,
                duplicateIgnored: true,
                message: 'Duplicate submission safely ignored; existing delivery receipt returned.',
            };
        }
        // Compute payload hash and byte weight
        const rawPayload = JSON.stringify(records);
        const sha256Hash = (0, crypto_js_1.calculateSha256)(Buffer.from(rawPayload));
        const payloadBytes = Buffer.byteLength(rawPayload, 'utf8');
        // Process each record transactionally
        const results = await database_js_1.prisma.$transaction(async (tx) => {
            const createdSync = await tx.syncRecord.create({
                data: {
                    clientId,
                    idempotencyKey,
                    status: 'DELIVERED',
                    payloadBytes,
                    sha256Hash,
                    recordsCount: records.length,
                    clientPayload: rawPayload,
                },
            });
            for (const rec of records) {
                // Find or create patient
                let patient = await tx.patientProfile.findFirst({
                    where: {
                        fullName: rec.fullName,
                        clinic: rec.clinic || 'Kijani Rural Clinic',
                    },
                });
                if (!patient) {
                    patient = await tx.patientProfile.create({
                        data: {
                            fullName: rec.fullName,
                            age: rec.age,
                            gender: rec.gender,
                            clinic: rec.clinic || 'Kijani Rural Clinic',
                        },
                    });
                }
                // Check if vital record with clientRecordId already exists to avoid re-insertion
                const existingVital = await tx.vitalRecord.findFirst({
                    where: {
                        patientId: patient.id,
                        clientRecordId: rec.clientRecordId,
                    },
                });
                if (!existingVital) {
                    const vital = await tx.vitalRecord.create({
                        data: {
                            patientId: patient.id,
                            clientRecordId: rec.clientRecordId,
                            systolic: rec.systolic,
                            diastolic: rec.diastolic,
                            temperature: rec.temperature,
                            heartRate: rec.heartRate,
                        },
                    });
                    // Create pending consultation for doctor review
                    await tx.consultation.create({
                        data: {
                            patientId: patient.id,
                            status: 'PENDING',
                            priority: (rec.systolic >= 140 || rec.temperature >= 38.5) ? 'URGENT' : 'ROUTINE',
                            reason: `Sync from ${rec.clinic || 'Field Worker'} (${rec.clientRecordId})`,
                        },
                    });
                }
            }
            return createdSync;
        });
        return {
            status: 'DELIVERED',
            batchId: results.batchId,
            idempotencyKey: results.idempotencyKey,
            recordsCount: results.recordsCount,
            payloadBytes: results.payloadBytes,
            sha256Hash: results.sha256Hash,
            duplicateIgnored: false,
            message: 'Offline batch successfully unpacked, verified and delivered.',
        };
    }
    static async getReceipt(idempotencyKey) {
        const sync = await database_js_1.prisma.syncRecord.findUnique({
            where: { idempotencyKey },
        });
        if (!sync)
            throw new Error('Sync record not found');
        return sync;
    }
}
exports.SyncService = SyncService;
