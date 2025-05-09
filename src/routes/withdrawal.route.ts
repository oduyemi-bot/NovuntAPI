import express from "express";
import { requestMockWithdrawal, requestWithdrawal } from "../controllers/withdrawal.controller";
import { authenticateUser, require2FA } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/withdraw", authenticateUser, require2FA, requestWithdrawal);
router.post("/mock", requestMockWithdrawal);
export default router;
