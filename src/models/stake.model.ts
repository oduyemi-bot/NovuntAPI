import mongoose, { Document, Schema } from "mongoose";

export interface IStake extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  isBonus: boolean;
  roiPaid: boolean;
  createdAt: Date;
  maturityDate: Date;
  roiAmount: number;
}

const stakeSchema = new Schema<IStake>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  isBonus: { type: Boolean, default: false },
  roiPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  maturityDate: { type: Date, required: true },
  roiAmount: { type: Number, required: true }
});

const Stake = mongoose.model<IStake>("Stake", stakeSchema);
export default Stake;
