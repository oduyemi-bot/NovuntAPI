import Stake from "../models/stake.model";
import User, { IUser } from "../models/user.model";
import ReferralBonus from "../models/referralBonus.model";
import { Document, Types } from "mongoose";

export const createReferralBonus = async (user: any, stakeAmount: number) => {
    try {
      const referrer = await User.findById(user.referrer);
      if (!referrer) {
        console.log("No referrer found for user.");
        return;
      }
  
      const referrerStake = await Stake.findOne({
        user: referrer._id,
        amount: { $gte: 10 },
      });
  
      if (!referrerStake) {
        console.log("Referrer does not have a valid active stake.");
        return;
      }
  
      let currentUser: (Document<unknown, {}, IUser> & IUser & Required<{ _id: Types.ObjectId }> & { __v: number }) | null = referrer;
      let currentLevel = 1;
      let bonusPercentage = 5; // Start with 5% for level 1
  
      while (currentUser && currentLevel <= 5) {
        const stake = await Stake.findOne({
          user: currentUser._id,
          amount: { $gte: 10 },
        });
  
        if (!stake) {
          break;
        }
  
        const bonusAmount = (stakeAmount * bonusPercentage) / 100;
        const referralBonus = new ReferralBonus({
          fromUser: currentUser._id, // Who referred
          user: user._id, // Who is being referred
          level: currentLevel,
          bonusAmount: bonusAmount,
          stakeActivatedByDeadline: false, // Will be activated later
          fullyDepleted: false,
        });
  
        await referralBonus.save();
        await User.findByIdAndUpdate(currentUser._id, {
          $inc: { referralBonusBalance: bonusAmount }
        });
  
        // Prepare for next level if applicable
        currentUser = currentUser.referrer ? await User.findById(currentUser.referrer) : null;
        currentLevel += 1;
        const bonusTiers = [5, 2, 1.5, 1, 0.5];
        bonusPercentage = bonusTiers[currentLevel] || 0;
  
      }
  
      console.log("Referral bonuses created successfully.");
    } catch (error) {
      console.error("Error creating referral bonuses:", error);
    }
  };
  