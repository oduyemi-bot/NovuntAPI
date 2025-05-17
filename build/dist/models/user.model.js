"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sendMail_1 = require("../utils/sendMail");
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_$!%*?&])[A-Za-z\d@_$!%*?&]{8,}$/;
const userSchema = new mongoose_1.Schema({
    fname: {
        type: String,
        required: [true, "First name is required"]
    },
    lname: {
        type: String,
        required: [true, "Last name is required"]
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        unique: true,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        validate: {
            validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            message: "Invalid email format",
        },
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
        select: false,
    },
    profilePicture: {
        type: String
    },
    twoFAEnabled: {
        type: Boolean,
        default: false
    },
    twoFASecret: {
        type: String // For Google Authenticator
    },
    role: {
        type: String,
        enum: ["admin", "superAdmin", "user"],
        default: "user"
    },
    referrer: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
    },
    referralBonusBalance: {
        type: Number,
        default: 0,
    },
    rank: {
        type: String,
        enum: ["None", "Associate Staker", "Principal Strategist", "Elite Capitalist", "Wealth Architect", "Finance Titan"],
        default: "None",
    },
    directDownlines: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "User"
        }],
    teamStake: {
        type: Number, default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetSecret: { type: String, select: false },
    resetToken: { type: String, select: false },
    resetTokenExpiration: { type: Number, select: false },
}, { timestamps: true });
const User = mongoose_1.default.model("User", userSchema);
function addSuperAdmins() {
    return __awaiter(this, void 0, void 0, function* () {
        const superAdminUsers = [
            {
                fname: "Opeyemi",
                lname: "Oduyemi",
                email: "hello@yemi.dev",
                username: "oduyemi",
                phone: "+2348166336187",
                password: process.env.OPEYEMI,
                role: "superAdmin",
            },
            // Add more if needed
        ];
        for (const user of superAdminUsers) {
            try {
                const exists = yield User.findOne({
                    $or: [{ email: user.email }, { username: user.username }],
                });
                if (exists) {
                    console.log(`⚠️ SuperAdmin ${user.email} already exists. Skipping...`);
                    continue;
                }
                if (!user.password) {
                    throw new Error(`Missing password for ${user.email}`);
                }
                const hashedPassword = yield bcryptjs_1.default.hash(user.password, 10);
                const newUser = new User(Object.assign(Object.assign({}, user), { password: hashedPassword }));
                yield newUser.save();
                console.log(`✅ SuperAdmin ${user.email} added.`);
                (0, logger_1.logAudit)(`SuperAdmin created: ${user.email} (${user.username})`);
                yield (0, sendMail_1.sendAdminWelcomeEmail)(user.email, user.fname);
            }
            catch (err) {
                console.error(`❌ Failed to add ${user.email}:`, err.message);
                (0, logger_1.logAudit)(`❌ Failed to add SuperAdmin ${user.email}: ${err.message}`);
            }
        }
    });
}
addSuperAdmins().catch((err) => console.error("SuperAdmin setup failed:", err));
exports.default = User;
