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
exports.adminLogout = exports.reviewKYCSubmission = exports.getAdminActivityLogs = exports.getFlaggedActivities = exports.getAllUsersWithBalances = exports.getAllTransactions = exports.approveWithdrawal = exports.getAdminProfile = exports.updateAdminPassword = exports.updateAdminProfilePicture = exports.adminLogin = void 0;
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const adminActivityLog_model_1 = __importDefault(require("../models/adminActivityLog.model"));
const kycSubmission_model_1 = __importDefault(require("../models/kycSubmission.model"));
const securityLog_model_1 = __importDefault(require("../models/securityLog.model"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const sendMail_1 = require("../utils/sendMail");
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%
const FLAG_THRESHOLD_COUNT = 5;
const FLAG_THRESHOLD_AMOUNT = 1000;
dotenv_1.default.config();
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { identifier, password } = req.body; // identifier = email or username
        if (!identifier || !password) {
            return res.status(400).json({ message: "Email/username and password are required." });
        }
        const user = yield user_model_1.default.findOne({
            $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
        }).select("+password");
        if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return res.status(401).json({ message: "Access denied." });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const token = jsonwebtoken_1.default.sign({ userID: user._id }, process.env.JWT_SECRET, {
            expiresIn: "12h",
        });
        (0, logger_1.logAudit)(`Admin Login: ${user.email} (${user.role})`);
        return res.status(200).json({
            message: "Login successful.",
            token,
            role: user.role,
            twoFAEnabled: user.twoFAEnabled,
        });
    }
    catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
exports.adminLogin = adminLogin;
const updateAdminProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.user;
    if (!admin)
        return res.status(401).json({ message: "Unauthorized" });
    const { profilePicture } = req.body;
    try {
        const updatedAdmin = yield user_model_1.default.findByIdAndUpdate(admin._id, { profilePicture }, { new: true }).select("-password");
        if (!updatedAdmin)
            return res.status(404).json({ message: "User not found." });
        (0, logger_1.logAudit)(`Admin Profile Picture Updated: ${admin.email}`);
        return res.status(200).json(updatedAdmin);
    }
    catch (error) {
        console.error("Error updating admin profile picture:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.updateAdminProfilePicture = updateAdminProfilePicture;
const updateAdminPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.user;
    if (!admin)
        return res.status(401).json({ message: "Unauthorized" });
    const { oldPassword, newPassword } = req.body;
    try {
        const user = yield user_model_1.default.findById(admin._id).select("+password");
        if (!user)
            return res.status(404).json({ message: "User not found." });
        const isMatch = yield bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Old password is incorrect." });
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        yield user.save();
        (0, logger_1.logAudit)(`Admin Password Updated: ${admin.email}`);
        return res.status(200).json({ message: "Password updated successfully." });
    }
    catch (error) {
        console.error("Error updating admin password:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.updateAdminPassword = updateAdminPassword;
const getAdminProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.user;
    if (!admin)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const user = yield user_model_1.default.findById(admin._id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found." });
        return res.status(200).json(user);
    }
    catch (error) {
        console.error("Error fetching admin profile:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.getAdminProfile = getAdminProfile;
const approveWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId } = req.params;
    const { action, note } = req.body; // "approve" or "reject", optional note
    const admin = req.user;
    if (!admin)
        return res.status(401).json({ message: "Unauthorized" });
    if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'." });
    }
    const tx = yield transaction_model_1.default.findById(transactionId).populate("user");
    if (!tx || tx.status !== "pending" || !tx.requiresAdminApproval) {
        return res.status(404).json({ message: "Invalid or already processed transaction." });
    }
    const user = tx.user;
    const wallet = yield userWallet_model_1.default.findOne({ user: tx.user._id });
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
        const recentWithdrawalsCount = yield transaction_model_1.default.countDocuments({
            user: user._id,
            type: "withdrawal",
            status: "confirmed",
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
        });
        const isFraudSuspected = tx.amount > FLAG_THRESHOLD_AMOUNT || recentWithdrawalsCount >= FLAG_THRESHOLD_COUNT;
        if (isFraudSuspected) {
            // Auto-flag user for fraud review
            user.fraudFlagged = true;
            yield user.save();
            // Log security event
            yield securityLog_model_1.default.create({
                user: user._id,
                action: "fraud_alert_triggered",
                status: "failure",
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
                details: `Withdrawal amount: ${tx.amount}, recent withdrawals in 24h: ${recentWithdrawalsCount}`,
            });
            const reason = "Suspicious withdrawal amount or frequency detected";
            const details = `Amount: ${tx.amount} USDT, Recent withdrawals in last 24h: ${recentWithdrawalsCount}, Flagged by admin: ${admin.email}`;
            // Send fraud alert emails to admins and superAdmins
            yield (0, sendMail_1.sendFraudAlertEmail)(user.email, user.username, reason, details);
            yield (0, sendMail_1.sendUserFraudNotificationEmail)(user.email, user.username, `Unusual withdrawal detected: amount ${tx.amount} USDT, recent withdrawals in 24h: ${recentWithdrawalsCount}`);
        }
        const currentTx = yield transaction_model_1.default.findById(transactionId);
        if (!currentTx || currentTx.status !== "pending") {
            return res.status(400).json({ message: "Transaction already processed." });
        }
        const result = yield (0, mockNowPayments_1.mockNowPaymentsWithdraw)({
            userId: user._id.toString(),
            address: tx.walletAddress,
            amount: tx.amount,
        });
        if (result.status !== "success") {
            return res.status(500).json({ message: "NowPayments withdrawal failed." });
        }
        wallet.balance -= total;
        wallet.totalWithdrawn += tx.amount;
        yield wallet.save();
        tx.status = "confirmed";
        tx.txId = result.txId;
        tx.method = "nowpayments";
        tx.processedAt = new Date();
        yield tx.save();
        yield (0, sendMail_1.sendWithdrawalStatusEmail)(user.email, "approved", tx.amount);
        yield (0, sendMail_1.sendWithdrawalApprovedEmail)({
            to: user.email,
            name: user.username,
            amount: tx.amount,
            address: tx.walletAddress,
            txId: result.txId,
        });
        yield adminActivityLog_model_1.default.create({
            admin: admin._id,
            action: "approve_withdrawal",
            target: user._id,
            metadata: { txId: transactionId, amount: tx.amount },
        });
        yield securityLog_model_1.default.create({
            user: user._id,
            action: "withdrawal_approved",
            status: "success",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            details: `Approved by admin ${admin._id}. Amount: ${tx.amount}, Fee: ${fee}, txId: ${result.txId}`,
        });
        return res.status(200).json({ message: "Withdrawal approved and processed.", txId: result.txId });
    }
    else {
        tx.status = "failed";
        tx.note = note || "Rejected by admin";
        tx.processedAt = new Date();
        yield tx.save();
        yield (0, sendMail_1.sendWithdrawalStatusEmail)(user.email, "rejected", tx.amount);
        yield adminActivityLog_model_1.default.create({
            admin: admin._id,
            action: "reject_withdrawal",
            target: user._id,
            metadata: { txId: transactionId, amount: tx.amount, note: note || "Rejected by admin" },
        });
        yield securityLog_model_1.default.create({
            user: user._id,
            action: "withdrawal_rejected",
            status: "failure",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            details: `Rejected by admin ${admin._id}. Amount: ${tx.amount}, Reason: ${note || "Admin rejected"}`,
        });
        const recentRejected = yield transaction_model_1.default.countDocuments({
            user: user._id,
            type: "withdrawal",
            status: "failed",
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });
        const flagged = recentRejected >= FLAG_THRESHOLD_COUNT || tx.amount >= FLAG_THRESHOLD_AMOUNT;
        if (flagged) {
            user.flaggedForReview = true;
            yield user.save();
            yield (0, sendMail_1.sendFraudAlertEmail)(user.email, // flaggedUserEmail
            user.username, // flaggedUsername
            "Multiple failed withdrawal attempts or suspicious amount", // reason
            `Attempts: ${recentRejected}, Amount: ${tx.amount}, Flagged By: ${admin.email}` // details string
            );
        }
        return res.status(200).json({ message: "Withdrawal rejected." });
    }
});
exports.approveWithdrawal = approveWithdrawal;
const getAllTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const transactions = yield transaction_model_1.default.find()
            .populate("user")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching transactions.", error });
    }
});
exports.getAllTransactions = getAllTransactions;
const getAllUsersWithBalances = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_model_1.default.find({ role: { $ne: "superAdmin" } });
        const wallets = yield userWallet_model_1.default.find();
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
                    kycVerified: user.kycVerified || false,
                },
                balance: (wallet === null || wallet === void 0 ? void 0 : wallet.balance) || 0,
                totalDeposited: (wallet === null || wallet === void 0 ? void 0 : wallet.totalDeposited) || 0,
                totalWithdrawn: (wallet === null || wallet === void 0 ? void 0 : wallet.totalWithdrawn) || 0,
            };
        });
        res.status(200).json(userData);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user balances.", error });
    }
});
exports.getAllUsersWithBalances = getAllUsersWithBalances;
const getFlaggedActivities = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suspiciousPatterns = yield transaction_model_1.default.aggregate([
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
        const flagged = yield transaction_model_1.default.find({ user: { $in: flaggedUsers } }).populate("user").sort({ createdAt: -1 });
        res.status(200).json(flagged);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching flagged activities.", error });
    }
});
exports.getFlaggedActivities = getFlaggedActivities;
const getAdminActivityLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.user;
    if (!admin || admin.role !== "superAdmin") {
        return res.status(403).json({ message: "Forbidden. Only super administrators can view logs." });
    }
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const logs = yield adminActivityLog_model_1.default.find()
            .populate("admin")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(200).json(logs);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching admin activity logs.", error });
    }
});
exports.getAdminActivityLogs = getAdminActivityLogs;
const reviewKYCSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.user;
    const { kycId } = req.params;
    const { action, note } = req.body; // 'approve' or 'reject', optional note
    if (!kycId)
        return res.status(400).json({ message: "KYC ID is required." });
    if (!admin || admin.role !== "admin") {
        return res.status(403).json({ message: "Forbidden. Only admins can review KYC submissions." });
    }
    try {
        const submission = yield kycSubmission_model_1.default.findById(kycId);
        if (!submission)
            return res.status(404).json({ message: "KYC submission not found." });
        if (submission.status !== "pending") {
            return res.status(400).json({ message: "KYC submission already reviewed." });
        }
        submission.status = action === "approve" ? "approved" : "rejected";
        submission.reviewedAt = new Date();
        yield submission.save();
        yield user_model_1.default.findByIdAndUpdate(submission.user, {
            kycVerified: action === "approve",
        });
        yield adminActivityLog_model_1.default.create({
            admin: admin._id,
            action: `${action}_kyc`,
            target: submission.user,
            metadata: { kycId, note: note || `${action}d without note` },
        });
        res.status(200).json({ message: `KYC ${action}d successfully.` });
    }
    catch (error) {
        res.status(500).json({ message: "Error reviewing KYC.", error });
    }
});
exports.reviewKYCSubmission = reviewKYCSubmission;
const adminLogout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });
        res.status(200).json({ message: "Admin logged out successfully." });
    }
    catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Failed to logout admin." });
    }
});
exports.adminLogout = adminLogout;
