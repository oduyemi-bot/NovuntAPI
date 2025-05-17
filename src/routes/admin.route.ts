import express from "express";
import { adminLogin, approveWithdrawal } from "../controllers/admin.controller";
import { checkAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";


const router = express.Router();
router.use(checkAdmin);

router.post("/login", adminLogin);
router.get("/user/:userId", getStakesByUserId);
router.put("/withdrawals/approve/:transactionId", require2FA, approveWithdrawal);

export default router;


