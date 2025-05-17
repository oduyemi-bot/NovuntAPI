"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const adminActivityLogSchema = new mongoose_1.default.Schema({
    admin: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    target: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model("AdminActivityLog", adminActivityLogSchema);
