// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../api/models/User.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errorHandler.js';
import { asyncHandler } from '../utils/errorHandler.js';

/**
 * Generate JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token, secret = process.env.JWT_SECRET || 'your-secret-key') => {
  return jwt.verify(token, secret);
};

/**
 * Authentication middleware
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw new UnauthorizedError('Access token is required');
  }

  try {
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    throw error;
  }
});

/**
 * Authorization middleware - check user roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const authorizeOwnerOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.resource?.[resourceUserField]?.toString();
    const currentUserId = req.user._id.toString();

    if (resourceUserId !== currentUserId) {
      throw new ForbiddenError('Access denied. You can only access your own resources');
    }

    next();
  };
};

/**
 * Middleware to load resource and check ownership
 */
export const loadResourceAndCheckOwnership = (Model, resourceUserField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    const resource = await Model.findById(req.params.id);
    
    if (!resource) {
      throw new NotFoundError('Resource not found');
    }

    req.resource = resource;
    
    // Apply ownership check
    authorizeOwnerOrAdmin(resourceUserField)(req, res, next);
  });
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require authentication
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently ignore token errors for optional auth
    }
  }

  next();
});

/**
 * Refresh token middleware
 */
export const refreshTokenAuth = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  try {
    const decoded = verifyToken(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token type');
    }

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid refresh token');
    } else if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token expired');
    }
    throw error;
  }
});