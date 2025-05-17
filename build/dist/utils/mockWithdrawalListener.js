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
const mockBlockchainEmitter_1 = __importDefault(require("./mockBlockchainEmitter"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
mockBlockchainEmitter_1.default.on("withdrawalConfirmed", (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, amount, txId, timestamp } = data;
    try {
        const existingTx = yield transaction_model_1.default.findOne({ user: userId, txId });
        if (!existingTx) {
            console.warn(`[MOCK LISTENER] No matching transaction found for txId ${txId}`);
            return;
        }
        existingTx.status = "confirmed";
        existingTx.timestamp = new Date(timestamp);
        yield existingTx.save();
        console.log(`[MOCK LISTENER] Withdrawal confirmed for user ${userId}: ${amount} USDT`);
    }
    catch (err) {
        console.error("[MOCK LISTENER] Error handling mock withdrawal:", err);
    }
}));
