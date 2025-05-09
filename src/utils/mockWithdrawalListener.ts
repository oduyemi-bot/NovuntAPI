import mockBlockchainEmitter from "./mockBlockchainEmitter";
import Transaction from "../models/transaction.model";

mockBlockchainEmitter.on("withdrawalConfirmed", async (data) => {
  const { userId, amount, txId, timestamp } = data;

  try {
    await Transaction.create({
      user: userId,
      type: "withdrawal",
      amount,
      status: "confirmed",
      txId,
      timestamp: new Date(timestamp),
    });

    console.log(`[MOCK LISTENER] Withdrawal confirmed for user ${userId}: ${amount} USDT`);
  } catch (err) {
    console.error("[MOCK LISTENER] Error handling mock withdrawal:", err);
  }
});
