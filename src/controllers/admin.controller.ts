import { Request, Response } from "express";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";
import { mockNowPaymentsWithdraw } from "../utils/mockNowPayments";
import { sendWithdrawalStatusEmail } from "../utils/sendMail";

const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%

export const approveWithdrawal = async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const { action } = req.body; // "approve" or "reject"
  
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'." });
    }
  
    const tx = await Transaction.findById(transactionId).populate("user");
    if (!tx || tx.status !== "pending" || !tx.requiresAdminApproval) {
      return res.status(404).json({ message: "Invalid or already processed transaction." });
    }
  
    const user = tx.user as any;
    const wallet = await UserWallet.findOne({ user: tx.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "User wallet not found." });
    }
  
    const fee = (WITHDRAWAL_FEE_PERCENTAGE / 100) * tx.amount;
    const total = tx.amount + fee;
    const profit = wallet.balance - wallet.totalDeposited;
  
    if (action === "approve") {
      if (total > profit) {
        return res.status(400).json({ message: "User no longer has sufficient profit." });
      }
  
      const result = await mockNowPaymentsWithdraw({
        userId: user._id.toString(),
        address: tx.walletAddress,
        amount: tx.amount,
      });
      
  
      if (result.status !== "success") {
        return res.status(500).json({ message: "NowPayments withdrawal failed." });
      }
  
      wallet.balance -= total;
      wallet.totalWithdrawn += tx.amount;
      await wallet.save();
  
      tx.status = "confirmed";
      tx.txId = result.txId;
      tx.method = "nowpayments";
      tx.processedAt = new Date();
      await tx.save();
  
      await sendWithdrawalStatusEmail(user.email, "approved", tx.amount);
  
      return res.status(200).json({ message: "Withdrawal approved and processed.", txId: result.txId });
  
    } else {
      // Reject flow
      tx.status = "failed";
      tx.note = "Rejected by admin";
      tx.processedAt = new Date();
      await tx.save();
  
      await sendWithdrawalStatusEmail(user.email, "rejected", tx.amount);
  
      return res.status(200).json({ message: "Withdrawal rejected." });
    }
  };