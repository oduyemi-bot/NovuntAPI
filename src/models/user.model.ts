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
  walletAddress? : string;
  twoFAEnabled: boolean;
  twoFASecret: string;
  role: "admin" | "superAdmin" | "user";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
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
      validate: {
        validator: (value: string) => passwordRegex.test(value),
        message: "Password must contain uppercase, lowercase, number, and special character.",
      },
    },

    walletAddress: { 
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

    isActive: { 
        type: Boolean, 
        default: true 
    },
  },
  { timestamps: true }
);

userSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("password") || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

async function addSuperAdmins() {
    const superAdminUsers = [
      {
        fname: "Yemi",
        lname: "Cole",
        email: "ykay@gmail.com",
        username: "ykay",
        phone: "+2348166442322",
        password: process.env.YEMI,
        role: "superAdmin",
      },
      {
        fname: "Oreoluwa",
        lname: "Smith",
        email: "oreoluwasmith@gmail.com",
        username: "ore_smith",
        phone: "+2348133992314",
        password: process.env.OREOLUWA,
        role: "superAdmin",
      },
      {
        fname: "Opeyemi",
        lname: "Oduyemi",
        email: "hello@yemi.dev",
        username: "oduyemi",
        phone: "+2348166336187",
        password: process.env.OPEYEMI,
        role: "superAdmin",
      },
    ];
  
    for (const user of superAdminUsers) {
      try {
        const exists = await User.findOne({
          $or: [{ email: user.email }, { username: user.username }],
        });
  
        if (!exists) {
          if (!user.password) throw new Error(`Missing password for ${user.email}`);
  
          const hashedPassword = await bcrypt.hash(user.password, 10);
          const newUser = new User({ ...user, password: hashedPassword });
          await newUser.save();
  
          console.log(`✅ SuperAdmin ${user.email} added.`);
          logAudit(`SuperAdmin created: ${user.email} (${user.username})`);
          await sendAdminWelcomeEmail(user.email, user.fname);
        }
      } catch (err: any) {
        console.error(`❌ Failed to add ${user.email}:`, err.message);
        logAudit(`❌ Failed to add SuperAdmin ${user.email}: ${err.message}`);
      }
    }
  }
  

addSuperAdmins().catch((err) => console.error("SuperAdmin setup failed:", err));

export default User;