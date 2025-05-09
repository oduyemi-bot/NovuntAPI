import { Request, Response } from "express";
import UserWallet from "../models/userWallet.model";
import mongoose from "mongoose";


export const getAllWallets = async (req: Request, res: Response) => {
  try {
    const wallets = await UserWallet.find().populate("user", "email username");

    res.status(200).json({
      count: wallets.length,
      wallets: wallets.map(wallet => ({
        user: wallet.user,
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        walletAddress: wallet.walletAddress,
        createdAt: wallet.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch wallets." });
  }
};


export const getUserWallet = async (req: Request, res: Response) => {
  const userID = req.session.user?.userID;
  if (!userID) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const wallet = await UserWallet.findOne({ user: userID });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.status(200).json(wallet);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
};



export const getUserWalletByUserID = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID format." });
  }

  try {
    const wallet = await UserWallet.findOne({ user: id }).populate("user", "email username");
    if (!wallet) {
      return res.status(404).json({ message: "User wallet not found." });
    }

    res.status(200).json({
      wallet: {
        user: wallet.user,
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        walletAddress: wallet.walletAddress,
        createdAt: wallet.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user wallet." });
  }
};




