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
exports.getFlaggedActivities = exports.getAllUsersWithBalances = exports.getAllTransactions = exports.approveWithdrawal = exports.adminLogin = void 0;
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const sendMail_1 = require("../utils/sendMail");
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%
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
const approveWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId } = req.params;
    const { action } = req.body; // "approve" or "reject"
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
        return res.status(200).json({ message: "Withdrawal approved and processed.", txId: result.txId });
    }
    else {
        tx.status = "failed";
        tx.note = "Rejected by admin";
        tx.processedAt = new Date();
        yield tx.save();
        yield (0, sendMail_1.sendWithdrawalStatusEmail)(user.email, "rejected", tx.amount);
        return res.status(200).json({ message: "Withdrawal rejected." });
    }
});
exports.approveWithdrawal = approveWithdrawal;
const getAllTransactions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield transaction_model_1.default.find().populate("user").sort({ createdAt: -1 });
        res.status(200).json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching transactions.", error });
    }
});
exports.getAllTransactions = getAllTransactions;
const getAllUsersWithBalances = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_model_1.default.find();
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
        const flagged = yield transaction_model_1.default.find({ flagged: true }).populate("user").sort({ createdAt: -1 });
        res.status(200).json(flagged);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching flagged activities.", error });
    }
});
exports.getFlaggedActivities = getFlaggedActivities;
