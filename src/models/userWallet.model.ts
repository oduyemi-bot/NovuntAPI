import mongoose, { Document, Schema, Model } from "mongoose";


export interface IUserWallet extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    walletAddress?: string;
    balance: number;
    totalDeposited: number;
    totalWithdrawn: number;
    createdAt: Date;
  }
  
  const userWalletSchema = new Schema<IUserWallet>(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
      },
      walletAddress: {
        type: String, // Format to be validated later based on USDT chain (ERC20, TRC20, etc.)
        default: null,
        sparse: true, // Allows multiple users to have null wallet addresses
      },
      balance: {
        type: Number,
        default: 0,
      },
      totalDeposited: {
        type: Number,
        default: 0,
      },
      totalWithdrawn: {
        type: Number,
        default: 0,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  );
  

const UserWallet =  mongoose.model<IUserWallet>('UserWallet', userWalletSchema);
export default UserWallet;