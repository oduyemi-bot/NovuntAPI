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
const node_cron_1 = __importDefault(require("node-cron"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const transaction_model_1 = __importDefault(require("../models/transaction.model"));
node_cron_1.default.schedule("* * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const pendingDeposits = yield (0, mockNowPayments_1.checkMockNowPaymentsDeposits)();
    for (const deposit of pendingDeposits) {
        yield userWallet_model_1.default.findOneAndUpdate({ user: deposit.userId }, { $inc: { balance: deposit.amount, totalDeposited: deposit.amount } });
        yield transaction_model_1.default.create({
            user: deposit.userId,
            type: "deposit",
            amount: deposit.amount,
            status: "confirmed",
            txId: deposit.txId,
            timestamp: new Date(),
        });
    }
}));
