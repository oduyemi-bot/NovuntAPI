"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transaction_controller_1 = require("../controllers/transaction.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateUser);
router.post("/deposit", auth_middleware_1.authenticateUser, auth_controller_1.verify2FA, transaction_controller_1.initiateDeposit);
router.post("/webhook/deposit", transaction_controller_1.confirmDepositWebhook);
router.get("/stakes", transaction_controller_1.getAllStakes);
router.get("/stakes/history/:userId", transaction_controller_1.getStakesByUserId);
router.get("/stakes/bonus", transaction_controller_1.getBonusStakes);
router.post("/stake", auth_middleware_1.require2FA, transaction_controller_1.stakeFunds);
exports.default = router;
