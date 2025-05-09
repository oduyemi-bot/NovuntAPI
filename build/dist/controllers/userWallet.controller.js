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
exports.getUserWalletByUserID = exports.getUserWallet = exports.getAllWallets = void 0;
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const getAllWallets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wallets = yield userWallet_model_1.default.find().populate("user", "email username");
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
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch wallets." });
    }
});
exports.getAllWallets = getAllWallets;
const getUserWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userID = (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.userID;
    if (!userID) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const wallet = yield userWallet_model_1.default.findOne({ user: userID });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }
        res.status(200).json(wallet);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch wallet" });
    }
});
exports.getUserWallet = getUserWallet;
const getUserWalletByUserID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }
    try {
        const wallet = yield userWallet_model_1.default.findOne({ user: id }).populate("user", "email username");
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
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch user wallet." });
    }
});
exports.getUserWalletByUserID = getUserWalletByUserID;
