"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const WeeklyProfitSchema = new mongoose_1.default.Schema({
    weekNumber: {
        type: Number,
        required: true,
        unique: true
    },
    profitAmount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});
const WeeklyProfit = mongoose_1.default.model("WeeklyProfit", WeeklyProfitSchema);
exports.default = WeeklyProfit;
