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
exports.getStakesByUserId = exports.getBonusStakes = exports.getAllStakes = exports.stakeFunds = exports.confirmDepositWebhook = exports.initiateDeposit = void 0;
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const stake_model_1 = __importDefault(require("../models/stake.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const sendMail_1 = require("../utils/sendMail");
const initiateDeposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (!amount || amount < 10) {
            return res.status(400).json({ message: "Minimum deposit is 10 USDT." });
        }
        const response = (0, mockNowPayments_1.mockNowPaymentsCreateDeposit)({
            userId: user._id.toString(),
            currency: "usdt"
        });
        const tx = yield transaction_model_1.default.create({
            user: user._id,
            amount,
            type: "deposit",
            status: "pending",
            method: "nowpayments",
            walletAddress: response.address,
            reference: response.id,
        });
        return res.status(201).json({
            message: "Deposit initiated",
            invoiceId: response.id,
            walletAddress: response.address,
            amount: amount,
            txId: tx._id,
        });
    }
    catch (err) {
        console.error("initiateDeposit error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.initiateDeposit = initiateDeposit;
// Mock NowPayments webhook simulation
const confirmDepositWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { invoiceId, amount, status, txId } = req.body;
        if (status !== "confirmed") {
            return res.status(400).json({ message: "Not a confirmed deposit." });
        }
        const tx = yield transaction_model_1.default.findOne({ reference: invoiceId, type: "deposit" });
        if (!tx || tx.status === "confirmed") {
            return res.status(400).json({ message: "Transaction not found or already confirmed." });
        }
        // Update transaction
        tx.status = "confirmed";
        tx.txId = txId;
        tx.processedAt = new Date();
        yield tx.save();
        // Update wallet
        const wallet = yield userWallet_model_1.default.findOne({ user: tx.user });
        if (wallet) {
            wallet.balance += tx.amount;
            wallet.totalDeposited += tx.amount;
            yield wallet.save();
        }
        // Populate user and send email
        yield tx.populate("user");
        const populatedUser = tx.user;
        yield (0, sendMail_1.sendDepositSuccessEmail)({
            to: populatedUser.email,
            name: `${(_a = populatedUser.fname) !== null && _a !== void 0 ? _a : ""} ${(_b = populatedUser.lname) !== null && _b !== void 0 ? _b : ""}`.trim() || "User",
            amount: tx.amount,
            txId: tx.txId,
            method: ((_c = tx.method) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || "USDT",
        });
        return res.status(200).json({ message: "Deposit confirmed and wallet updated." });
    }
    catch (err) {
        console.error("confirmDepositWebhook error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
});
exports.confirmDepositWebhook = confirmDepositWebhook;
const stakeFunds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.userID;
    const { amount } = req.body;
    if (!userId || !amount || amount < 100) {
        return res.status(400).json({ message: "Minimum stake is 100 USDT." });
    }
    const wallet = yield userWallet_model_1.default.findOne({ user: userId });
    if (!wallet || wallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient wallet balance." });
    }
    // Deduct the stake amount
    wallet.balance -= amount;
    yield wallet.save();
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setDate(maturityDate.getDate() + 30);
    // Create stake record
    const stake = yield stake_model_1.default.create({
        user: userId,
        amount,
        isBonus: false,
        roiPaid: false,
        createdAt: now,
        maturityDate,
        roiAmount: amount
    });
    // Check if bonus is applicable (within 7 days of registration)
    const user = yield user_model_1.default.findById(userId);
    const registeredAt = user === null || user === void 0 ? void 0 : user.createdAt;
    const isNewUser = registeredAt && (now.getTime() - new Date(registeredAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
    if (isNewUser) {
        const bonusMaturity = new Date(now);
        bonusMaturity.setDate(bonusMaturity.getDate() + 30);
        yield stake_model_1.default.create({
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
});
exports.stakeFunds = stakeFunds;
const getAllStakes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userID = (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.userID;
    if (!userID)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const stakes = yield stake_model_1.default.find({ user: userID }).sort({ createdAt: -1 });
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
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch stakes" });
    }
});
exports.getAllStakes = getAllStakes;
const getBonusStakes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userID = (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.userID;
    if (!userID)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const stakes = yield stake_model_1.default.find({ user: userID, isBonus: true }).sort({ createdAt: -1 });
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
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch bonus stakes" });
    }
});
exports.getBonusStakes = getBonusStakes;
const getStakesByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { isBonus, roiPaid, matured } = req.query;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    const filter = { user: userId };
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
        const stakes = yield stake_model_1.default.find(filter).sort({ createdAt: -1 });
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
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch user's stakes" });
    }
});
exports.getStakesByUserId = getStakesByUserId;
