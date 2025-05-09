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
const node_cron_1 = __importDefault(require("node-cron"));
const stake_model_1 = __importDefault(require("../models/stake.model"));
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
node_cron_1.default.schedule("* * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    // Find matured stakes that haven't been paid
    const maturedStakes = yield stake_model_1.default.find({
        maturityDate: { $lte: now },
        roiPaid: false
    });
    for (const stake of maturedStakes) {
        const wallet = yield userWallet_model_1.default.findOne({ user: stake.user });
        if (!wallet)
            continue;
        // Add ROI to wallet balance
        wallet.balance += stake.roiAmount;
        yield wallet.save();
        // Mark ROI as paid
        stake.roiPaid = true;
        yield stake.save();
        // Log transaction
        yield transaction_model_1.default.create({
            user: stake.user,
            type: "bonus",
            amount: stake.roiAmount,
            status: "confirmed",
            txId: `roi-${stake._id}-${Date.now()}`,
            method: stake.isBonus ? "bonus" : "manual", // label bonus origin if needed
            note: stake.isBonus ? "Bonus stake ROI" : "Stake ROI",
            timestamp: new Date()
        });
    }
}));
