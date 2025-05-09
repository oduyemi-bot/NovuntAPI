import { Request, Response } from "express";
import "../jobs/depositListener";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";
import { sendWithdrawalRequestEmail } from "../utils/sendMail";
import { calculateWithdrawalFee } from "../utils/fees";
import { mockNowPaymentsWithdraw } from "../utils/mockNowPayments";



export const requestWithdrawal = async (req: Request, res: Response) => {
  const { amount, walletAddress } = req.body;
  const userID = req.session.user?.userID;

  if (!amount || !walletAddress) {
    return res.status(400).json({ message: "Amount and wallet address are required." });
  }

  const MIN_WITHDRAWAL = 10;
  if (amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ message: `Minimum withdrawal is ${MIN_WITHDRAWAL} USDT.` });
  }

  const wallet = await UserWallet.findOne({ user: userID });
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found." });
  }

  const profit = wallet.balance - wallet.totalDeposited;
  const fee = calculateWithdrawalFee(amount);
  const total = amount;
  const netAmount = Number((amount - fee).toFixed(2));

  if (total > profit) {
    return res.status(400).json({ message: "Insufficient withdrawable profit." });
  }

  const requiresApproval = amount >= 1000;

  const tx = new Transaction({
    user: userID,
    type: "withdrawal",
    amount,
    fee,
    netAmount,
    walletAddress,
    status: requiresApproval ? "pending" : "completed",
    requiresAdminApproval: requiresApproval,
    reference: `WD-${Date.now()}-${userID}`,
  });

  await tx.save();

  if (requiresApproval) {
    await sendWithdrawalRequestEmail(userID, amount);
  } else {
    wallet.balance -= amount;
    wallet.totalWithdrawn += amount;
    await wallet.save();
  }

  res.status(200).json({
    message: requiresApproval ? "Withdrawal pending admin approval." : "Withdrawal processed.",
    transactionID: tx._id,
    netAmount,
  });
};


export const requestMockWithdrawal = async (req: Request, res: Response, next:any) => {
  try {
    const { userId, address, amount } = req.body;
    const response = await mockNowPaymentsWithdraw({ userId, address, amount });
    res.status(200).json({ status: "pending", txId: response.txId });
  } catch (error) {
    next(error);
  }
};

