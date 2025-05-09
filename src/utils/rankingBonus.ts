import User from "../models/user.model";
import Stake from "../models/stake.model";

type Rank =
  | "Associate Staker"
  | "Principal Strategist"
  | "Elite Capitalist"
  | "Wealth Architect"
  | "Finance Titan";

const rankBonusMap: Record<Rank, number> = {
  "Associate Staker": 0.05,
  "Principal Strategist": 0.1,
  "Elite Capitalist": 0.15,
  "Wealth Architect": 0.2,
  "Finance Titan": 0.25,
};

export const calculateRankingBonus = async () => {
  try {
    const users = await User.find({ isActive: true }).populate("directDownlines");

    const bonuses = [];

    for (const user of users) {
      const userStake = await Stake.findOne({ user: user._id });
      if (!userStake || userStake.amount < 10) {
        continue; // Skip users without valid stake
      }

      const rank = user.rank as Rank;
      const bonusPercentage = rankBonusMap[rank] ?? 0; // safer with nullish coalescing

      const bonusAmount = userStake.amount * bonusPercentage;

      bonuses.push({
        user: user._id,
        bonusAmount,
        rank,
      });

      await User.findByIdAndUpdate(user._id, {
        $inc: { referralBonusBalance: bonusAmount },
      });
    }

    console.log("Ranking bonuses calculated and applied successfully.");
    return bonuses;
  } catch (error) {
    console.error("Error calculating ranking bonuses:", error);
  }
};
