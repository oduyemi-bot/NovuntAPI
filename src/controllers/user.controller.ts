import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User, { IUser } from "../models/user.model";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

const getUsersByRole = async (role?: string) => {
    const filter = role ? { role, isActive: true } : { isActive: true };
    return User.find(filter).select("-password");
};


// Get all active users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await getUsersByRole();
        res.status(200).json(users);
    } catch (error: any) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
};

// Get all administrators
export const getAllAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const administrators = await getUsersByRole("admin");
        res.status(200).json(administrators);
    } catch (error: any) {
        console.error("Error retrieving administrators:", error);
        res.status(500).json({ message: "Error retrieving administrators", error: error.message });
    }
};


// Get all super administrators
export const getAllSuperAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const superAdmins = await getUsersByRole("superAdmin");
        res.status(200).json(superAdmins);
    } catch (error: any) {
        console.error("Error retrieving super administrators:", error);
        res.status(500).json({ message: "Error retrieving super administrators", error: error.message });
    }
};


// Get a single admin by ID
export const getAdminById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }

        const admin = await User.findOne({ _id: id, role: "admin", isActive: true }).select("-password");
        if (!admin) {
            res.status(404).json({ message: "Admin not found" });
            return;
        }

        res.status(200).json(admin);
    } catch (error: any) {
        console.error("Error retrieving admin:", error);
        res.status(500).json({ message: "Error retrieving admin", error: error.message });
    }
};


// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password");

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json(user);
    } catch (error: any) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ message: "Error retrieving user", error: error.message });
    }
};


// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }

        const user = await User.findById(id);
        if (!user || !user.isActive) {
            res.status(404).json({ message: "User not found or inactive" });
            return;
        }

        const updatedUserData: Partial<IUser> = req.body;
        delete updatedUserData.role; // Prevent role update

        if (updatedUserData.password) {
            updatedUserData.password = await bcrypt.hash(updatedUserData.password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(id, updatedUserData, { new: true });
        res.status(200).json({ message: "User profile updated successfully", data: updatedUser });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user" });
    }
};


// Deactivate user
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }

        const user = await User.findById(id);
        if (!user || !user.isActive) {
            res.status(404).json({ message: "User not found or already deactivated" });
            return;
        }

        user.isActive = false;
        await user.save();
        res.status(200).json({ message: "User deactivated successfully" });
    } catch (error) {
        console.error("Error deactivating user:", error);
        res.status(500).json({ message: "Error deactivating user" });
    }
};


// Promote user to admin
export const promoteToAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user || user.role === "admin") {
            res.status(404).json({ message: "User not found or already an admin" });
            return;
        }

        user.role = "admin";
        await user.save();
        res.status(200).json({ message: "User promoted to admin successfully" });
    } catch (error) {
        console.error("Error promoting user:", error);
        res.status(500).json({ message: "Error promoting user" });
    }
};


// Demote admin to user
export const demoteToUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user || user.role !== "admin") {
            res.status(404).json({ message: "User not found or not an admin" });
            return;
        }

        user.role = "user";
        await user.save();
        res.status(200).json({ message: "Admin demoted to user successfully" });
    } catch (error) {
        console.error("Error demoting user:", error);
        res.status(500).json({ message: "Error demoting user" });
    }
};