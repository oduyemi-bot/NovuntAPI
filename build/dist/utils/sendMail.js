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
exports.sendVerificationTOTP = void 0;
exports.sendAdminWelcomeEmail = sendAdminWelcomeEmail;
const speakeasy_1 = __importDefault(require("speakeasy"));
const transporter_1 = require("./transporter");
const tempUser_model_1 = __importDefault(require("../models/tempUser.model"));
function sendAdminWelcomeEmail(email, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const mailOptions = {
            from: `"Novunt Support" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Welcome, Super Admin!",
            html: `
      <p>Hi ${name},</p>
      <p>You’ve been added as a <strong>super admin</strong> to the platform.</p>
      <p>You can now log in and start managing the system.</p>
    `,
        };
        return transporter_1.transporter.sendMail(mailOptions);
    });
}
const sendVerificationTOTP = (email, name) => __awaiter(void 0, void 0, void 0, function* () {
    const secret = speakeasy_1.default.generateSecret();
    const token = speakeasy_1.default.totp({
        secret: secret.base32,
        encoding: "base32",
        step: 300, // 5 minutes validity
    });
    const expirationTime = Date.now() + 300 * 1000; // Expires in 5 minutes
    const tempUser = yield tempUser_model_1.default.findOneAndUpdate({ email }, {
        secret: secret.base32,
        verificationToken: token,
        tokenExpiration: expirationTime
    }, { upsert: true, new: true } // Create the document if it doesn't exist, return the updated document
    );
    const mailOptions = {
        from: `"Novunt" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Verification Code",
        html: `
      <p>Hello <b>${name}</b>,</p>
      <p>Your verification code is:</p>
      <h2>${token}</h2>
      <p>This code will expire in 5 minutes.</p>
    `,
    };
    yield transporter_1.transporter.sendMail(mailOptions);
    return {
        secret: secret.base32,
    };
});
exports.sendVerificationTOTP = sendVerificationTOTP;
