"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const TransactionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["deposit", "withdrawal", "transfer", "bonus"], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], required: true },
    txId: { type: String, required: true, unique: true },
    fromUser: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    toUser: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    method: { type: String, enum: ["nowpayments", "internal", "bonus", "manual"] },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
    walletAddress: { type: String },
    fee: { type: Number },
    netAmount: { type: Number },
    requiresAdminApproval: { type: Boolean, default: false },
    processedAt: { type: Date },
});
const Transaction = mongoose_1.default.model("Transaction", TransactionSchema);
exports.default = Transaction;
