import mongoose, { Document } from "mongoose";


export interface IDepositBonus extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    bonusAmount: number;
    depositId: mongoose.Types.ObjectId; 
    grantedAt: Date;
}
   
const depositBonusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bonusAmount: {
    type: Number,
    required: true
  },
  depositId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction', 
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  }
});

const DepositBonus = mongoose.model<IDepositBonus>('DepositBonus', depositBonusSchema);
export default DepositBonus;