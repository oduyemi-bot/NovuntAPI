import cron from "node-cron";
import { checkMockNowPaymentsDeposits } from "../utils/mockNowPayments";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";

cron.schedule("* * * * *", async () => {
  const pendingDeposits = await checkMockNowPaymentsDeposits();
  for (const deposit of pendingDeposits) {
    await UserWallet.findOneAndUpdate(
      { user: deposit.userId },
      { $inc: { balance: deposit.amount, totalDeposited: deposit.amount } }
    );

    await Transaction.create({
      user: deposit.userId,
      type: "deposit",
      amount: deposit.amount,
      status: "confirmed",
      txId: deposit.txId,
      timestamp: new Date(),
    });
  }
});
