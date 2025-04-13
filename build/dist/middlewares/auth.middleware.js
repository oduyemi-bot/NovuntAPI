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
exports.checkSuperAdmin = exports.checkAdmin = exports.authenticateUser = void 0;
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
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (error) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const user = yield user_model_1.default.findById(decoded.id);
        if (!user) {
            res.status(401).json({ message: "User not found. Invalid token." });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ message: "Unauthorized" });
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
