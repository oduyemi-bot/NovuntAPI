"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bonusHistorySchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    bonusType: {
        type: String,
        required: true,
        enum: ['Deposit Bonus', 'Referral Bonus', 'Stake Bonus', 'Level Bonus', 'Finance Titan Pool', 'Level 2 Restake']
    },
    source: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});
const BonusHistory = mongoose_1.default.model('DepositBonus', bonusHistorySchema);
exports.default = BonusHistory;
