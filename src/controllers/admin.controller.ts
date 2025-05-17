import { Request, Response } from "express";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";
import AdminActivityLog from "../models/adminActivityLog.model";
import { mockNowPaymentsWithdraw } from "../utils/mockNowPayments";
import { sendWithdrawalStatusEmail } from "../utils/sendMail";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logAudit } from "../utils/logger";


const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%


dotenv.config();

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // identifier = email or username
    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/username and password are required." });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    }).select("+password");

    if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
      return res.status(401).json({ message: "Access denied." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "12h",
    });

    logAudit(`Admin Login: ${user.email} (${user.role})`);
    return res.status(200).json({
      message: "Login successful.",
      token,
      role: user.role,
      twoFAEnabled: user.twoFAEnabled,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.params;
  const { action } = req.body; // "approve" or "reject"
  const admin = req.user;

  if (!admin) return res.status(401).json({ message: "Unauthorized" });

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

    await AdminActivityLog.create({
      admin: admin._id,
      action: "approve_withdrawal",
      target: user._id,
      metadata: { txId: transactionId, amount: tx.amount },
    });

    return res.status(200).json({ message: "Withdrawal approved and processed.", txId: result.txId });
  } else {
    tx.status = "failed";
    tx.note = "Rejected by admin";
    tx.processedAt = new Date();
    await tx.save();

    await sendWithdrawalStatusEmail(user.email, "rejected", tx.amount);

    await AdminActivityLog.create({
      admin: admin._id,
      action: "reject_withdrawal",
      target: user._id,
      metadata: { txId: transactionId, amount: tx.amount },
    });

    return res.status(200).json({ message: "Withdrawal rejected." });
  }
};

export const getAllTransactions = async (_req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find().populate("user").sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions.", error });
  }
};

export const getAllUsersWithBalances = async (_req: Request, res: Response) => {
  try {
    const users = await User.find();
    const wallets = await UserWallet.find();

    const userData = users.map((user) => {
      const wallet = wallets.find((w) => w.user.toString() === user._id.toString());
      return {
        user: {
          _id: user._id,
          fname: user.fname,
          lname: user.lname,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        balance: wallet?.balance || 0,
        totalDeposited: wallet?.totalDeposited || 0,
        totalWithdrawn: wallet?.totalWithdrawn || 0,
      };
    });

    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user balances.", error });
  }
};

export const getFlaggedActivities = async (_req: Request, res: Response) => {
  try {
    const flagged = await Transaction.find({ flagged: true }).populate("user").sort({ createdAt: -1 });
    res.status(200).json(flagged);
  } catch (error) {
    res.status(500).json({ message: "Error fetching flagged activities.", error });
  }
};

export const getAdminActivityLogs = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  if (!admin || admin.role !== "superAdmin") {
    return res.status(403).json({ message: "Forbidden. Only super administrators can view logs." });
  }

  try {
    const logs = await AdminActivityLog.find().populate("admin").sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin activity logs.", error });
  }
};