import mockBlockchainEmitter from "./mockBlockchainEmitter";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";

mockBlockchainEmitter.on("depositConfirmed", async (deposit) => {
  try {
    const { userId, amount, txId } = deposit;

    await UserWallet.findOneAndUpdate(
      { user: userId },
      { $inc: { balance: amount, totalDeposited: amount } }
    );

    await Transaction.create({
      user: userId,
      type: "deposit",
      amount,
      status: "confirmed",
      txId,
      timestamp: new Date(),
    });

    console.log(`[MOCK LISTENER] Deposit confirmed for user ${userId}: ${amount} USDT`);
  } catch (err) {
    console.error("[MOCK LISTENER] Error handling mock deposit:", err);
  }
});
