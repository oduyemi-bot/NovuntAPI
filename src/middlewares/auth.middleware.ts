import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User, { IUser } from "../models/user.model";

dotenv.config();

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Access token is missing" });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: "User not found. Invalid token." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const checkAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized. User not authenticated." });
    return;
  }

  const allowedRoles = new Set(["admin", "superAdmin"]);
  if (!allowedRoles.has(req.user.role)) {
    res.status(403).json({ message: "Forbidden. User is not an admin." });
    return;
  }

  next();
};

export const checkSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== "superAdmin") {
      res.status(403).json({ message: "Forbidden: Only super administrators can perform this action." });
      return;
  }
  next();
};