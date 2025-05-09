import { Request, Response } from "express";
import UserWallet from "../models/userWallet.model";
import Stake from "../models/stake.model";
import User from "../models/user.model";
import mongoose from "mongoose";

export const stakeFunds = async (req: Request, res: Response) => {
  const userId = req.session.user?.userID;
  const { amount } = req.body;

  if (!userId || !amount || amount < 100) {
    return res.status(400).json({ message: "Minimum stake is 100 USDT." });
  }

  const wallet = await UserWallet.findOne({ user: userId });
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient wallet balance." });
  }

  // Deduct the stake amount
  wallet.balance -= amount;
  await wallet.save();

  const now = new Date();
  const maturityDate = new Date(now);
  maturityDate.setDate(maturityDate.getDate() + 30);

  // Create stake record
  const stake = await Stake.create({
    user: userId,
    amount,
    isBonus: false,
    roiPaid: false,
    createdAt: now,
    maturityDate,
    roiAmount: amount
  });

  // Check if bonus is applicable (within 7 days of registration)
  const user = await User.findById(userId);
  const registeredAt = user?.createdAt;
  const isNewUser = registeredAt && (now.getTime() - new Date(registeredAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

  if (isNewUser) {
    const bonusMaturity = new Date(now);
    bonusMaturity.setDate(bonusMaturity.getDate() + 30);

    await Stake.create({
      user: userId,
      amount: 100,
      isBonus: true,
      roiPaid: false,
      createdAt: now,
      maturityDate: bonusMaturity,
      roiAmount: 100
    });
  }

  return res.status(200).json({
    message: "Staking successful.",
    stakeId: stake._id,
    bonusStakeCreated: isNewUser
  });
};



export const getAllStakes = async (req: Request, res: Response) => {
  const userID = req.session.user?.userID;
  if (!userID) return res.status(401).json({ message: "Unauthorized" });

  try {
    const stakes = await Stake.find({ user: userID }).sort({ createdAt: -1 });

    res.status(200).json({
      stakes: stakes.map(stake => ({
        amount: stake.amount,
        roiAmount: stake.roiAmount,
        startDate: stake.createdAt,
        maturityDate: stake.maturityDate,
        roiPaid: stake.roiPaid,
        isBonus: stake.isBonus,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stakes" });
  }
};

export const getBonusStakes = async (req: Request, res: Response) => {
  const userID = req.session.user?.userID;
  if (!userID) return res.status(401).json({ message: "Unauthorized" });

  try {
    const stakes = await Stake.find({ user: userID, isBonus: true }).sort({ createdAt: -1 });

    res.status(200).json({
      stakes: stakes.map(stake => ({
        amount: stake.amount,
        roiAmount: stake.roiAmount,
        startDate: stake.createdAt,
        maturityDate: stake.maturityDate,
        roiPaid: stake.roiPaid,
        isBonus: stake.isBonus,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bonus stakes" });
  }
};


export const getStakesByUserId = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isBonus, roiPaid, matured } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const filter: any = { user: userId };

  if (isBonus !== undefined) {
    filter.isBonus = isBonus === "true";
  }

  if (roiPaid !== undefined) {
    filter.roiPaid = roiPaid === "true";
  }

  if (matured === "true") {
    filter.maturityDate = { $lte: new Date() };
  }

  try {
    const stakes = await Stake.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      stakes: stakes.map((stake) => ({
        amount: stake.amount,
        roiAmount: stake.roiAmount,
        createdAt: stake.createdAt,
        maturityDate: stake.maturityDate,
        roiPaid: stake.roiPaid,
        isBonus: stake.isBonus,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user's stakes" });
  }
};