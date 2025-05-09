// utils/logSecurityEvent.ts
import mongoose from "mongoose";
import SecurityLog from "../models/securityLog.model";

export const logSecurityEvent = async ({
  user,
  action,
  status,
  ipAddress,
  userAgent,
  details,
}: {
  user: mongoose.Types.ObjectId;
  action: string;
  status: "success" | "failure";
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}) => {
  await SecurityLog.create({
    user,
    action,
    status,
    ipAddress,
    userAgent,
    details,
  });
};
