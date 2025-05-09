"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const depositBonusSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bonusAmount: {
        type: Number,
        required: true
    },
    depositId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    grantedAt: {
        type: Date,
        default: Date.now
    }
});
const DepositBonus = mongoose_1.default.model('DepositBonus', depositBonusSchema);
exports.default = DepositBonus;
