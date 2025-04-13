import express from "express";
import { getIndex } from "../controllers/app.controller";

const router = express.Router();


router.get("/", getIndex);



export default router;