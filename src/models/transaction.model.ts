import mongoose, { Document, Schema } from "mongoose";


export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: "deposit" | "withdrawal" | "transfer" | "bonus";
  amount: number;
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
    status: { type: String, enum: ["pending", "confirmed", "failed"], required: true },
    txId: { type: String, required: true, unique: true },
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


const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
