"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const withdrawal_controller_1 = require("../controllers/withdrawal.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/withdraw", auth_middleware_1.authenticateUser, auth_middleware_1.require2FA, withdrawal_controller_1.requestWithdrawal);
router.post("/mock", withdrawal_controller_1.requestMockWithdrawal);
exports.default = router;
