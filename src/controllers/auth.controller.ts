import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User, { IUser } from "../models/user.model";
import TempUser from "../models/tempUser.model";
import UserWallet from "../models/userWallet.model";
import { sendVerificationTOTP } from "../utils/sendMail";
import dotenv from "dotenv";
import { mockGenerateWalletAddress } from "../utils/mockNowPayments";
import { logSecurityEvent } from "../utils/logSecurityEvent";


dotenv.config();

export interface UserSession {
    userID: mongoose.Types.ObjectId;
    fname: string;
    lname: string;
    email: string;
    username: string;
    role: "admin" | "superAdmin" | "user";
    twoFAEnabled: boolean;
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

  const currentTime = Date.now();
  if (currentTime > tempUser.tokenExpiration) {
    res.status(400).json({ message: "Verification code has expired." });
    return;
  }

  const isValid = speakeasy.totp.verify({
    secret: tempUser.secret,
    encoding: "base32",
    token: verificationCode,
    step: 300,
    window: 1,
  });

  if (!isValid) {
    res.status(400).json({ message: "Invalid verification code." });
    return;
  }

  const { fname, lname, username, password } = tempUser;

  try {
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

    const walletAddress = mockGenerateWalletAddress(newUser._id.toString());
    const newWallet = new UserWallet({
      user: newUser._id,
      walletAddress,
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
    });
    await newWallet.save();

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
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Error completing registration", error: (err as Error).message });
  }
};


export const verify2FA = async (req: Request, res: Response): Promise<void> => {
  const { userID, token } = req.body;

  if (!userID || !token) {
    res.status(400).json({ message: "Missing user ID or 2FA token" });
    return;
  }

  const user = await User.findById(userID);
  if (!user || !user.twoFAEnabled || !user.twoFASecret) {
    res.status(400).json({ message: "2FA not enabled for this user" });
    return;
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token,
    window: 1, // allow for slight clock drift
  });

  if (!isValid) {
    await logSecurityEvent({
      user: user._id,
      action: "2fa-verify",
      status: "failure",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      details: "Invalid 2FA code",
    });

    res.status(401).json({ message: "Invalid 2FA code" });
    return;
  }

  // Passed: issue session or token
  const jwtToken = jwt.sign(
    { userID: user._id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  await logSecurityEvent({
    user: user._id,
    action: "2fa-verify",
    status: "success",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    details: "2FA passed",
  });

  res.status(200).json({
    message: "2FA verification successful",
    token: jwtToken,
    user: {
      userID: user._id,
      fname: user.fname,
      lname: user.lname,
      email: user.email,
      username: user.username,
    },
    nextStep: "/next-dashboard",
  });
};

export const enable2FA = async (req: Request, res: Response): Promise<void> => {
  const { email, token, secret } = req.body;

  if (!email || !token || !secret) {
    res.status(400).json({ message: "Email, token and secret are required" });
    return;
  }

  const isVerified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isVerified) {
    res.status(400).json({ message: "Invalid 2FA token" });
    return;
  }

  const user = await User.findOneAndUpdate(
    { email },
    { twoFAEnabled: true, twoFASecret: secret },
    { new: true }
  );

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ message: "2FA successfully enabled" });
};


export const generate2FASecret = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required to setup 2FA" });
    return;
  }

  const secret = speakeasy.generateSecret({
    name: `YourAppName (${email})`, // shows in Google Authenticator
  });

  try {
    const otpauthUrl = secret.otpauth_url!;
    const qrImageUrl = await qrcode.toDataURL(otpauthUrl);

    // You should store the base32 secret temporarily until the user verifies with a token
    res.status(200).json({
      message: "Scan QR with Google Authenticator",
      qrImageUrl,
      secret: secret.base32, // Only send this if you're verifying manually
    });
  } catch (err) {
    console.error("Error generating 2FA secret:", err);
    res.status(500).json({ message: "Error generating 2FA secret" });
  }
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
      
          await logSecurityEvent({
            user: user._id,
            action: "2fa-challenge",
            status: "success", // This just means the challenge was issued
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            details: "2FA challenge sent during login",
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
            role: user.role,
            twoFAEnabled: user.twoFAEnabled,
            twoFASecret: user.twoFASecret,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        req.session.user = userSession;
        await logSecurityEvent({
          user: user._id,
          action: "login",
          status: "success",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
        
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