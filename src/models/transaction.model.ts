import mongoose, { Document, Schema } from "mongoose";


export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: "deposit" | "withdrawal" | "transfer" | "bonus";
  amount: number;
  reference: string; // Unique reference for the transaction
  status: "pending" | "confirmed" | "failed";
  txId: string; 
  fromUser?: mongoose.Types.ObjectId;
  toUser?: mongoose.Types.ObjectId;
  fee?: number;
  netAmount?: number;
  requiresAdminApproval?: boolean;
  processedAt?: Date;
  walletAddress?: string;
  method?: "nowpayments" | "internal" | "bonus" | "manual";
  note?: string;
  timestamp: Date;
}

const TransactionSchema: Schema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["deposit", "withdrawal", "transfer", "bonus"], required: true },
    amount: { type: Number, required: true },
    reference: { type: String, unique: true, required: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], required: true },
    txId: { type: String, unique: true, sparse: true }, // <-- Changed here
    fromUser: { type: Schema.Types.ObjectId, ref: "User" },
    toUser: { type: Schema.Types.ObjectId, ref: "User" },
    method: { type: String, enum: ["nowpayments", "internal", "bonus", "manual"] },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
    walletAddress: { type: String },
    fee: { type: Number },
    netAmount: { type: Number },
    requiresAdminApproval: { type: Boolean, default: false },
    processedAt: { type: Date },
  }
);

TransactionSchema.index({ reference: 1 });
TransactionSchema.index({ user: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ timestamp: -1 });

const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
