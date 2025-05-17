import express from "express";
import {
  adminLogin,
  approveWithdrawal,
  getAllTransactions,
  getAllUsersWithBalances,
  getFlaggedActivities,
  getAdminActivityLogs,
  updateAdminProfilePicture,
  updateAdminPassword,
  getAdminProfile,
  reviewKYCSubmission,
  adminLogout,
} from "../controllers/admin.controller";
import { authenticateUser, checkAdmin, checkSuperAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/logout", authenticateUser, checkAdmin, adminLogout);
router.get("/user/:userId", authenticateUser, checkAdmin, getStakesByUserId);

// Admin profile routes
router.get("/profile", authenticateUser, checkAdmin, getAdminProfile);
router.patch("/profile/picture", authenticateUser, checkAdmin, updateAdminProfilePicture);
router.patch("/profile/password", authenticateUser, checkAdmin, updateAdminPassword);

// Withdrawal approval routes
router.patch("/withdrawal/:transactionId", authenticateUser, checkAdmin, approveWithdrawal);
router.put("/withdrawals/approve/:transactionId", authenticateUser, checkAdmin, require2FA, approveWithdrawal);

// Other admin routes
router.get("/transactions", authenticateUser, checkAdmin, getAllTransactions);
router.get("/users-balances", authenticateUser, checkAdmin, getAllUsersWithBalances);
router.get("/flagged-activities", authenticateUser, checkAdmin, getFlaggedActivities);
router.get("/activity-logs", authenticateUser, checkSuperAdmin, getAdminActivityLogs);

// KYC review route
router.patch("/kyc/:kycId/review", authenticateUser, checkAdmin, reviewKYCSubmission);

export default router;
