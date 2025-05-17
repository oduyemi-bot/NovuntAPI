import express from "express";
import {  
    deleteUser, 
    demoteToUser, 
    getAdminById, 
    getAllAdmin, 
    getAllUsers, 
    getUserById, 
    promoteToAdmin, 
    updateProfilePicture, 
    updateUser 
} from "../controllers/user.controller";
import { authenticateUser, checkAdmin, require2FA } from "../middlewares/auth.middleware";
import { checkSuperAdmin } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/admin", getAllAdmin);
router.get("/user/:id", getUserById);
router.patch("/user/:id/profile-picture", authenticateUser, updateProfilePicture);
router.get("/admin/:id", getAdminById);
router.patch("/:id", authenticateUser, require2FA, checkAdmin, updateUser);
router.patch("/:id/role/admin", authenticateUser, checkAdmin, promoteToAdmin);
router.patch("/:id/role/user", authenticateUser, checkSuperAdmin, demoteToUser);
router.post("/:id", authenticateUser, checkAdmin, deleteUser);

export default router;