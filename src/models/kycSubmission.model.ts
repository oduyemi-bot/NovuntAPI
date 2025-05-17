import mongoose, { Schema, Document } from "mongoose";

export interface IKYCSubmission extends Document {
  user: mongoose.Types.ObjectId;
  fullName: string;
  documentType: string;
  documentNumber: string;
  documentImageUrl: string;
  selfieImageUrl: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  reviewedAt?: Date;
}

const kycSubmissionSchema = new Schema<IKYCSubmission>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  documentType: { type: String, required: true },
  documentNumber: { type: String, required: true },
  documentImageUrl: { type: String, required: true },
  selfieImageUrl: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
});

export default mongoose.model<IKYCSubmission>("KYCSubmission", kycSubmissionSchema);
