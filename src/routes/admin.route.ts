import express from "express";
import {
  adminLogin,
  approveWithdrawal,
  getAllTransactions,
  getAllUsersWithBalances,
  getFlaggedActivities,
  getAdminActivityLogs,
} from "../controllers/admin.controller";
import { authenticateUser, checkAdmin, checkSuperAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/user/:userId", authenticateUser, checkAdmin, getStakesByUserId);

router.patch(
  "/withdrawal/:transactionId",
  authenticateUser,
  checkAdmin,
  approveWithdrawal
);

router.get(
  "/transactions",
  authenticateUser,
  checkAdmin,
  getAllTransactions
);

router.get(
  "/users-balances",
  authenticateUser,
  checkAdmin,
  getAllUsersWithBalances
);

router.get(
  "/flagged-activities",
  authenticateUser,
  checkAdmin,
  getFlaggedActivities
);

router.put(
  "/withdrawals/approve/:transactionId",
  authenticateUser,
  checkAdmin,
  require2FA,
  approveWithdrawal
);

router.get(
  "/activity-logs",
  authenticateUser,
  checkSuperAdmin,
  getAdminActivityLogs
);

export default router;
