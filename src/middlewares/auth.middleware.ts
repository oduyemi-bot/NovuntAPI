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
    };

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userID: string };
    const user = await User.findById(decoded.userID);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired. Please login again." });
    } else {
      res.status(401).json({ message: "Invalid token." });
    }    
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


export const require2FA = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.twoFAEnabled) {
    return res.status(403).json({ message: "2FA required" });
  }
  next();
};
