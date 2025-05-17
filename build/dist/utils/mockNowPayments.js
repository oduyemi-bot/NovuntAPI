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
exports.mockNowPaymentsWithdraw = exports.checkMockNowPaymentsDeposits = exports.mockGenerateWalletAddress = void 0;
exports.simulateDepositConfirmation = simulateDepositConfirmation;
const mockBlockchainEmitter_1 = __importDefault(require("./mockBlockchainEmitter"));
const uuid_1 = require("uuid");
// --- Mock Wallet Address Generator ---
const mockGenerateWalletAddress = (userId) => {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    return `usdt_mock_${userId}_${randomSuffix}`;
};
exports.mockGenerateWalletAddress = mockGenerateWalletAddress;
// --- Mock Deposit Queue ---
const pendingMockDeposits = [
    { userId: "6810d6a7380c8efae91eac5d", amount: 100, txId: `mocktx_${(0, uuid_1.v4)()}` },
];
// --- Check for Confirmed Mock Deposits ---
const checkMockNowPaymentsDeposits = () => __awaiter(void 0, void 0, void 0, function* () {
    const confirmed = pendingMockDeposits.splice(0, 1); // simulate 1 per poll
    return confirmed;
});
exports.checkMockNowPaymentsDeposits = checkMockNowPaymentsDeposits;
// --- Simulated Deposit Emitter ---
function simulateDepositConfirmation(deposit) {
    mockBlockchainEmitter_1.default.emit("depositConfirmed", deposit);
}
// --- Mock Withdrawal Processor ---
const mockNowPaymentsWithdraw = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, address, amount, currency = "USDT", }) {
    if (typeof address !== "string" || typeof amount !== "number") {
        throw new Error("Invalid parameters for withdrawal.");
    }
    console.log(`[MOCK] Withdrawing ${amount} ${currency} to ${address}...`);
    yield new Promise((res) => setTimeout(res, 1000)); // simulate API delay
    const txId = `mock_withdraw_${(0, uuid_1.v4)()}`;
    const timestamp = new Date().toISOString();
    const withdrawalData = {
        userId,
        amount,
        currency,
        txId,
        address,
        timestamp,
    };
    // Emit the confirmation event
    mockBlockchainEmitter_1.default.emit("withdrawalConfirmed", withdrawalData);
    return {
        status: "success",
        txId,
        timestamp,
    };
});
exports.mockNowPaymentsWithdraw = mockNowPaymentsWithdraw;
