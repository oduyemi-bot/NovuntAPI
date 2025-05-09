import User from "../models/user.model";
import Stake from "../models/stake.model";

export const calculateRedistributionBonus = async (totalPoolAmount: number) => {
  try {
    // Fetch all active users
    const users = await User.find({ isActive: true });

    let totalStake = 0;
    const userStakes: { userId: string; amount: number }[] = [];

    // Calculate total stake and store individual stake amounts
    for (const user of users) {
      const stake = await Stake.findOne({ user: user._id });
      if (stake && stake.amount >= 10) {
        totalStake += stake.amount;
        userStakes.push({ userId: user._id.toString(), amount: stake.amount });
      }
    }

    // Calculate the 2.5% redistribution pool
    const redistributionPool = totalPoolAmount * 0.025;

    const redistributionBonuses = [];

    for (const stakeInfo of userStakes) {
      const userShare = stakeInfo.amount / totalStake;
      const userBonus = redistributionPool * userShare;

      redistributionBonuses.push({
        user: stakeInfo.userId,
        bonusAmount: userBonus,
      });

      // Update user bonus balance
      await User.findByIdAndUpdate(stakeInfo.userId, {
        $inc: { referralBonusBalance: userBonus },
      });
    }

    console.log("Redistribution bonuses applied successfully.");
    return redistributionBonuses;
  } catch (error) {
    console.error("Error calculating redistribution bonuses:", error);
  }
};
