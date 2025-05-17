import mongoose, { Document } from "mongoose";


export interface IWeeklyProfit extends Document {
    _id: mongoose.Types.ObjectId;
    weekNumber: number;
    profitAmount: number;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
}
const WeeklyProfitSchema = new mongoose.Schema({
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
        default: Date.now },
});

const WeeklyProfit = mongoose.model("WeeklyProfit", WeeklyProfitSchema);
export default WeeklyProfit;
