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
exports.approveWithdrawal = void 0;
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const sendMail_1 = require("../utils/sendMail");
const WITHDRAWAL_FEE_PERCENTAGE = 3; // 3%
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
        // Reject flow
        tx.status = "failed";
        tx.note = "Rejected by admin";
        tx.processedAt = new Date();
        yield tx.save();
        yield (0, sendMail_1.sendWithdrawalStatusEmail)(user.email, "rejected", tx.amount);
        return res.status(200).json({ message: "Withdrawal rejected." });
    }
});
exports.approveWithdrawal = approveWithdrawal;
