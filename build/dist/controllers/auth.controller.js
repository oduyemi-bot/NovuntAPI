"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.completeRegistration = exports.initiateRegistration = exports.resendVerificationCode = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const user_model_1 = __importDefault(require("../models/user.model"));
const tempUser_model_1 = __importDefault(require("../models/tempUser.model"));
const sendMail_1 = require("../utils/sendMail");
const dotenv_1 = __importDefault(require("dotenv"));
const clearTempUserSession_1 = require("../helpers/clearTempUserSession");
dotenv_1.default.config();
const resendVerificationCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tempUser = req.session.tempUser;
    if (!tempUser) {
        res.status(400).json({ message: "No temp session found. Please restart registration." });
        return;
    }
    const ensuredTempUser = tempUser;
    const { email, fname, lname } = ensuredTempUser;
    // Rate-limit check
    const lastResend = req.session.lastTOTPResend;
    if (lastResend && Date.now() - lastResend < 60 * 1000) {
        res.status(429).json({ message: "Please wait a minute before trying again." });
        return;
    }
    req.session.lastTOTPResend = Date.now();
    // Generate and update new secret
    const { secret } = yield (0, sendMail_1.sendVerificationTOTP)(email, `${fname} ${lname}`);
    yield tempUser_model_1.default.findOneAndUpdate({ email }, { secret });
    // Re-assign secret back into the session safely
    ensuredTempUser.secret = secret;
    req.session.tempUser = ensuredTempUser;
    res.status(200).json({ message: "New verification code sent to your email." });
});
exports.resendVerificationCode = resendVerificationCode;
const initiateRegistration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fname, lname, email, username, password, confirmPassword } = req.body;
    if (!fname || !lname || !email || !username || !password || !confirmPassword) {
        res.status(400).json({ message: "Missing required fields" });
        return;
    }
    const existingUser = yield user_model_1.default.findOne({ email, username });
    if (existingUser) {
        res.status(400).json({ message: "Email or username already exists" });
        return;
    }
    if (password !== confirmPassword) {
        res.status(400).json({ message: "Both passwords must match!" });
        return;
    }
    const { secret } = yield (0, sendMail_1.sendVerificationTOTP)(email, `${fname} ${lname}`);
    yield tempUser_model_1.default.findOneAndDelete({ email });
    const temp = new tempUser_model_1.default({ fname, lname, email, username, secret });
    yield temp.save();
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
});
exports.initiateRegistration = initiateRegistration;
const completeRegistration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const isValid = speakeasy_1.default.totp.verify({
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
    const existingUser = yield user_model_1.default.findOne({
        $or: [{ email }, { username }],
    });
    if (existingUser) {
        res.status(409).json({ message: "Email or username is already in use." });
        return;
    }
    // 4. Hash password
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    // 5. Create and save permanent user
    const newUser = new user_model_1.default({
        fname,
        lname,
        email,
        username,
        password: hashedPassword,
        role: "user",
        twoFAEnabled: false,
        twoFASecret: "", // will be set later if user opts in for 2FA
    });
    yield newUser.save();
    // 6. Clean up temp user from DB and session
    yield tempUser_model_1.default.findOneAndDelete({ email });
    (0, clearTempUserSession_1.clearTempUserSession)(req);
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
    const jwtToken = jsonwebtoken_1.default.sign({ userID: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
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
});
exports.completeRegistration = completeRegistration;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, password } = req.body;
        // Ensure either email or username and password are provided
        if ((!email && !username) || !password) {
            res.status(400).json({ message: "Email/Username and password are required" });
            return;
        }
        // Find the user either by email or username
        let user = null;
        if (email) {
            user = yield user_model_1.default.findOne({ email }).select("+password");
        }
        else if (username) {
            user = yield user_model_1.default.findOne({ username }).select("+password");
        }
        // Check if the user exists
        if (!user) {
            res.status(401).json({ message: "User not registered. Please register first." });
            return;
        }
        // Compare the provided password with the hashed password
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        // Create JWT token payload
        const payload = { userID: user._id };
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
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
    }
    catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ message: "Error logging in user" });
    }
});
exports.login = login;
const logout = (req, res) => {
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
    }
    catch (error) {
        console.error("Error during user logout:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.logout = logout;
