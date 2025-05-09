import mongoose, { Document } from "mongoose";


export interface IBonusHistory extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    amount: number;
    bonusType: string;
    source: string; // e.g., "Finance Titan Pool", "Level 2 Restake"
    createdAt: Date;
}
const bonusHistorySchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true
    },
    bonusType: {
      type: String,
      required: true,
      enum: ['Deposit Bonus', 'Referral Bonus', 'Stake Bonus', 'Level Bonus', 'Finance Titan Pool', 'Level 2 Restake']
    },
    source: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
});     


const BonusHistory = mongoose.model<IBonusHistory>('DepositBonus', bonusHistorySchema);
export default BonusHistory;
  
