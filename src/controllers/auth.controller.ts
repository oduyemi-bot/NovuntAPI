import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import User, { IUser } from "../models/user.model";
import TempUser, {ITempUser} from "../models/tempUser.model";
import { sendVerificationTOTP } from "../utils/sendMail";
import dotenv from "dotenv";
import { clearTempUserSession } from "../helpers/clearTempUserSession";


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

interface TempUserSession {
    fname: string;
    lname: string;
    email: string;
    username: string;
    secret: string;
    createdAt: Date;
  }

declare module "express-session" {
    interface SessionData {
        user?: UserSession;
        tempUser?: TempUserSession;
        lastTOTPResend?: number;
    }
}

export {};


export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    const tempUser = req.session.tempUser;
    if (!tempUser) {
      res.status(400).json({ message: "No temp session found. Please restart registration." });
      return;
    }
  
    const ensuredTempUser = tempUser as TempUserSession;
    const { email, fname, lname } = ensuredTempUser;
  
    // Rate-limit check
    const lastResend = (req.session as any).lastTOTPResend as number | undefined;
    if (lastResend && Date.now() - lastResend < 60 * 1000) {
      res.status(429).json({ message: "Please wait a minute before trying again." });
      return;
    }
  
    (req.session as any).lastTOTPResend = Date.now();
  
    // Generate and update new secret
    const { secret } = await sendVerificationTOTP(email, `${fname} ${lname}`);
    await TempUser.findOneAndUpdate({ email }, { secret });
  
    // Re-assign secret back into the session safely
    ensuredTempUser.secret = secret;
    req.session.tempUser = ensuredTempUser;
  
    res.status(200).json({ message: "New verification code sent to your email." });
  };
  


export const initiateRegistration = async (req: Request, res: Response): Promise<void> => {
    const { fname, lname, email, username, password, confirmPassword  } = req.body;
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

    const { secret } = await sendVerificationTOTP(email, `${fname} ${lname}`);
  
    await TempUser.findOneAndDelete({ email });
  
    const temp = new TempUser({ fname, lname, email, username, secret });
    await temp.save();
  
    req.session.tempUser = {
      fname,
      lname,
      email,
      username,
      secret,
      createdAt: new Date(),
    };
  
    res.status(200).json({ 
        message: "Verification code sent to email",
        nextStep: "/verify-email" 
    });
  };
  
  
  export const completeRegistration = async (req: Request, res: Response): Promise<void> => {
    const { password, confirmPassword, token } = req.body;
  
    const tempUserSession = req.session.tempUser;
  
    if (!tempUserSession) {
      res.status(400).json({ message: "No temp user session found. Please restart registration." });
      return;
    }
  
    const { fname, lname, email, username, secret } = tempUserSession;
  
    // 1. Password match check
    if (!password || !confirmPassword) {
      res.status(400).json({ message: "Password and confirmation are required." });
      return;
    }
  
    if (password !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match." });
      return;
    }
  
    // 2. Verify TOTP
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  
    if (!isValid) {
        res.status(400).json({ message: "Invalid or expired verification code.", errorCode: "INVALID_TOTP" });
        return;
      }      
  
    // 3. Final duplication check (email or username was taken mid-process)
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
  
    if (existingUser) {
      res.status(409).json({ message: "Email or username is already in use." });
      return;
    }
  
    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // 5. Create and save permanent user
    const newUser = new User({
      fname,
      lname,
      email,
      username,
      password: hashedPassword,
      role: "user",
      twoFAEnabled: false,
      twoFASecret: "", // will be set later if user opts in for 2FA
    });
  
    await newUser.save();
  
    // 6. Clean up temp user from DB and session
    await TempUser.findOneAndDelete({ email });
    clearTempUserSession(req);
    delete req.session.tempUser;
  
    // 7. Store in session
    req.session.user = {
      userID: newUser._id,
      fname: newUser.fname,
      lname: newUser.lname,
      email: newUser.email,
      username: newUser.username,
      walletAddress: newUser.walletAddress,
      role: newUser.role,
      twoFAEnabled: newUser.twoFAEnabled,
      twoFASecret: newUser.twoFASecret,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
  
    // 8. Return response
    const jwtToken = jwt.sign(
      { userID: newUser._id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );
  
    res.status(201).json({
      message: "Registration completed successfully.",
      token: jwtToken,
      user: {
        fname: newUser.fname,
        lname: newUser.lname,
        email: newUser.email,
        username: newUser.username,
      },
      nextStep: "/dashboard", // or whatever next route
    });
};
  

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, username, password } = req.body;

        // Ensure either email or username and password are provided
        if ((!email && !username) || !password) {
            res.status(400).json({ message: "Email/Username and password are required" });
            return;
        }

        // Find the user either by email or username
        let user: IUser | null = null;
        if (email) {
            user = await User.findOne({ email }).select("+password");
        } else if (username) {
            user = await User.findOne({ username }).select("+password");
        }

        // Check if the user exists
        if (!user) {
            res.status(401).json({ message: "User not registered. Please register first." });
            return;
        }

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }

        // Create JWT token payload
        const payload = { userID: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });

        // Create the user session
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

        // Save the user session
        req.session.user = userSession;

        // Send the response with the token and user data
        res.status(200).json({
            message: "success",
            userID: user._id,
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            username: user.username,
            nextStep: "/next-dashboard", // Adjust the next step route as needed
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