import mongoose, { Document, Schema } from "mongoose";

export interface ITempUser extends Document {
  fname: string;
  lname: string;
  email: string;
  username: string;
  password: string;
  secret: string;
  verificationToken: string;  // Changed from 'token' to 'verificationToken'
  tokenExpiration: number;    // Added expiration time
  createdAt: Date;
}

const TempUserSchema = new Schema<ITempUser>({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  secret: { type: String, required: true },
  verificationToken: { type: String, required: true },
  tokenExpiration: { type: Number, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800, // TTL: 30 minutes (in seconds)
  },
});

export default mongoose.model<ITempUser>("TempUser", TempUserSchema);
