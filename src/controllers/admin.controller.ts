import { Request, Response } from "express";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";
import AdminActivityLog from "../models/adminActivityLog.model";
import WeeklyProfit from "../models/weeklyProfit.model";
import KYCSubmission from "../models/kycSubmission.model";
import SecurityLog from "../models/securityLog.model";
import { mockNowPaymentsWithdraw } from "../utils/mockNowPayments";
import { 
  sendFraudAlertEmail, 
  sendUserFraudNotificationEmail, 
  sendWithdrawalApprovedEmail, 
  sendWithdrawalStatusEmail 
} from "../utils/sendMail";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logAudit } from "../utils/logger";
import mockBlockchainEmitter from "../utils/mockBlockchainEmitter";
import axios from "axios";


const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%
const FLAG_THRESHOLD_COUNT = 5;
const FLAG_THRESHOLD_AMOUNT = 1000;


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

export const updateAdminProfilePicture = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { profilePicture } = req.body;

  try {
    const updatedAdmin = await User.findByIdAndUpdate(
      admin._id,
      { profilePicture },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) return res.status(404).json({ message: "User not found." });

    logAudit(`Admin Profile Picture Updated: ${admin.email}`);
    return res.status(200).json(updatedAdmin);
  } catch (error) {
    console.error("Error updating admin profile picture:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


export const updateAdminPassword = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(admin._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Old password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    logAudit(`Admin Password Updated: ${admin.email}`);
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error updating admin password:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getAdminProfile = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await User.findById(admin._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.params;
  const { action, note } = req.body;
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
  const wallet = await UserWallet.findOne({ user: user._id });
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

    const recentWithdrawalsCount = await Transaction.countDocuments({
      user: user._id,
      type: "withdrawal",
      status: "confirmed",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
    });

    const isFraudSuspected =
      tx.amount > FLAG_THRESHOLD_AMOUNT || recentWithdrawalsCount >= FLAG_THRESHOLD_COUNT;

    if (isFraudSuspected) {
      user.fraudFlagged = true;
      await user.save();

      await SecurityLog.create({
        user: user._id,
        action: "fraud_alert_triggered",
        status: "failure",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        details: `Withdrawal amount: ${tx.amount}, recent withdrawals in 24h: ${recentWithdrawalsCount}`,
      });

      const reason = "Suspicious withdrawal amount or frequency detected";
      const details = `Amount: ${tx.amount} USDT, Recent withdrawals in last 24h: ${recentWithdrawalsCount}, Flagged by admin: ${admin.email}`;

      await sendFraudAlertEmail(user.email, user.username, reason, details);
      await sendUserFraudNotificationEmail(
        user.email,
        user.username,
        `Unusual withdrawal detected: amount ${tx.amount} USDT, recent withdrawals in 24h: ${recentWithdrawalsCount}`
      );
    }

    if (tx.status !== "pending") {
      return res.status(400).json({ message: "Transaction already processed." });
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
    // Optional: Add approval note
    tx.note = `Approved by admin ${admin.email}`;
    await tx.save();

    mockBlockchainEmitter.emit("withdrawalConfirmed", {
      userId: user._id.toString(),
      amount: tx.amount,
      txId: result.txId,
      timestamp: new Date(),
    });

    await sendWithdrawalStatusEmail(user.email, "approved", tx.amount);
    await sendWithdrawalApprovedEmail({
      to: user.email,
      name: user.username,
      amount: tx.amount,
      address: tx.walletAddress,
      txId: result.txId,
    });

    await AdminActivityLog.create({
      admin: admin._id,
      action: "approve_withdrawal",
      target: user._id,
      metadata: { txId: transactionId, amount: tx.amount, method: "nowpayments" },
    });

    await SecurityLog.create({
      user: user._id,
      action: "withdrawal_approved",
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      details: `Approved by admin ${admin._id}. Amount: ${tx.amount}, Fee: ${fee}, txId: ${result.txId}`,
    });

    return res.status(200).json({ message: "Withdrawal approved and processed.", txId: result.txId });
  }

  // ---- REJECTION FLOW ----
  tx.status = "failed";
  tx.note = note || "Rejected by admin";
  tx.processedAt = new Date();
  await tx.save();

  await sendWithdrawalStatusEmail(user.email, "rejected", tx.amount);

  await AdminActivityLog.create({
    admin: admin._id,
    action: "reject_withdrawal",
    target: user._id,
    metadata: { txId: transactionId, amount: tx.amount, note: tx.note },
  });

  await SecurityLog.create({
    user: user._id,
    action: "withdrawal_rejected",
    status: "failure",
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    details: `Rejected by admin ${admin._id}. Amount: ${tx.amount}, Reason: ${tx.note}`,
  });

  const recentRejected = await Transaction.countDocuments({
    user: user._id,
    type: "withdrawal",
    status: "failed",
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });

  const flagged = recentRejected >= FLAG_THRESHOLD_COUNT || tx.amount >= FLAG_THRESHOLD_AMOUNT;

  if (flagged) {
    user.flaggedForReview = true;
    await user.save();

    await sendFraudAlertEmail(
      user.email,
      user.username,
      "Multiple failed withdrawal attempts or suspicious amount",
      `Attempts: ${recentRejected}, Amount: ${tx.amount}, Flagged By: ${admin.email}`
    );
  }

  return res.status(200).json({ message: "Withdrawal rejected." });
};


export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await Transaction.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions.", error });
  }
};

export const getAllUsersWithBalances = async (_req: Request, res: Response) => {
  try {
    const users = await User.find({ role: { $ne: "superAdmin" } });
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
          kycVerified: (user as any).kycVerified || false,
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
    const suspiciousPatterns = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) },
          status: { $in: ["confirmed"] },
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $match: {
          count: { $gt: FLAG_THRESHOLD_COUNT },
          totalAmount: { $gt: FLAG_THRESHOLD_AMOUNT },
        },
      },
    ]);

    const flaggedUsers = suspiciousPatterns.map((item) => item._id);

    const flagged = await Transaction.find({ user: { $in: flaggedUsers } }).populate("user").sort({ createdAt: -1 });
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = await AdminActivityLog.find()
      .populate("admin")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin activity logs.", error });
  }
};

