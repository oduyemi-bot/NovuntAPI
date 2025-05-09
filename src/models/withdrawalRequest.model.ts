import mongoose, { Schema, Document } from "mongoose";

export interface IWithdrawalRequest extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "approved" | "rejected";
  txId?: string;
  requestedAt: Date;
  processedAt?: Date;
  reason?: string; // if rejected
}

const WithdrawalRequestSchema: Schema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  txId: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  reason: { type: String }, // Optional rejection reason
});

export default mongoose.model<IWithdrawalRequest>("WithdrawalRequest", WithdrawalRequestSchema);
