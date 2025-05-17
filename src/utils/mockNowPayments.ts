import mockBlockchainEmitter from "./mockBlockchainEmitter";
import { v4 as uuidv4 } from "uuid";


interface MockDeposit {
  userId: string;
  amount: number;
  txId: string;
}

interface MockWithdrawalParams {
  userId: string; // Now required
  address: unknown;
  amount: number;
  currency?: string;
  txId?: string;
}

interface MockWithdrawalResponse {
  status: "success";
  txId: string;
  timestamp: string;
}

// --- Mock Wallet Address Generator ---
export const mockGenerateWalletAddress = (userId: string): string => {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `usdt_mock_${userId}_${randomSuffix}`;
};

// --- Mock Deposit Queue ---
const pendingMockDeposits: MockDeposit[] = [
  { userId: "6810d6a7380c8efae91eac5d", amount: 100, txId: `mocktx_${uuidv4()}` },
];


// --- Check for Confirmed Mock Deposits ---
export const checkMockNowPaymentsDeposits = async (): Promise<MockDeposit[]> => {
  const confirmed = pendingMockDeposits.splice(0, 1); // simulate 1 per poll
  return confirmed;
};

// --- Simulated Deposit Emitter ---
export function simulateDepositConfirmation(deposit: MockDeposit) {
  mockBlockchainEmitter.emit("depositConfirmed", deposit);
}

// --- Mock Withdrawal Processor ---
export const mockNowPaymentsWithdraw = async ({
  userId,
  address,
  amount,
  currency = "USDT",
}: MockWithdrawalParams): Promise<MockWithdrawalResponse> => {
  if (typeof address !== "string" || typeof amount !== "number") {
    throw new Error("Invalid parameters for withdrawal.");
  }

  console.log(`[MOCK] Withdrawing ${amount} ${currency} to ${address}...`);
  await new Promise((res) => setTimeout(res, 1000)); // simulate API delay

  const txId = `mock_withdraw_${uuidv4()}`;
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
  mockBlockchainEmitter.emit("withdrawalConfirmed", withdrawalData);

  return {
    status: "success",
    txId,
    timestamp,
  };
};
