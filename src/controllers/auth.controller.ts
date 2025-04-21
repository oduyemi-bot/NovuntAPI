import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import User, { IUser } from "../models/user.model";
import TempUser from "../models/tempUser.model";
import { sendVerificationTOTP } from "../utils/sendMail";
import dotenv from "dotenv";


dotenv.config();

export interface UserSession {
    userID: mongoose.Types.ObjectId;
    fname: string;
    lname: string;
    email: string;
    username: string;
    role: "admin" | "superAdmin" | "user";
    walletAddress? : string;
    twoFAEnabled: boolean;
    twoFASecret: string;
    createdAt: Date;
    updatedAt?: Date;
}

declare module "express-session" {
    interface SessionData {
        user?: UserSession;
        lastTOTPResend?: number;
    }
}

export {};
  
  
export const initiateRegistration = async (req: Request, res: Response): Promise<void> => {
    const { fname, lname, email, username, password, confirmPassword } = req.body;
  
    if (!fname || !lname || !email || !username || !password || !confirmPassword) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
  
    const existingUser = await User.findOne({ email, username });
    if (existingUser) {
      res.status(400).json({ message: "Email or username already exists" });
      return;
    }
  
    if (password !== confirmPassword) {
      res.status(400).json({ message: "Both passwords must match!" });
      return;
    }
  
    console.log("Sending to:", email, "Name:", `${fname} ${lname}`);  
    const { secret } = await sendVerificationTOTP(email, `${fname} ${lname}`);
    const tokenExpiration = Date.now() + 30 * 60 * 1000; // 30 minutes expiration
    const verificationToken = speakeasy.totp({ secret, encoding: 'base32' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await TempUser.findOneAndDelete({ email });
    const temp = new TempUser({
      fname,
      lname,
      email,
      username,
      password: hashedPassword,
      secret,
      tokenExpiration, 
      verificationToken,  
    });
    
    await temp.save();
  
    res.status(200).json({
      message: "Verification code sent to email",
      nextStep: "/verify-email",
    });
};
  
  
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required to resend verification code." });
      return;
    }

    // Rate-limit check: Ensure user waits a minute before resending the verification code
    const lastResendTimestamp = (req.session as any).lastTOTPResend as number | undefined;
    if (lastResendTimestamp && Date.now() - lastResendTimestamp < 60 * 1000) {
      res.status(429).json({ message: "Please wait a minute before trying again." });
      return;
    }

    // Update rate limit timestamp
    (req.session as any).lastTOTPResend = Date.now();
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) {
      res.status(400).json({ message: "No registration session found for the provided email." });
      return;
    }

    // Generate a new TOTP secret and update the TempUser record
    const { fname, lname } = tempUser;
    const { secret } = await sendVerificationTOTP(email, `${fname} ${lname}`);
    tempUser.secret = secret;
    await tempUser.save();
    res.status(200).json({ message: "New verification code sent to your email." });
  } catch (error) {
    console.error("Error during resend verification code:", error);
    res.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};

  

  export const completeRegistration = async (req: Request, res: Response): Promise<void> => {
    const { email, verificationCode } = req.body;
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) {
      res.status(400).json({ message: "Invalid or expired registration session." });
      return;
    }
  
    console.log("TempUser found:", tempUser);
    const currentTime = Date.now();  
    if (currentTime > tempUser.tokenExpiration) {
      res.status(400).json({ message: "Verification code has expired." });
      return;
    }
  
    // Validate the verification code using TOTP
    const isValid = speakeasy.totp.verify({
      secret: tempUser.secret,
      encoding: "base32",
      token: verificationCode,
      step: 300,  // 5 minutes validity window
      window: 1,  // Allow 1 step window for previous token
    });
  
    if (!isValid) {
      res.status(400).json({ message: "Invalid verification code." });
      return;
    }

    const { fname, lname, username, password } = tempUser;
    const newUser = new User({
      fname,
      lname,
      email,
      username,
      password,
      role: "user",
      twoFAEnabled: false,
      twoFASecret: "",
    });
  
    await newUser.save();
    await TempUser.findOneAndDelete({ email });
    const jwtToken = jwt.sign(
      { userID: newUser._id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );
  
    res.status(201).json({
      message: "Registration complete!",
      token: jwtToken,
      user: { fname, lname, email, username },
      nextStep: "/login",
    });
  };
  
  
  export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {email, username, password} = req.body;
        if ((!email && !username) || !password) {
            res.status(400).json({ message: "Either email or username and password are required" });
            return;
        }

        let user: IUser | null = null;
        if (email) {
            user = await User.findOne({ email }).select("+password");
        } else if (username) {
            user = await User.findOne({ username }).select("+password");
        }

        if (!user) {
            res.status(401).json({ message: "User not registered. Please register first." });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }

        // If 2FA is enabled, return a response asking for 2FA verification
        if (user.twoFAEnabled) {
            res.status(200).json({
                message: "Two-factor authentication required",
                nextStep: "/verify-2fa",  
            });
            return;
        }

        // Generate JWT token
        const payload = { userID: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });
        const userSession = {
            userID: user._id,
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            username: user.username,
            walletAddress: user.walletAddress,
            role: user.role,
            twoFAEnabled: user.twoFAEnabled,
            twoFASecret: user.twoFASecret,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        req.session.user = userSession;
        res.status(200).json({
            message: "Login successful",
            userID: user._id,
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            username: user.username,
            nextStep: "/next-dashboard", 
            token,
        });
    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ message: "Error logging in user" });
    }
};



export const logout = (req: Request, res: Response) => {
    const userID = req.params.userID;
    try {
        if (!req.session.user || req.session.user.userID.toString() !== userID) {
            res.status(401).json({ message: "Unauthorized: User not logged in or unauthorized to perform this action" });
            return; 
        }
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ message: "Error logging out" });
            }
            res.status(200).json({ message: "Logout successful!" });
        });
    } catch (error) {
        console.error("Error during user logout:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};