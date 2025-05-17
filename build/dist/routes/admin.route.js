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
router.get("/user/:userId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, transaction_controller_1.getStakesByUserId);
router.patch("/withdrawal/:transactionId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.approveWithdrawal);
router.get("/transactions", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getAllTransactions);
router.get("/users-balances", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getAllUsersWithBalances);
router.get("/flagged-activities", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, admin_controller_1.getFlaggedActivities);
router.put("/withdrawals/approve/:transactionId", auth_middleware_1.authenticateUser, auth_middleware_1.checkAdmin, auth_middleware_1.require2FA, admin_controller_1.approveWithdrawal);
router.get("/activity-logs", auth_middleware_1.authenticateUser, auth_middleware_1.checkSuperAdmin, admin_controller_1.getAdminActivityLogs);
exports.default = router;
