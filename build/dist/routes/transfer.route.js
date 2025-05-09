"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transferUSDT_controller_1 = require("../controllers/transferUSDT.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/", transferUSDT_controller_1.transferUSDT, auth_middleware_1.authenticateUser, auth_middleware_1.require2FA);
exports.default = router;
