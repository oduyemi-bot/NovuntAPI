import { Router } from "express";
import { initiateRegistration, resendVerificationCode, completeRegistration, login, logout, generate2FASecret, enable2FA, verify2FA, updatePassword, sendResetPasswordOTP, resetPassword } from "../controllers/auth.controller";
import { validateRequestBody, validatePassword, validateLogin } from "../middlewares/validation.middleware";
import { authenticateUser } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/register",
  validateRequestBody(["fname", "lname", "email", "username", "password", "confirmPassword"]), 
  validatePassword,
  initiateRegistration
);
router.post("/verify-email", resendVerificationCode);
router.post("/complete-registration", completeRegistration);
router.post(
  "/login",
  validateLogin,
  login
);
router.patch("/password", authenticateUser, updatePassword);
router.post("/reset-password/request", sendResetPasswordOTP);
router.post("/reset-password", resetPassword);
router.post('/auth/generate-2fa-secret', generate2FASecret);
router.post('/auth/enable-2fa', enable2FA);
router.post('/auth/verify-2fa', verify2FA);
router.post("/logout/:userID", logout); 

export default router;

