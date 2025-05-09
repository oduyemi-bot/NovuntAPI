"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bonus_controller_1 = require("../controllers/bonus.controller");
const bonus_controller_2 = require("../controllers/bonus.controller");
const router = express_1.default.Router();
// Referral bonuses
router.get("/", bonus_controller_1.getAllBonus);
router.get("/:id", bonus_controller_1.getBonusById);
router.get("/referrals/", bonus_controller_1.getAllReferralBonus);
router.get("/referral/:id", bonus_controller_1.getReferralBonusById);
router.get("/user/:id", bonus_controller_1.getBonusByUserId);
// Ranking bonuses
router.post("/ranking", bonus_controller_2.applyRankingBonuses);
// Redistribution bonuses
router.post("/redistribution", bonus_controller_2.applyRedistributionBonuses);
exports.default = router;
