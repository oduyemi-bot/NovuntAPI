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
exports.transferUSDT = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
const securityLog_model_1 = __importDefault(require("../models/securityLog.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const uuid_1 = require("uuid");
const transporter_1 = require("../utils/transporter");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transferUSDT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderUsername, recipientUsername, amount } = req.body;
    if (!senderUsername || !recipientUsername || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid input." });
    }
    if (senderUsername === recipientUsername) {
        return res.status(400).json({ success: false, message: "Sender and recipient cannot be the same." });
    }
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const sender = yield user_model_1.default.findOne({ username: senderUsername }).session(session);
        const recipient = yield user_model_1.default.findOne({ username: recipientUsername }).session(session);
        const senderWallet = yield userWallet_model_1.default.findOne({ user: sender === null || sender === void 0 ? void 0 : sender._id }).session(session);
        const recipientWallet = yield userWallet_model_1.default.findOne({ user: recipient === null || recipient === void 0 ? void 0 : recipient._id }).session(session);
        if (!sender || !recipient || !senderWallet || !recipientWallet) {
            throw new Error("Sender or recipient not found.");
        }
        if (senderWallet.balance < amount) {
            throw new Error("Insufficient balance.");
        }
        // Update balances
        senderWallet.balance -= amount;
        recipientWallet.balance += amount;
        yield senderWallet.save({ session });
        yield recipientWallet.save({ session });
        const txId = (0, uuid_1.v4)();
        // Create transaction
        const transaction = new transaction_model_1.default({
            user: sender._id,
            type: "transfer",
            amount,
            status: "confirmed",
            txId,
            fromUser: sender._id,
            toUser: recipient._id,
            method: "internal",
            netAmount: amount,
            timestamp: new Date(),
        });
        yield transaction.save({ session });
        // Log for sender
        yield securityLog_model_1.default.create([{
                user: sender._id,
                action: "transfer",
                status: "success",
                details: `Sent ${amount} USDT to ${recipient.username}`,
                createdAt: new Date(),
            }], { session });
        // Log for recipient
        yield securityLog_model_1.default.create([{
                user: recipient._id,
                action: "receive-transfer",
                status: "success",
                details: `Received ${amount} USDT from ${sender.username}`,
                createdAt: new Date(),
            }], { session });
        yield session.commitTransaction();
        session.endSession();
        // 🔔 Send email notifications (after transaction is successful)
        const senderEmailOptions = {
            from: `"Novunt Wallet" <${process.env.MAIL_USER}>`,
            to: sender.email,
            subject: "USDT Transfer Successful",
            html: `
        <p>Hi ${sender.fname},</p>
        <p>Your transfer of <strong>${amount} USDT</strong> to <strong>${recipient.username}</strong> was successful.</p>
        <p>Transaction ID: <strong>${txId}</strong></p>
        <p>If you did not authorize this, please contact support immediately.</p>
        <br/>
        <p>– Novunt Team</p>
      `,
        };
        const recipientEmailOptions = {
            from: `"Novunt Wallet" <${process.env.MAIL_USER}>`,
            to: recipient.email,
            subject: "You've Received USDT",
            html: `
        <p>Hi ${recipient.fname},</p>
        <p>You have received <strong>${amount} USDT</strong> from <strong>${sender.username}</strong>.</p>
        <p>Transaction ID: <strong>${txId}</strong></p>
        <p>Log in to your wallet to view your updated balance.</p>
        <br/>
        <p>– Novunt Team</p>
      `,
        };
        // Send emails (fire and forget)
        transporter_1.transporter.sendMail(senderEmailOptions).catch(console.error);
        transporter_1.transporter.sendMail(recipientEmailOptions).catch(console.error);
        return res.status(200).json({ success: true, message: "Transfer successful", txId });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Transfer failed:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.transferUSDT = transferUSDT;
