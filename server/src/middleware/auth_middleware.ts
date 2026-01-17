import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

// include user infor
export interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

// token authentication middleware
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const verified = jwt.verify(token, SECRET) as any;
    req.user = verified;
    next(); 
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// check roles
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// Role Checker Middleware
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // "req.user" is set by the authenticateToken function
    const user = (req as any).user; 

    if (!user) return res.status(401).json({ error: "Access denied" });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: You do not have permission" });
    }

    next();
  };
};