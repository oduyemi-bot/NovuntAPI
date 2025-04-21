"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function logAudit(message) {
    const logPath = path_1.default.join(__dirname, "../../logs/superadmin-audit.log");
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    fs_1.default.mkdirSync(path_1.default.dirname(logPath), { recursive: true });
    fs_1.default.appendFileSync(logPath, logMessage);
}
