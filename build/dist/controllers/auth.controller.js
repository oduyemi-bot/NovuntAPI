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
exports.logout = exports.login = exports.generate2FASecret = exports.enable2FA = exports.verify2FA = exports.completeRegistration = exports.resendVerificationCode = exports.initiateRegistration = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const user_model_1 = __importDefault(require("../models/user.model"));
const tempUser_model_1 = __importDefault(require("../models/tempUser.model"));
const userWallet_model_1 = __importDefault(require("../models/userWallet.model"));
const sendMail_1 = require("../utils/sendMail");
const dotenv_1 = __importDefault(require("dotenv"));
const mockNowPayments_1 = require("../utils/mockNowPayments");
const logSecurityEvent_1 = require("../utils/logSecurityEvent");
dotenv_1.default.config();
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
    console.log("Sending to:", email, "Name:", `${fname} ${lname}`);
    const { secret } = yield (0, sendMail_1.sendVerificationTOTP)(email, `${fname} ${lname}`);
    const tokenExpiration = Date.now() + 30 * 60 * 1000; // 30 minutes expiration
    const verificationToken = speakeasy_1.default.totp({ secret, encoding: 'base32' });
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    yield tempUser_model_1.default.findOneAndDelete({ email });
    const temp = new tempUser_model_1.default({
        fname,
        lname,
        email,
        username,
        password: hashedPassword,
        secret,
        tokenExpiration,
        verificationToken,
    });
    yield temp.save();
    res.status(200).json({
        message: "Verification code sent to email",
        nextStep: "/verify-email",
    });
});
exports.initiateRegistration = initiateRegistration;
const resendVerificationCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required to resend verification code." });
            return;
        }
        // Rate-limit check: Ensure user waits a minute before resending the verification code
        const lastResendTimestamp = req.session.lastTOTPResend;
        if (lastResendTimestamp && Date.now() - lastResendTimestamp < 60 * 1000) {
            res.status(429).json({ message: "Please wait a minute before trying again." });
            return;
        }
        // Update rate limit timestamp
        req.session.lastTOTPResend = Date.now();
        const tempUser = yield tempUser_model_1.default.findOne({ email });
        if (!tempUser) {
            res.status(400).json({ message: "No registration session found for the provided email." });
            return;
        }
        // Generate a new TOTP secret and update the TempUser record
        const { fname, lname } = tempUser;
        const { secret } = yield (0, sendMail_1.sendVerificationTOTP)(email, `${fname} ${lname}`);
        tempUser.secret = secret;
        yield tempUser.save();
        res.status(200).json({ message: "New verification code sent to your email." });
    }
    catch (error) {
        console.error("Error during resend verification code:", error);
        res.status(500).json({ message: "Internal Server Error. Please try again later." });
    }
});
exports.resendVerificationCode = resendVerificationCode;
const completeRegistration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, verificationCode } = req.body;
    const tempUser = yield tempUser_model_1.default.findOne({ email });
    if (!tempUser) {
        res.status(400).json({ message: "Invalid or expired registration session." });
        return;
    }
    const currentTime = Date.now();
    if (currentTime > tempUser.tokenExpiration) {
        res.status(400).json({ message: "Verification code has expired." });
        return;
    }
    const isValid = speakeasy_1.default.totp.verify({
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
        const newUser = new user_model_1.default({
            fname,
            lname,
            email,
            username,
            password,
            role: "user",
            twoFAEnabled: false,
            twoFASecret: "",
        });
        yield newUser.save();
        const walletAddress = (0, mockNowPayments_1.mockGenerateWalletAddress)(newUser._id.toString());
        const newWallet = new userWallet_model_1.default({
            user: newUser._id,
            walletAddress,
            balance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
        });
        yield newWallet.save();
        yield tempUser_model_1.default.findOneAndDelete({ email });
        const jwtToken = jsonwebtoken_1.default.sign({ userID: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({
            message: "Registration complete!",
            token: jwtToken,
            user: { fname, lname, email, username },
            nextStep: "/login",
        });
    }
    catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Error completing registration", error: err.message });
    }
});
exports.completeRegistration = completeRegistration;
const verify2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userID, token } = req.body;
    if (!userID || !token) {
        res.status(400).json({ message: "Missing user ID or 2FA token" });
        return;
    }
    const user = yield user_model_1.default.findById(userID);
    if (!user || !user.twoFAEnabled || !user.twoFASecret) {
        res.status(400).json({ message: "2FA not enabled for this user" });
        return;
    }
    const isValid = speakeasy_1.default.totp.verify({
        secret: user.twoFASecret,
        encoding: "base32",
        token,
        window: 1, // allow for slight clock drift
    });
    if (!isValid) {
        yield (0, logSecurityEvent_1.logSecurityEvent)({
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
    const jwtToken = jsonwebtoken_1.default.sign({ userID: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    yield (0, logSecurityEvent_1.logSecurityEvent)({
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
});
exports.verify2FA = verify2FA;
const enable2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, token, secret } = req.body;
    if (!email || !token || !secret) {
        res.status(400).json({ message: "Email, token and secret are required" });
        return;
    }
    const isVerified = speakeasy_1.default.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 1,
    });
    if (!isVerified) {
        res.status(400).json({ message: "Invalid 2FA token" });
        return;
    }
    const user = yield user_model_1.default.findOneAndUpdate({ email }, { twoFAEnabled: true, twoFASecret: secret }, { new: true });
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    res.status(200).json({ message: "2FA successfully enabled" });
});
exports.enable2FA = enable2FA;
const generate2FASecret = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ message: "Email is required to setup 2FA" });
        return;
    }
    const secret = speakeasy_1.default.generateSecret({
        name: `YourAppName (${email})`, // shows in Google Authenticator
    });
    try {
        const otpauthUrl = secret.otpauth_url;
        const qrImageUrl = yield qrcode_1.default.toDataURL(otpauthUrl);
        // You should store the base32 secret temporarily until the user verifies with a token
        res.status(200).json({
            message: "Scan QR with Google Authenticator",
            qrImageUrl,
            secret: secret.base32, // Only send this if you're verifying manually
        });
    }
    catch (err) {
        console.error("Error generating 2FA secret:", err);
        res.status(500).json({ message: "Error generating 2FA secret" });
    }
});
exports.generate2FASecret = generate2FASecret;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, password } = req.body;
        if ((!email && !username) || !password) {
            res.status(400).json({ message: "Either email or username and password are required" });
            return;
        }
        let user = null;
        if (email) {
            user = yield user_model_1.default.findOne({ email }).select("+password");
        }
        else if (username) {
            user = yield user_model_1.default.findOne({ username }).select("+password");
        }
        if (!user) {
            res.status(401).json({ message: "User not registered. Please register first." });
            return;
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
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
            yield (0, logSecurityEvent_1.logSecurityEvent)({
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
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
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
        yield (0, logSecurityEvent_1.logSecurityEvent)({
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
