import cron from "node-cron";
import Stake from "../models/stake.model";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";

cron.schedule("* * * * *", async () => {
  const now = new Date();

  // Find matured stakes that haven't been paid
  const maturedStakes = await Stake.find({
    maturityDate: { $lte: now },
    roiPaid: false
  });

  for (const stake of maturedStakes) {
    const wallet = await UserWallet.findOne({ user: stake.user });
    if (!wallet) continue;

    // Add ROI to wallet balance
    wallet.balance += stake.roiAmount;
    await wallet.save();

    // Mark ROI as paid
    stake.roiPaid = true;
    await stake.save();

    // Log transaction
    await Transaction.create({
      user: stake.user,
      type: "bonus",
      amount: stake.roiAmount,
      status: "confirmed",
      txId: `roi-${stake._id}-${Date.now()}`,
      method: stake.isBonus ? "bonus" : "manual", // label bonus origin if needed
      note: stake.isBonus ? "Bonus stake ROI" : "Stake ROI",
      timestamp: new Date()
    });
  }
});
