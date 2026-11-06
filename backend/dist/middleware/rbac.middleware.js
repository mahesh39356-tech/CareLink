"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized access',
            });
        }
        if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role`,
            });
        }
        next();
    };
}
