import mongoose, { Schema, Document } from "mongoose";

export interface IReferralBonus extends Document {
  user: mongoose.Types.ObjectId;       
  referredUser: mongoose.Types.ObjectId; 
  amount: number;
  level: number;                       // 1-5
  createdAt: Date;
  stakeActivatedByDeadline: boolean;
  depletionStartedAt?: Date;
  depletedPercent: number; // 0 to 100
  fullyDepleted: boolean;
}

const referralBonusSchema = new Schema<IReferralBonus>({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    referredUser: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    level: { 
        type: Number, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    stakeActivatedByDeadline: { 
        type: Boolean, 
        default: false 
    },
    depletionStartedAt: { 
        type: Date 
    },
    depletedPercent: { 
        type: Number, 
        default: 0 
    },
    fullyDepleted: { 
        type: Boolean, 
        default: false 
    }
});

export default mongoose.model<IReferralBonus>('ReferralBonus', referralBonusSchema);
