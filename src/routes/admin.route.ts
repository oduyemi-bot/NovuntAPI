import express from "express";
import { approveWithdrawal } from "../controllers/admin.controller";
import { checkAdmin, require2FA } from "../middlewares/auth.middleware";
import { getStakesByUserId } from "../controllers/transaction.controller";


const router = express.Router();
router.use(checkAdmin);

router.get("/user/:userId", getStakesByUserId);
router.put("/withdrawals/approve/:transactionId", require2FA, approveWithdrawal);

export default router;
