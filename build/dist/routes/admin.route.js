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
router.use(auth_middleware_1.checkAdmin);
router.get("/user/:userId", transaction_controller_1.getStakesByUserId);
router.put("/withdrawals/approve/:transactionId", auth_middleware_1.require2FA, admin_controller_1.approveWithdrawal);
exports.default = router;
