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
exports.calculateRankingBonus = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const stake_model_1 = __importDefault(require("../models/stake.model"));
const rankBonusMap = {
    "Associate Staker": 0.05,
    "Principal Strategist": 0.1,
    "Elite Capitalist": 0.15,
    "Wealth Architect": 0.2,
    "Finance Titan": 0.25,
};
const calculateRankingBonus = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const users = yield user_model_1.default.find({ isActive: true }).populate("directDownlines");
        const bonuses = [];
        for (const user of users) {
            const userStake = yield stake_model_1.default.findOne({ user: user._id });
            if (!userStake || userStake.amount < 10) {
                continue; // Skip users without valid stake
            }
            const rank = user.rank;
            const bonusPercentage = (_a = rankBonusMap[rank]) !== null && _a !== void 0 ? _a : 0; // safer with nullish coalescing
            const bonusAmount = userStake.amount * bonusPercentage;
            bonuses.push({
                user: user._id,
                bonusAmount,
                rank,
            });
            yield user_model_1.default.findByIdAndUpdate(user._id, {
                $inc: { referralBonusBalance: bonusAmount },
            });
        }
        console.log("Ranking bonuses calculated and applied successfully.");
        return bonuses;
    }
    catch (error) {
        console.error("Error calculating ranking bonuses:", error);
    }
});
exports.calculateRankingBonus = calculateRankingBonus;
