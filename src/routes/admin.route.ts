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
  declareWeeklyProfit,
  createAdmin,
  createSuperAdmin,
} from "../controllers/admin.controller";
import { authenticateUser, checkAdmin, checkSuperAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/logout", authenticateUser, checkAdmin, adminLogout);
router.patch("/password", authenticateUser, checkAdmin, updateAdminPassword);


// Admin profile routes
router.get("/profile", authenticateUser, checkAdmin, getAdminProfile);
router.patch("/profile/picture", authenticateUser, checkAdmin, updateAdminProfilePicture);

// Withdrawal approval routes
router.patch("/withdrawal/:transactionId", authenticateUser, checkAdmin, require2FA, approveWithdrawal);

// User management routes
router.post("/create-admin", authenticateUser, checkSuperAdmin, createAdmin);
router.post("/create-super-admin", authenticateUser, checkSuperAdmin, createSuperAdmin);
router.get("/user/:userId", authenticateUser, checkAdmin, getStakesByUserId);
router.get("/users-balances", authenticateUser, checkAdmin, getAllUsersWithBalances);
router.get("/flagged-activities", authenticateUser, checkAdmin, getFlaggedActivities);
router.get("/activity-logs", authenticateUser, checkSuperAdmin, getAdminActivityLogs);

// Transaction management routes
router.get("/transactions", authenticateUser, checkAdmin, getAllTransactions);
router.post("/declare-weekly-profit", authenticateUser, checkAdmin, declareWeeklyProfit);

// KYC review route
router.patch("/kyc/review/:kycId", authenticateUser, checkAdmin, reviewKYCSubmission);

export default router;
