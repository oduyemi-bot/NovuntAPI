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
exports.applyRedistributionBonuses = exports.applyRankingBonuses = exports.getBonusByUserId = exports.getReferralBonusById = exports.getAllReferralBonus = exports.getBonusById = exports.getAllBonus = void 0;
const rankingBonus_1 = require("../utils/rankingBonus");
const redistributionBonus_1 = require("../utils/redistributionBonus");
const referralBonus_model_1 = __importDefault(require("../models/referralBonus.model"));
const bonusHistory_model_1 = __importDefault(require("../models/bonusHistory.model"));
// Get all bonuses with optional filters for user and bonus type
const getAllBonus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, bonusType } = req.query;
        const filter = {};
        if (user)
            filter.user = user;
        if (bonusType)
            filter.bonusType = bonusType;
        const bonuses = yield bonusHistory_model_1.default.find(filter)
            .populate("user", "username email")
            .exec();
        res.status(200).json({ success: true, data: bonuses });
    }
    catch (error) {
        console.error("Error fetching bonus history:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getAllBonus = getAllBonus;
// Get a specific bonus by ID
const getBonusById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bonus = yield bonusHistory_model_1.default.findById(id)
            .populate("user", "username email")
            .exec();
        if (!bonus) {
            return res.status(404).json({ success: false, message: "Bonus not found" });
        }
        res.status(200).json({ success: true, data: bonus });
    }
    catch (error) {
        console.error("Error fetching bonus by ID:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getBonusById = getBonusById;
const getAllReferralBonus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, fromUser } = req.query;
        const filter = {};
        if (user)
            filter.user = user;
        if (fromUser)
            filter.fromUser = fromUser;
        const bonuses = yield referralBonus_model_1.default.find(filter)
            .populate("user", "username email")
            .populate("fromUser", "username email");
        res.status(200).json({ success: true, data: bonuses });
    }
    catch (error) {
        console.error("Error fetching referral bonuses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getAllReferralBonus = getAllReferralBonus;
const getReferralBonusById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bonus = yield referralBonus_model_1.default.findById(id)
            .populate("user", "username email")
            .populate("fromUser", "username email");
        if (!bonus) {
            return res.status(404).json({ success: false, message: "Referral bonus not found" });
        }
        res.status(200).json({ success: true, data: bonus });
    }
    catch (error) {
        console.error("Error fetching referral bonus:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getReferralBonusById = getReferralBonusById;
const getBonusByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bonuses = yield bonusHistory_model_1.default.find({ user: id })
            .populate("user", "username email")
            .exec();
        res.status(200).json({ success: true, data: bonuses });
    }
    catch (error) {
        console.error("Error fetching bonuses by user ID:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getBonusByUserId = getBonusByUserId;
const applyRankingBonuses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bonuses = yield (0, rankingBonus_1.calculateRankingBonus)();
        res.status(200).json({
            success: true,
            message: "Ranking bonuses applied successfully",
            data: bonuses,
        });
    }
    catch (error) {
        console.error("Error applying ranking bonuses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.applyRankingBonuses = applyRankingBonuses;
const applyRedistributionBonuses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalPoolAmount = parseFloat(req.body.totalPoolAmount); // Pass the total pool amount in the request body
        const bonuses = yield (0, redistributionBonus_1.calculateRedistributionBonus)(totalPoolAmount);
        res.status(200).json({
            success: true,
            message: "Redistribution bonuses applied successfully",
            data: bonuses,
        });
    }
    catch (error) {
        console.error("Error applying redistribution bonuses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.applyRedistributionBonuses = applyRedistributionBonuses;
