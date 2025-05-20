import express from "express";
import { confirmDepositWebhook, getAllStakes, getBonusStakes, getStakesByUserId, initiateDeposit, stakeFunds } from "../controllers/transaction.controller";
import { authenticateUser, require2FA } from "../middlewares/auth.middleware";
import { verify2FA } from "../controllers/auth.controller";

const router = express.Router();
router.use(authenticateUser);

router.post("/deposit", authenticateUser, verify2FA, initiateDeposit);
router.post("/webhook/deposit", confirmDepositWebhook);
router.get("/stakes", getAllStakes);
router.get("/stakes/history/:userId", getStakesByUserId);
router.get("/stakes/bonus", getBonusStakes);
router.post("/stake", require2FA, stakeFunds);

export default router;
