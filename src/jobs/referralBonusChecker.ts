// jobs/referralBonusChecker.ts
import cron from "node-cron";
import ReferralBonus from "../models/referralBonus.model";
import Stake from "../models/stake.model";
import { sendDepletionWarningEmail } from "../utils/sendMail";

cron.schedule("0 0 * * *", async () => {
  const bonuses = await ReferralBonus.find({ stakeActivatedByDeadline: false, fullyDepleted: false });

  for (const bonus of bonuses) {
    const deadline = new Date(bonus.createdAt);
    deadline.setDate(deadline.getDate() + 30);

    const day27 = new Date(bonus.createdAt);
    day27.setDate(day27.getDate() + 27);

    const now = new Date();

    // Check if staker activated a goal
    const stakeExists = await Stake.exists({ user: bonus.user, amount: { $gte: 10 } });

    if (stakeExists) {
      bonus.stakeActivatedByDeadline = true;
      await bonus.save();
      continue;
    }

    // Day 27 warning
    if (now.toDateString() === day27.toDateString()) {
      await sendDepletionWarningEmail(bonus.user, bonus.amount);
      console.log(`Depletion warning sent to user ${bonus.user} for bonus amount ${bonus.amount} USDT`);
    }

    // Start depletion on day 28
    if (now >= deadline) {
      if (!bonus.depletionStartedAt) {
        bonus.depletionStartedAt = now;
        bonus.depletedPercent = 1;
      } else {
        const daysDepleting = Math.floor((now.getTime() - bonus.depletionStartedAt.getTime()) / (1000 * 60 * 60 * 24));
        bonus.depletedPercent = Math.min(100, daysDepleting);
        bonus.fullyDepleted = bonus.depletedPercent >= 100;
      }

      await bonus.save();
    }
  }
});
