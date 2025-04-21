import { Router } from "express";
import { initiateRegistration, resendVerificationCode, completeRegistration, login, logout } from "../controllers/auth.controller";
import { validateRequestBody, validatePassword, validateLogin } from "../middlewares/validation.middleware";

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
router.post("/logout/:userID", logout); 

export default router;

