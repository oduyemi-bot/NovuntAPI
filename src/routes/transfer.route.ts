import express from "express";
import { transferUSDT } from "../controllers/transferUSDT.controller";
import { authenticateUser, require2FA } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/", transferUSDT, authenticateUser, require2FA);

export default router;
