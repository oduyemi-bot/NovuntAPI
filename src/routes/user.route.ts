import express from "express";
import {  
    deleteUser, 
    demoteToUser, 
    getAdminById, 
    getAllAdmin, 
    getAllUsers, 
    getUserById, 
    promoteToAdmin, 
    updateUser 
} from "../controllers/user.controller";
import { authenticateUser, checkAdmin } from "../middlewares/auth.middleware";
import { checkSuperAdmin } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/admin", getAllAdmin);
router.get("/user/:id", getUserById);
router.get("/admin/:id", getAdminById);
router.put("/:id", authenticateUser, checkAdmin, updateUser);
router.put("/:id/role/admin", authenticateUser, checkAdmin, promoteToAdmin);
router.put("/:id/role/user", authenticateUser, checkSuperAdmin, demoteToUser);
router.delete("/:id", authenticateUser, checkAdmin, deleteUser);

export default router;