import express from "express";
import { getAllBonus, getAllReferralBonus, getBonusById, getBonusByUserId, getReferralBonusById } from "../controllers/bonus.controller";
import { applyRankingBonuses, applyRedistributionBonuses } from "../controllers/bonus.controller";

const router = express.Router();

// Referral bonuses
router.get("/", getAllBonus);
router.get("/:id", getBonusById);
router.get("/referral/", getAllReferralBonus);
router.get("/referral/:id", getReferralBonusById);
router.get("/user/:userId", getBonusByUserId);

// Ranking bonuses
router.post("/ranking", applyRankingBonuses);

// Redistribution bonuses
router.post("/redistribution", applyRedistributionBonuses);

export default router;
