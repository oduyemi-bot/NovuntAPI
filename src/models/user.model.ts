import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { sendAdminWelcomeEmail } from "../utils/sendMail";
import { logAudit } from "../utils/logger";
import dotenv from "dotenv";


dotenv.config();

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_$!%*?&])[A-Za-z\d@_$!%*?&]{8,}$/;

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fname: string;
  lname: string;
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  twoFAEnabled: boolean;
  twoFASecret: string;
  role: "admin" | "superAdmin" | "user";
  referrer?: mongoose.Types.ObjectId;
  referralBonusBalance?: number;
  rank: string;
  directDownlines: mongoose.Types.ObjectId[]; 
  teamStake: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  resetSecret?: string;
  resetToken?: string;
  resetTokenExpiration?: number;
}

const userSchema = new Schema<IUser>(
  {
    fname: { 
        type: String, 
        required: [true, "First name is required"] 
    },

    lname: { 
        type: String, 
        required: [true, "Last name is required"] 
    },

    username: { 
        type: String, 
        unique: true, 
        required: true,
        trim: true,
        lowercase: true, 
    },

    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: "Invalid email format",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    profilePicture: {
      type: String
    },

    twoFAEnabled: { 
        type: Boolean, 
        default: false 
    },

    twoFASecret: { 
        type: String // For Google Authenticator
    },

    role: { 
        type: String, 
        enum: ["admin", "superAdmin", "user"], 
        default: "user" 
    },

    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },    

    referralBonusBalance: {
      type: Number,
      default: 0,
    },    

    rank: {
      type: String,
      enum: ["None", "Associate Staker", "Principal Strategist", "Elite Capitalist", "Wealth Architect", "Finance Titan"],
      default: "None",
    },

    directDownlines: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],

    teamStake: { 
      type: Number, default: 0 
    },

    isActive: { 
        type: Boolean, 
        default: true 
    },
    resetSecret: { type: String, select: false },
    resetToken: { type: String, select: false },
    resetTokenExpiration: { type: Number, select: false },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
async function addSuperAdmins() {
  const superAdminUsers = [
    {
      fname: "Opeyemi",
      lname: "Oduyemi",
      email: "hello@yemi.dev",
      username: "oduyemi",
      phone: "+2348166336187",
      password: process.env.OPEYEMI,
      role: "superAdmin",
    },
    // Add more if needed
  ];

  for (const user of superAdminUsers) {
    try {
      const exists = await User.findOne({
        $or: [{ email: user.email }, { username: user.username }],
      });

      if (exists) {
        console.log(`⚠️ SuperAdmin ${user.email} already exists. Skipping...`);
        continue;
      }

      if (!user.password) {
        throw new Error(`Missing password for ${user.email}`);
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = new User({ ...user, password: hashedPassword });
      await newUser.save();

      console.log(`✅ SuperAdmin ${user.email} added.`);
      logAudit(`SuperAdmin created: ${user.email} (${user.username})`);
      await sendAdminWelcomeEmail(user.email, user.fname);
    } catch (err: any) {
      console.error(`❌ Failed to add ${user.email}:`, err.message);
      logAudit(`❌ Failed to add SuperAdmin ${user.email}: ${err.message}`);
    }
  }
}

  

addSuperAdmins().catch((err) => console.error("SuperAdmin setup failed:", err));

export default User;