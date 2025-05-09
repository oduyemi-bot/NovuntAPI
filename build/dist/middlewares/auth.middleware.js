"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.require2FA = exports.checkSuperAdmin = exports.checkAdmin = exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = __importDefault(require("../models/user.model"));
dotenv_1.default.config();
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Access token is missing" });
            return;
        }
        ;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield user_model_1.default.findById(decoded.userID);
        if (!user) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ message: "Token expired. Please login again." });
        }
        else {
            res.status(401).json({ message: "Invalid token." });
        }
    }
});
exports.authenticateUser = authenticateUser;
const checkAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized. User not authenticated." });
        return;
    }
    const allowedRoles = new Set(["admin", "superAdmin"]);
    if (!allowedRoles.has(req.user.role)) {
        res.status(403).json({ message: "Forbidden. User is not an admin." });
        return;
    }
    next();
};
exports.checkAdmin = checkAdmin;
const checkSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "superAdmin") {
        res.status(403).json({ message: "Forbidden: Only super administrators can perform this action." });
        return;
    }
    next();
};
exports.checkSuperAdmin = checkSuperAdmin;
const require2FA = (req, res, next) => {
    if (!req.user || !req.user.twoFAEnabled) {
        return res.status(403).json({ message: "2FA required" });
    }
    next();
};
exports.require2FA = require2FA;
