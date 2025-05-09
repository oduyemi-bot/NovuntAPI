import User from "../models/user.model";
import Stake from "../models/stake.model";

export const calculateRedistributionBonus = async (totalPoolAmount: number) => {
  try {
    // Fetch all active users with their stakes
    const users = await User.find({ isActive: true });

    const totalStake = users.reduce(async (acc, user) => {
      const stake = await Stake.findOne({ user: user._id });
      if (stake) {
        return acc + stake.amount;
      }
      return acc;
    }, 0);

    // Calculate the amount each user will receive from the redistribution pool
    const redistributionPool = totalPoolAmount * 0.025; // 2.5% pool

    const redistributionBonuses = [];

    for (const user of users) {
      const stake = await Stake.findOne({ user: user._id });
      if (!stake || stake.amount < 10) {
        continue; // Skip users with no valid stake
      }

      const userShare = stake.amount / totalStake; // User’s share of the total stake
      const userBonus = redistributionPool * userShare;

      redistributionBonuses.push({
        user: user._id,
        bonusAmount: userBonus,
      });

      // Update user balance with the bonus
      await User.findByIdAndUpdate(user._id, {
        $inc: { referralBonusBalance: userBonus },
      });
    }

    console.log("Redistribution bonuses applied successfully.");
    return redistributionBonuses;
  } catch (error) {
    console.error("Error calculating redistribution bonuses:", error);
  }
};


