import { Request, Response } from "express";
import User from "../models/user.model";
import UserWallet from "../models/userWallet.model";
import Transaction from "../models/transaction.model";
import SecurityLog from "../models/securityLog.model";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { transporter } from "../utils/transporter";
import dotenv from "dotenv";

dotenv.config();

export const transferUSDT = async (req: Request, res: Response) => {
  const { senderUsername, recipientUsername, amount } = req.body;

  if (!senderUsername || !recipientUsername || !amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input." });
  }

  if (senderUsername === recipientUsername) {
    return res.status(400).json({ success: false, message: "Sender and recipient cannot be the same." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await User.findOne({ username: senderUsername }).session(session);
    const recipient = await User.findOne({ username: recipientUsername }).session(session);
    const senderWallet = await UserWallet.findOne({ user: sender?._id }).session(session);
    const recipientWallet = await UserWallet.findOne({ user: recipient?._id }).session(session);

    if (!sender || !recipient || !senderWallet || !recipientWallet) {
      throw new Error("Sender or recipient not found.");
    }

    if (senderWallet.balance < amount) {
      throw new Error("Insufficient balance.");
    }

    // Update balances
    senderWallet.balance -= amount;
    recipientWallet.balance += amount;
    await senderWallet.save({ session });
    await recipientWallet.save({ session });

    const txId = uuidv4();

    // Create transaction
    const transaction = new Transaction({
      user: sender._id,
      type: "transfer",
      amount,
      status: "confirmed",
      txId,
      fromUser: sender._id,
      toUser: recipient._id,
      method: "internal",
      netAmount: amount,
      timestamp: new Date(),
    });
    await transaction.save({ session });

    // Log for sender
    await SecurityLog.create([{
      user: sender._id,
      action: "transfer",
      status: "success",
      details: `Sent ${amount} USDT to ${recipient.username}`,
      createdAt: new Date(),
    }], { session });

    // Log for recipient
    await SecurityLog.create([{
      user: recipient._id,
      action: "receive-transfer",
      status: "success",
      details: `Received ${amount} USDT from ${sender.username}`,
      createdAt: new Date(),
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // 🔔 Send email notifications (after transaction is successful)
    const senderEmailOptions = {
      from: `"Novunt Wallet" <${process.env.MAIL_USER}>`,
      to: sender.email,
      subject: "USDT Transfer Successful",
      html: `
        <p>Hi ${sender.fname},</p>
        <p>Your transfer of <strong>${amount} USDT</strong> to <strong>${recipient.username}</strong> was successful.</p>
        <p>Transaction ID: <strong>${txId}</strong></p>
        <p>If you did not authorize this, please contact support immediately.</p>
        <br/>
        <p>– Novunt Team</p>
      `,
    };

    const recipientEmailOptions = {
      from: `"Novunt Wallet" <${process.env.MAIL_USER}>`,
      to: recipient.email,
      subject: "You've Received USDT",
      html: `
        <p>Hi ${recipient.fname},</p>
        <p>You have received <strong>${amount} USDT</strong> from <strong>${sender.username}</strong>.</p>
        <p>Transaction ID: <strong>${txId}</strong></p>
        <p>Log in to your wallet to view your updated balance.</p>
        <br/>
        <p>– Novunt Team</p>
      `,
    };

    // Send emails (fire and forget)
    transporter.sendMail(senderEmailOptions).catch(console.error);
    transporter.sendMail(recipientEmailOptions).catch(console.error);

    return res.status(200).json({ success: true, message: "Transfer successful", txId });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error("Transfer failed:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
