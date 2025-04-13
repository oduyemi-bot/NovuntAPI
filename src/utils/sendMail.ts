import speakeasy from "speakeasy";
import {transporter} from "./transporter";

export async function sendAdminWelcomeEmail(email: string, name: string) {
  const mailOptions = {
    from: `"YourApp Support" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Welcome, Super Admin!",
    html: `
      <p>Hi ${name},</p>
      <p>You’ve been added as a <strong>super admin</strong> to the platform.</p>
      <p>You can now log in and start managing the system.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}


export const sendVerificationTOTP = async (email: string, name: string) => {
  const secret = speakeasy.generateSecret();
  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: "base32",
    step: 180, // 3 minutes
  });

  const mailOptions = {
    from: `"Novunt" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Verification Code",
    html: `
      <p>Hello <b>${name}</b>,</p>
      <p>Your verification code is:</p>
      <h2>${token}</h2>
      <p>This code will expire in 3 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);

  return {
    token, // return it only for development/debug; remove in prod
    secret: secret.base32,
  };
};