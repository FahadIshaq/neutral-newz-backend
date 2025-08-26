import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }

  next();
};
