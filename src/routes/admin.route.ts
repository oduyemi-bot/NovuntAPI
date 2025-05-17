import express from "express";
import {
  adminLogin,
  approveWithdrawal,
  getAllTransactions,
  getAllUsersWithBalances,
  getFlaggedActivities,
} from "../controllers/admin.controller";
import { authenticateUser, checkAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";


const router = express.Router();


router.post("/login", adminLogin);

router.use(authenticateUser, checkAdmin);

router.get("/user/:userId/stakes", getStakesByUserId);
router.patch("/withdrawal/:transactionId", require2FA, approveWithdrawal);
router.get("/transactions", getAllTransactions);
router.get("/users-balances", getAllUsersWithBalances);
router.get("/flagged-activities", getFlaggedActivities);

export default router;
