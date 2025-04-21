"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoteToUser = exports.promoteToAdmin = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAdminById = exports.getAllSuperAdmin = exports.getAllAdmin = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
const getUsersByRole = (role) => __awaiter(void 0, void 0, void 0, function* () {
    const filter = role ? { role, isActive: true } : { isActive: true };
    return user_model_1.default.find(filter).select("-password");
});
// Get all active users
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield getUsersByRole();
        res.status(200).json(users);
    }
    catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
});
exports.getAllUsers = getAllUsers;
// Get all administrators
const getAllAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const administrators = yield getUsersByRole("admin");
        res.status(200).json(administrators);
    }
    catch (error) {
        console.error("Error retrieving administrators:", error);
        res.status(500).json({ message: "Error retrieving administrators", error: error.message });
    }
});
exports.getAllAdmin = getAllAdmin;
// Get all super administrators
const getAllSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const superAdmins = yield getUsersByRole("superAdmin");
        res.status(200).json(superAdmins);
    }
    catch (error) {
        console.error("Error retrieving super administrators:", error);
        res.status(500).json({ message: "Error retrieving super administrators", error: error.message });
    }
});
exports.getAllSuperAdmin = getAllSuperAdmin;
// Get a single admin by ID
const getAdminById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }
        const admin = yield user_model_1.default.findOne({ _id: id, role: "admin", isActive: true }).select("-password");
        if (!admin) {
            res.status(404).json({ message: "Admin not found" });
            return;
        }
        res.status(200).json(admin);
    }
    catch (error) {
        console.error("Error retrieving admin:", error);
        res.status(500).json({ message: "Error retrieving admin", error: error.message });
    }
});
exports.getAdminById = getAdminById;
// Get user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_model_1.default.findById(id).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ message: "Error retrieving user", error: error.message });
    }
});
exports.getUserById = getUserById;
// Update user
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }
        const user = yield user_model_1.default.findById(id);
        if (!user || !user.isActive) {
            res.status(404).json({ message: "User not found or inactive" });
            return;
        }
        const updatedUserData = req.body;
        delete updatedUserData.role; // Prevent role update
        if (updatedUserData.password) {
            updatedUserData.password = yield bcryptjs_1.default.hash(updatedUserData.password, 10);
        }
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(id, updatedUserData, { new: true });
        res.status(200).json({ message: "User profile updated successfully", data: updatedUser });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user" });
    }
});
exports.updateUser = updateUser;
// Deactivate user
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "Invalid user ID format" });
            return;
        }
        const user = yield user_model_1.default.findById(id);
        if (!user || !user.isActive) {
            res.status(404).json({ message: "User not found or already deactivated" });
            return;
        }
        user.isActive = false;
        yield user.save();
        res.status(200).json({ message: "User deactivated successfully" });
    }
    catch (error) {
        console.error("Error deactivating user:", error);
        res.status(500).json({ message: "Error deactivating user" });
    }
});
exports.deleteUser = deleteUser;
// Promote user to admin
const promoteToAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_model_1.default.findById(id);
        if (!user || user.role === "admin") {
            res.status(404).json({ message: "User not found or already an admin" });
            return;
        }
        user.role = "admin";
        yield user.save();
        res.status(200).json({ message: "User promoted to admin successfully" });
    }
    catch (error) {
        console.error("Error promoting user:", error);
        res.status(500).json({ message: "Error promoting user" });
    }
});
exports.promoteToAdmin = promoteToAdmin;
// Demote admin to user
const demoteToUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_model_1.default.findById(id);
        if (!user || user.role !== "admin") {
            res.status(404).json({ message: "User not found or not an admin" });
            return;
        }
        user.role = "user";
        yield user.save();
        res.status(200).json({ message: "Admin demoted to user successfully" });
    }
    catch (error) {
        console.error("Error demoting user:", error);
        res.status(500).json({ message: "Error demoting user" });
    }
});
exports.demoteToUser = demoteToUser;
