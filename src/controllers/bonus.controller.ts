import { Request, Response } from "express";
import { calculateRankingBonus } from "../utils/rankingBonus";
import { calculateRedistributionBonus } from "../utils/redistributionBonus";
import ReferralBonus from "../models/referralBonus.model";
import BonusHistory from "../models/bonusHistory.model";

// Get all bonuses with optional filters for user and bonus type
export const getAllBonus = async (req: Request, res: Response) => {
  try {
    const { user, bonusType } = req.query;

    const filter: any = {};
    if (user) filter.user = user;
    if (bonusType) filter.bonusType = bonusType;

    const bonuses = await BonusHistory.find(filter)
      .populate("user", "username email")
      .exec();

    res.status(200).json({ success: true, data: bonuses });
  } catch (error) {
    console.error("Error fetching bonus history:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get a specific bonus by ID
export const getBonusById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bonus = await BonusHistory.findById(id)
      .populate("user", "username email")
      .exec();

    if (!bonus) {
      return res.status(404).json({ success: false, message: "Bonus not found" });
    }

    res.status(200).json({ success: true, data: bonus });
  } catch (error) {
    console.error("Error fetching bonus by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllReferralBonus = async (req: Request, res: Response) => {
  try {
    const { user, fromUser } = req.query;

    const filter: any = {};
    if (user) filter.user = user;
    if (fromUser) filter.fromUser = fromUser;

    const bonuses = await ReferralBonus.find(filter)
      .populate("user", "username email")
      .populate("fromUser", "username email");

    res.status(200).json({ success: true, data: bonuses });
  } catch (error) {
    console.error("Error fetching referral bonuses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getReferralBonusById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bonus = await ReferralBonus.findById(id)
      .populate("user", "username email")
      .populate("fromUser", "username email");

    if (!bonus) {
      return res.status(404).json({ success: false, message: "Referral bonus not found" });
    }

    res.status(200).json({ success: true, data: bonus });
  } catch (error) {
    console.error("Error fetching referral bonus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getBonusByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const bonuses = await BonusHistory.find({ user: userId })
      .populate("user", "username email")
      .exec();

    res.status(200).json({ success: true, data: bonuses });
  } catch (error) {
    console.error("Error fetching bonuses by user ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



export const applyRankingBonuses = async (req: Request, res: Response) => {
  try {
    const bonuses = await calculateRankingBonus();
    res.status(200).json({
      success: true,
      message: "Ranking bonuses applied successfully",
      data: bonuses,
    });
  } catch (error) {
    console.error("Error applying ranking bonuses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const applyRedistributionBonuses = async (req: Request, res: Response) => {
  try {
    const totalPoolAmount = parseFloat(req.body.totalPoolAmount); // Pass the total pool amount in the request body
    const bonuses = await calculateRedistributionBonus(totalPoolAmount);
    res.status(200).json({
      success: true,
      message: "Redistribution bonuses applied successfully",
      data: bonuses,
    });
  } catch (error) {
    console.error("Error applying redistribution bonuses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
