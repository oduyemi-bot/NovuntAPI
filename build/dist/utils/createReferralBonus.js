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
exports.createReferralBonus = void 0;
const stake_model_1 = __importDefault(require("../models/stake.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const referralBonus_model_1 = __importDefault(require("../models/referralBonus.model"));
const createReferralBonus = (user, stakeAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const referrer = yield user_model_1.default.findById(user.referrer);
        if (!referrer) {
            console.log("No referrer found for user.");
            return;
        }
        const referrerStake = yield stake_model_1.default.findOne({
            user: referrer._id,
            amount: { $gte: 10 },
        });
        if (!referrerStake) {
            console.log("Referrer does not have a valid active stake.");
            return;
        }
        let currentUser = referrer;
        let currentLevel = 1;
        let bonusPercentage = 5; // Start with 5% for level 1
        while (currentUser && currentLevel <= 5) {
            const stake = yield stake_model_1.default.findOne({
                user: currentUser._id,
                amount: { $gte: 10 },
            });
            if (!stake) {
                break;
            }
            const bonusAmount = (stakeAmount * bonusPercentage) / 100;
            const referralBonus = new referralBonus_model_1.default({
                fromUser: currentUser._id, // Who referred
                user: user._id, // Who is being referred
                level: currentLevel,
                bonusAmount: bonusAmount,
                stakeActivatedByDeadline: false, // Will be activated later
                fullyDepleted: false,
            });
            yield referralBonus.save();
            yield user_model_1.default.findByIdAndUpdate(currentUser._id, {
                $inc: { referralBonusBalance: bonusAmount }
            });
            // Prepare for next level if applicable
            currentUser = currentUser.referrer ? yield user_model_1.default.findById(currentUser.referrer) : null;
            currentLevel += 1;
            const bonusTiers = [5, 2, 1.5, 1, 0.5];
            bonusPercentage = bonusTiers[currentLevel] || 0;
        }
        console.log("Referral bonuses created successfully.");
    }
    catch (error) {
        console.error("Error creating referral bonuses:", error);
    }
});
exports.createReferralBonus = createReferralBonus;
