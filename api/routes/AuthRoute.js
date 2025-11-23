// routes/AuthRoute.js
import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { userValidation, handleValidationErrors } from '../../utils/validation.js';
import { authenticate, refreshTokenAuth } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', userValidation.register, handleValidationErrors, AuthController.register);
router.post('/login', userValidation.login, handleValidationErrors, AuthController.login);
router.post('/refresh-token', refreshTokenAuth, AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, userValidation.updateProfile, handleValidationErrors, AuthController.updateProfile);
router.put('/change-password', authenticate, AuthController.changePassword);

export default router;