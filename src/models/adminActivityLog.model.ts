import mongoose, {Document} from "mongoose";

export interface IActivityLog extends Document {
    _id: mongoose.Types.ObjectId;
    admin: mongoose.Types.ObjectId;
    action: string;
    target: mongoose.Types.ObjectId;
    metadata: object;
    createdAt: Date;
}

const adminActivityLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("AdminActivityLog", adminActivityLogSchema);
