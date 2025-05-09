import mongoose, { Schema, Document } from "mongoose";

export interface ISecurityLog extends Document {
  user: mongoose.Types.ObjectId;
  action: string;
  status: "success" | "failure";
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  createdAt: Date;
}

const SecurityLogSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // e.g. "login", "2fa-verify", "withdrawal-request"
  status: { type: String, enum: ["success", "failure"], required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const SecurityLog = mongoose.model<ISecurityLog>("SecurityLog", SecurityLogSchema);
export default SecurityLog;
