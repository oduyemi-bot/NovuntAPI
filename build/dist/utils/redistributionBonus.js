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
exports.calculateRedistributionBonus = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const stake_model_1 = __importDefault(require("../models/stake.model"));
const calculateRedistributionBonus = (totalPoolAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all active users
        const users = yield user_model_1.default.find({ isActive: true });
        let totalStake = 0;
        const userStakes = [];
        // Calculate total stake and store individual stake amounts
        for (const user of users) {
            const stake = yield stake_model_1.default.findOne({ user: user._id });
            if (stake && stake.amount >= 10) {
                totalStake += stake.amount;
                userStakes.push({ userId: user._id.toString(), amount: stake.amount });
            }
        }
        // Calculate the 2.5% redistribution pool
        const redistributionPool = totalPoolAmount * 0.025;
        const redistributionBonuses = [];
        for (const stakeInfo of userStakes) {
            const userShare = stakeInfo.amount / totalStake;
            const userBonus = redistributionPool * userShare;
            redistributionBonuses.push({
                user: stakeInfo.userId,
                bonusAmount: userBonus,
            });
            // Update user bonus balance
            yield user_model_1.default.findByIdAndUpdate(stakeInfo.userId, {
                $inc: { referralBonusBalance: userBonus },
            });
        }
        console.log("Redistribution bonuses applied successfully.");
        return redistributionBonuses;
    }
    catch (error) {
        console.error("Error calculating redistribution bonuses:", error);
    }
});
exports.calculateRedistributionBonus = calculateRedistributionBonus;
