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
exports.sendUserFraudNotificationEmail = exports.sendFraudAlertEmail = exports.sendDepletionWarningEmail = exports.sendWithdrawalStatusEmail = exports.sendWithdrawalApprovedEmail = exports.sendWithdrawalRequestEmail = exports.sendResetPasswordEmail = exports.sendVerificationTOTP = void 0;
exports.sendAdminWelcomeEmail = sendAdminWelcomeEmail;
exports.sendSuperAdminWelcomeEmail = sendSuperAdminWelcomeEmail;
const speakeasy_1 = __importDefault(require("speakeasy"));
const transporter_1 = require("./transporter");
const tempUser_model_1 = __importDefault(require("../models/tempUser.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
function sendAdminWelcomeEmail(email, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const mailOptions = {
            from: `"Novunt Support" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Welcome, Super Admin!",
            html: `
      <p>Hi ${name},</p>
      <p>You’ve been added as an <strong>admin</strong> to the platform.</p>
      <p>You can now log in and start managing the system.</p>
      <p>It is recommended that you change your password once you are in.</p>
    `,
        };
        return transporter_1.transporter.sendMail(mailOptions);
    });
}
function sendSuperAdminWelcomeEmail(email, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const mailOptions = {
            from: `"Novunt Support" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Welcome, Super Admin!",
            html: `
      <p>Hi ${name},</p>
      <p>You’ve been added as a <strong>super admin</strong> to the platform.</p>
      <p>You can now log in and start managing the system.</p>
      <p>It is recommended that you change your password once you are in.</p>
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
    }, { upsert: true, new: true } // Create if not exists
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
const sendResetPasswordEmail = (email, name) => __awaiter(void 0, void 0, void 0, function* () {
    // Generate secret and TOTP token (valid for 15 minutes)
    const secret = speakeasy_1.default.generateSecret();
    const token = speakeasy_1.default.totp({
        secret: secret.base32,
        encoding: "base32",
        step: 900, // 15 minutes validity
    });
    const expirationTime = Date.now() + 900 * 1000; // 15 minutes from now
    yield user_model_1.default.findOneAndUpdate({ email }, {
        resetSecret: secret.base32,
        resetToken: token,
        resetTokenExpiration: expirationTime,
    }, { upsert: true, new: true });
    const mailOptions = {
        from: `"Novunt" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Your Password Reset Code",
        html: `
      <p>Hello <b>${name}</b>,</p>
      <p>Your password reset code is:</p>
      <h2>${token}</h2>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
    };
    // Send the email
    yield transporter_1.transporter.sendMail(mailOptions);
    return {
        secret: secret.base32,
    };
});
exports.sendResetPasswordEmail = sendResetPasswordEmail;
const sendWithdrawalRequestEmail = (userID, amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findById(userID);
        if (!user || !user.email) {
            console.warn("User email not found for withdrawal alert");
            return;
        }
        const adminEmail = process.env.ADMIN_EMAIL;
        const mailOptions = {
            from: `"Novunt Withdrawals" <${process.env.MAIL_USER}>`,
            to: adminEmail,
            subject: "🔐 New Withdrawal Request Pending Approval",
            html: `
        <h3>Withdrawal Request</h3>
        <p><strong>User:</strong> ${user.fname} ${user.lname} (${user.username})</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Amount:</strong> ${amount} USDT</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p>Login to the admin panel to approve or reject this request.</p>
      `,
        };
        yield transporter_1.transporter.sendMail(mailOptions);
        console.log("Admin notified of withdrawal request.");
    }
    catch (error) {
        console.error("Error sending withdrawal email:", error);
    }
});
exports.sendWithdrawalRequestEmail = sendWithdrawalRequestEmail;
const sendWithdrawalApprovedEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, name, amount, address, txId, }) {
    const mailOptions = {
        from: `"Novunt Finance" <${process.env.MAIL_USER}>`,
        to,
        subject: "Your Withdrawal Has Been Approved",
        html: `
      <p>Hi ${name},</p>
      <p>Your withdrawal request of <strong>${amount} USDT</strong> has been successfully processed.</p>
      <p><strong>Transaction ID:</strong> ${txId}</p>
      <p><strong>Destination Address:</strong> ${address}</p>
      <p>If you did not authorize this, please contact support immediately.</p>
      <br/>
      <p>Thanks,</p>
      <p>Novunt Finance Team</p>
    `,
    };
    try {
        yield transporter_1.transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Withdrawal approval sent to ${to}`);
    }
    catch (error) {
        console.error("[EMAIL ERROR] Failed to send withdrawal approval email:", error);
    }
});
exports.sendWithdrawalApprovedEmail = sendWithdrawalApprovedEmail;
const sendWithdrawalStatusEmail = (to, status, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = status === "approved"
        ? "✅ Your Withdrawal Has Been Approved"
        : "❌ Your Withdrawal Request Was Rejected";
    const html = status === "approved"
        ? `
        <p>Hi,</p>
        <p>Your withdrawal request of <strong>${amount} USDT</strong> has been <strong>approved</strong> and is being processed.</p>
        <p>If you have any questions, please contact support.</p>
        <br/>
        <p>Thanks,</p>
        <p>Novunt Finance Team</p>
      `
        : `
        <p>Hi,</p>
        <p>We're sorry to inform you that your withdrawal request of <strong>${amount} USDT</strong> was <strong>rejected</strong>.</p>
        <p>Please contact support for more details.</p>
        <br/>
        <p>Thanks,</p>
        <p>Novunt Finance Team</p>
      `;
    try {
        yield transporter_1.transporter.sendMail({
            from: `"Novunt Finance" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`[EMAIL] Withdrawal ${status} email sent to ${to}`);
    }
    catch (err) {
        console.error(`[EMAIL ERROR] Failed to send ${status} email to ${to}:`, err);
    }
});
exports.sendWithdrawalStatusEmail = sendWithdrawalStatusEmail;
const sendDepletionWarningEmail = (userID, bonusAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findById(userID);
        if (!user || !user.email) {
            console.warn("User email not found for depletion warning alert");
            return;
        }
        const mailOptions = {
            from: `"Novunt Referrals" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: "⚠️ 3 Days Left Before Your Referral Bonus Starts Depleting",
            html: `
        <h3>Referral Bonus Depletion Warning</h3>
        <p>Hi ${user.fname},</p>
        <p>You received a referral bonus of <strong>${bonusAmount} USDT</strong> from your network.</p>
        <p><strong>Action Required:</strong> Stake at least 10 USDT within the next 3 days to preserve your full bonus.</p>
        <p>If no stake is made by Day 30, your bonus will begin depleting by 1% daily until fully removed.</p>
        <p>Secure your bonus now and maximize your earnings.</p>
        <br/>
        <p>– Novunt Team</p>
      `,
        };
        yield transporter_1.transporter.sendMail(mailOptions);
        console.log(`Depletion warning sent to ${user.email}`);
    }
    catch (error) {
        console.error("Error sending depletion warning email:", error);
    }
});
exports.sendDepletionWarningEmail = sendDepletionWarningEmail;
const sendFraudAlertEmail = (flaggedUserEmail, flaggedUsername, reason, details) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admins = yield user_model_1.default.find({ role: { $in: ["admin", "superAdmin"] } });
        if (admins.length === 0) {
            console.warn("No admins found to notify about fraud alert");
            return;
        }
        const toEmails = admins.map((admin) => admin.email).filter(Boolean);
        if (toEmails.length === 0) {
            console.warn("Admins found but no valid emails to notify fraud alert");
            return;
        }
        const mailOptions = {
            from: `"Novunt Security" <${process.env.MAIL_USER}>`,
            to: toEmails.join(","),
            subject: "🚨 Fraud Detection Alert",
            html: `
        <h2>Fraud Detection Alert</h2>
        <p><strong>User:</strong> ${flaggedUsername} (${flaggedUserEmail})</p>
        <p><strong>Reason:</strong> ${reason}</p>
        ${details
                ? `<p><strong>Details:</strong> ${details}</p>`
                : ""}
        <p>Please review this user account for suspicious activity.</p>
        <br/>
        <p>– Novunt Security Team</p>
      `,
        };
        yield transporter_1.transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Fraud alert sent to admins: ${toEmails.join(", ")}`);
    }
    catch (error) {
        console.error("[EMAIL ERROR] Failed to send fraud alert email:", error);
    }
});
exports.sendFraudAlertEmail = sendFraudAlertEmail;
const sendUserFraudNotificationEmail = (to, username, reason) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `"Novunt Security" <${process.env.MAIL_USER}>`,
        to,
        subject: "⚠️ Important: Suspicious Activity Detected on Your Account",
        html: `
      <p>Hi ${username},</p>
      <p>We detected suspicious activity on your account:</p>
      <p><strong>${reason}</strong></p>
      <p>Our security team is reviewing this and may contact you if necessary.</p>
      <p>If this was not you, please secure your account immediately by changing your password and enabling 2FA.</p>
      <br/>
      <p>Thanks,</p>
      <p>Novunt Security Team</p>
    `,
    };
    try {
        yield transporter_1.transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Fraud notification sent to user ${to}`);
    }
    catch (error) {
        console.error(`[EMAIL ERROR] Failed to send fraud notification email to ${to}:`, error);
    }
});
exports.sendUserFraudNotificationEmail = sendUserFraudNotificationEmail;
