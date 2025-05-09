import express from "express";
import { getAllWallets, getUserWallet, getUserWalletByUserID } from "../controllers/userWallet.controller";
import { authenticateUser, checkAdmin, require2FA } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/", getAllWallets);
router.get("/my-wallet", authenticateUser, require2FA, getUserWallet);
router.get("/:id", checkAdmin, getUserWalletByUserID);

export default router;
