import mongoose, { Document, Schema } from "mongoose";

export interface ITempUser extends Document {
  fname: string;
  lname: string;
  email: string;
  username: string;
  secret: string;
  createdAt: Date;
}

const TempUserSchema = new Schema<ITempUser>({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  secret: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});

export default mongoose.model<ITempUser>("TempUser", TempUserSchema);
