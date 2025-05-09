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
exports.requestMockWithdrawal = exports.requestWithdrawal = void 0;
require("./jobs/depositListener");
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const sendMail_1 = require("../utils/sendMail");
const fees_1 = require("../utils/fees");
const mockNowPayments_1 = require("../utils/mockNowPayments");
const requestWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, walletAddress } = req.body;
    const userID = (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.userID;
    if (!amount || !walletAddress) {
        return res.status(400).json({ message: "Amount and wallet address are required." });
    }
    const MIN_WITHDRAWAL = 10;
    if (amount < MIN_WITHDRAWAL) {
        return res.status(400).json({ message: `Minimum withdrawal is ${MIN_WITHDRAWAL} USDT.` });
    }
    const wallet = yield userWallet_model_1.default.findOne({ user: userID });
    if (!wallet) {
        return res.status(404).json({ message: "Wallet not found." });
    }
    const profit = wallet.balance - wallet.totalDeposited;
    const fee = (0, fees_1.calculateWithdrawalFee)(amount);
    const total = amount;
    const netAmount = Number((amount - fee).toFixed(2));
    if (total > profit) {
        return res.status(400).json({ message: "Insufficient withdrawable profit." });
    }
    const requiresApproval = amount >= 1000;
    const tx = new transaction_model_1.default({
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
    yield tx.save();
    if (requiresApproval) {
        yield (0, sendMail_1.sendWithdrawalRequestEmail)(userID, amount);
    }
    else {
        wallet.balance -= amount;
        wallet.totalWithdrawn += amount;
        yield wallet.save();
    }
    res.status(200).json({
        message: requiresApproval ? "Withdrawal pending admin approval." : "Withdrawal processed.",
        transactionID: tx._id,
        netAmount,
    });
});
exports.requestWithdrawal = requestWithdrawal;
const requestMockWithdrawal = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, address, amount } = req.body;
        const response = yield (0, mockNowPayments_1.mockNowPaymentsWithdraw)({ userId, address, amount });
        res.status(200).json({ status: "pending", txId: response.txId });
    }
    catch (error) {
        next(error);
    }
});
exports.requestMockWithdrawal = requestMockWithdrawal;
