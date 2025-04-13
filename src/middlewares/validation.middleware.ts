import { Request, Response, NextFunction } from "express";

// Validate request body
export const validateRequestBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
      return; 
    }
    next();
  };
};


// Validate login request: requires either email or username, and always password
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    res.status(400).json({
      error: "Either email or username is required, and password must be provided",
    });
    return;
  }

  next();
};



// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const validatePassword = (req: Request, res: Response, next: NextFunction): void => {
    const { password } = req.body;
    
    if (!password || !passwordRegex.test(password)) {
        res.status(400).json({
            message: "Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
        return;
    }

    next();
};