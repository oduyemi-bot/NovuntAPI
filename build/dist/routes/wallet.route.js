"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userWallet_controller_1 = require("../controllers/userWallet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
router.get("/", userWallet_controller_1.getAllWallets);
router.get("/my-wallet", auth_middleware_1.authenticateUser, auth_middleware_1.require2FA, userWallet_controller_1.getUserWallet);
router.get("/:id", auth_middleware_1.checkAdmin, userWallet_controller_1.getUserWalletByUserID);
exports.default = router;
