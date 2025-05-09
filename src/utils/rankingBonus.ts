import User from "../models/user.model";
import Stake from "../models/stake.model";

export const calculateRankingBonus = async () => {
  try {
    // Define rank bonus percentages
    const rankBonusMap = {
      "Associate Staker": 0.05, // 5% for "Associate Staker"
      "Principal Strategist": 0.1, // 10% for "Principal Strategist"
      "Elite Capitalist": 0.15, // 15% for "Elite Capitalist"
      "Wealth Architect": 0.2, // 20% for "Wealth Architect"
      "Finance Titan": 0.25, // 25% for "Finance Titan"
    };

    // Fetch all active users with their ranks and stakes
    const users = await User.find({ isActive: true }).populate("directDownlines");

    const bonuses = [];

    for (const user of users) {
      const userStake = await Stake.findOne({ user: user._id });
      if (!userStake || userStake.amount < 10) {
        continue; // Skip users without valid stake
      }

      const rank = user.rank;
      const bonusPercentage = rankBonusMap[rank] || 0; // Default to 0 if rank is undefined

      const bonusAmount = userStake.amount * bonusPercentage;
      
      // Store the bonus calculation
      bonuses.push({
        user: user._id,
        bonusAmount,
        rank,
      });

      // Update user balance with the bonus
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
