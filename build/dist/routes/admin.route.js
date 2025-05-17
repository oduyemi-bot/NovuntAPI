"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const transaction_controller_1 = require("../controllers/transaction.controller");
const router = express_1.default.Router();
router.post("/login", admin_controller_1.adminLogin);
router.post("/logout", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.adminLogout);
router.patch("/password", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.updateAdminPassword);
// Admin profile routes
router.get("/profile", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getAdminProfile);
router.patch("/profile/picture", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.updateAdminProfilePicture);
// Withdrawal approval routes
router.patch("/withdrawal/:transactionId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, auth_middleware_1.require2FA, admin_controller_1.approveWithdrawal);
// User management routes
router.get("/user/:userId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, transaction_controller_1.getStakesByUserId);
router.get("/users-balances", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getAllUsersWithBalances);
router.get("/flagged-activities", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getFlaggedActivities);
router.get("/activity-logs", auth_middleware_1.authenticateUser, auth_middleware_1.checkSuperAdmin, admin_controller_1.getAdminActivityLogs);
// Transaction management routes
router.get("/transactions", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getAllTransactions);
// KYC review route
router.patch("/kyc/review/:kycId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.reviewKYCSubmission);
exports.default = router;
