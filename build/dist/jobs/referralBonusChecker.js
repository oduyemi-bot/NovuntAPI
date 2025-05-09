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
// jobs/referralBonusChecker.ts
const node_cron_1 = __importDefault(require("node-cron"));
const referralBonus_model_1 = __importDefault(require("../models/referralBonus.model"));
const stake_model_1 = __importDefault(require("../models/stake.model"));
const sendMail_1 = require("../utils/sendMail");
node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const bonuses = yield referralBonus_model_1.default.find({ stakeActivatedByDeadline: false, fullyDepleted: false });
    for (const bonus of bonuses) {
        const deadline = new Date(bonus.createdAt);
        deadline.setDate(deadline.getDate() + 30);
        const day27 = new Date(bonus.createdAt);
        day27.setDate(day27.getDate() + 27);
        const now = new Date();
        // Check if staker activated a goal
        const stakeExists = yield stake_model_1.default.exists({ user: bonus.user, amount: { $gte: 10 } });
        if (stakeExists) {
            bonus.stakeActivatedByDeadline = true;
            yield bonus.save();
            continue;
        }
        // Day 27 warning
        if (now.toDateString() === day27.toDateString()) {
            yield (0, sendMail_1.sendDepletionWarningEmail)(bonus.user, bonus.amount);
            console.log(`Depletion warning sent to user ${bonus.user} for bonus amount ${bonus.amount} USDT`);
        }
        // Start depletion on day 28
        if (now >= deadline) {
            if (!bonus.depletionStartedAt) {
                bonus.depletionStartedAt = now;
                bonus.depletedPercent = 1;
            }
            else {
                const daysDepleting = Math.floor((now.getTime() - bonus.depletionStartedAt.getTime()) / (1000 * 60 * 60 * 24));
                bonus.depletedPercent = Math.min(100, daysDepleting);
                bonus.fullyDepleted = bonus.depletedPercent >= 100;
            }
            yield bonus.save();
        }
    }
}));