export const reviewKYCSubmission = async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user;
  const { kycId } = req.params;
  const { action, note } = req.body; // 'approve' or 'reject', optional note
  if (!kycId) return res.status(400).json({ message: "KYC ID is required." });
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Forbidden. Only admins can review KYC submissions." });
  }

  try {
    const submission = await KYCSubmission.findById(kycId);
    if (!submission) return res.status(404).json({ message: "KYC submission not found." });
    if (submission.status !== "pending") {
      return res.status(400).json({ message: "KYC submission already reviewed." });
    }

    submission.status = action === "approve" ? "approved" : "rejected";
    submission.reviewedAt = new Date();
    await submission.save();

    await User.findByIdAndUpdate(submission.user, {
      kycVerified: action === "approve",
    });

    await AdminActivityLog.create({
      admin: admin._id,
      action: `${action}_kyc`,
      target: submission.user,
      metadata: { kycId, note: note || `${action}d without note` },
    });

    res.status(200).json({ message: `KYC ${action}d successfully.` });
  } catch (error) {
    res.status(500).json({ message: "Error reviewing KYC.", error });
  }
};


export const adminLogout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({ message: "Admin logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Failed to logout admin." });
  }
};

export const declareWeeklyProfit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { weekNumber, profitAmount, startDate, endDate } = req.body;

    if (!weekNumber || !profitAmount || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const existing = await WeeklyProfit.findOne({ weekNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: "Profit already declared for this week." });
    }

    await WeeklyProfit.create({
      weekNumber,
      profitAmount,
      startDate,
      endDate,
    });

    // Trigger bonus ranking and redistribution
    try {
      await axios.post("https://novunt.vercel.app/api/v1/bonus/ranking");
      await axios.post("https://novunt.vercel.app/api/v1/bonus/redistribution");
    } catch (bonusError) {
      console.error("Bonus trigger failed:", bonusError);
    }

    return res.status(201).json({
      success: true,
      message: `Weekly profit for week ${weekNumber} declared successfully. Bonus triggers initiated.`,
    });
  } catch (error) {
    console.error("Error declaring weekly profit:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
