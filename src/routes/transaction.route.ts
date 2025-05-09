import express from "express";
import { getAllStakes, getBonusStakes, stakeFunds } from "../controllers/transaction.controller";
import { authenticateUser, require2FA } from "../middlewares/auth.middleware";

const router = express.Router();
router.use(authenticateUser);

router.get("/stakes", getAllStakes);
router.get("/stakes/bonus", getBonusStakes);
router.post("/stake", require2FA, stakeFunds);

export default router;
