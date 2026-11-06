"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema) {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            req.body = parsed.body ?? req.body;
            req.query = parsed.query ?? req.query;
            req.params = parsed.params ?? req.params;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: err.errors.map((e) => ({
                        field: e.path.join('.').replace(/^(body|query|params)\./, ''),
                        message: e.message,
                    })),
                });
            }
            next(err);
        }
    };
}
