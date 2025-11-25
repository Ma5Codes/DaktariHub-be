// controllers/AuthController.js
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { 
  asyncHandler, 
  AppError, 
  NotFoundError, 
  ConflictError,
  UnauthorizedError 
} from '../../utils/errorHandler.js';
import { 
  generateToken, 
  generateRefreshToken 
} from '../../middleware/auth.js';

export class AuthController {
  /**
   * Register a new user
   */
  static register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    // Create role-specific profile with minimal required data
    let profile = null;
    if (role === 'patient') {
      // Create new patient instance and let pre-save hook generate patientId
      profile = new Patient({ 
        user: user._id,
        dateOfBirth: new Date('2000-01-01'), // Default date - to be updated
        gender: 'Other', // Default - to be updated
        phoneNumber: '+1234567890', // Default - to be updated
        emergencyContact: {
          name: 'Not provided',
          relationship: 'Not provided',
          phoneNumber: '+1234567890'
        }
      });
      await profile.save(); // This will trigger the pre-save hook to generate patientId
    } else if (role === 'doctor') {
      // Create new doctor instance with default values for required fields
      profile = new Doctor({ 
        user: user._id,
        specialization: 'General Practice', // Default - to be updated
        qualification: 'MD', // Default - to be updated
        experience: 0, // Default - to be updated
        consultationFee: 100, // Default - to be updated
        phoneNumber: '+1234567890', // Default - to be updated
        availability: [{
          day: 'Monday',
          startTime: '09:00',
          endTime: '17:00'
        }] // Default availability - to be updated
      });
      await profile.save(); // This will trigger the pre-save hook to generate doctorId
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json(
      ApiResponse.success(
        'User registered successfully',
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          profile: profile ? {
            id: profile._id,
            ...(role === 'patient' ? { patientId: profile.patientId } : { doctorId: profile.doctorId })
          } : null,
          accessToken
        }
      )
    );
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Update last login
    await user.updateLastLogin();

    // Get user profile based on role
    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id }).populate('user', 'name email');
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json(
      ApiResponse.success(
        'Login successful',
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          },
          profile: profile ? {
            id: profile._id,
            ...(user.role === 'patient' 
              ? { 
                  patientId: profile.patientId,
                  age: profile.age,
                  gender: profile.gender 
                }
              : { 
                  doctorId: profile.doctorId,
                  specialization: profile.specialization,
                  isVerified: profile.isVerified 
                }
            )
          } : null,
          accessToken
        }
      )
    );
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // User is already validated by refreshTokenAuth middleware
    const newAccessToken = generateToken(req.user._id);
    const newRefreshToken = generateRefreshToken(req.user._id);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json(
      ApiResponse.success(
        'Token refreshed successfully',
        {
          accessToken: newAccessToken
        }
      )
    );
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req, res) => {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json(
      ApiResponse.success('Logout successful')
    );
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = req.user;

    // Get user profile based on role
    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id });
    }

    res.json(
      ApiResponse.success(
        'Profile retrieved successfully',
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          },
          profile
        }
      )
    );
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const { name, profileImage } = req.body;
    const user = req.user;

    // Update user basic info
    if (name) user.name = name;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.json(
      ApiResponse.success(
        'Profile updated successfully',
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage
          }
        }
      )
    );
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json(
      ApiResponse.success('Password changed successfully')
    );
  });
}