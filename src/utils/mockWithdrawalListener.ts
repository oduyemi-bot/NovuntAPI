import mockBlockchainEmitter from "./mockBlockchainEmitter";
import Transaction from "../models/transaction.model";

mockBlockchainEmitter.on("withdrawalConfirmed", async (data) => {
  const { userId, amount, txId, timestamp } = data;

  try {
    const existingTx = await Transaction.findOne({ user: userId, txId });
    if (!existingTx) {
      console.warn(`[MOCK LISTENER] No matching transaction found for txId ${txId}`);
      return;
    }

    existingTx.status = "confirmed";
    existingTx.timestamp = new Date(timestamp);
    await existingTx.save();

    console.log(`[MOCK LISTENER] Withdrawal confirmed for user ${userId}: ${amount} USDT`);
  } catch (err) {
    console.error("[MOCK LISTENER] Error handling mock withdrawal:", err);
  }
});

