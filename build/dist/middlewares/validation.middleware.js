"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.validateLogin = exports.validateRequestBody = void 0;
// Validate request body
const validateRequestBody = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
            return;
        }
        next();
    };
};
exports.validateRequestBody = validateRequestBody;
// Validate login request: requires either email or username, and always password
const validateLogin = (req, res, next) => {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) {
        res.status(400).json({
            error: "Either email or username is required, and password must be provided",
        });
        return;
    }
    next();
};
exports.validateLogin = validateLogin;
// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const validatePassword = (req, res, next) => {
    const { password } = req.body;
    if (!password || !passwordRegex.test(password)) {
        res.status(400).json({
            message: "Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
        return;
    }
    next();
};
exports.validatePassword = validatePassword;
