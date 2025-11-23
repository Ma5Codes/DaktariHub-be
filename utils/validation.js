// utils/validation.js
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

/**
 * Handle validation errors middleware
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError(validationErrors);
  }
  
  next();
};

/**
 * User validation rules
 */
export const userValidation = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('role')
      .isIn(['patient', 'doctor', 'admin'])
      .withMessage('Role must be either patient, doctor, or admin')
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email')
  ]
};

/**
 * Patient validation rules
 */
export const patientValidation = {
  create: [
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Please enter a valid date of birth'),
    
    body('gender')
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Gender must be Male, Female, or Other'),
    
    body('phoneNumber')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please enter a valid phone number'),
    
    body('emergencyContact.name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Emergency contact name is required'),
    
    body('emergencyContact.relationship')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Emergency contact relationship is required'),
    
    body('emergencyContact.phoneNumber')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please enter a valid emergency contact phone number'),
    
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group')
  ],
  
  update: [
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please enter a valid date of birth'),
    
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Gender must be Male, Female, or Other'),
    
    body('phoneNumber')
      .optional()
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please enter a valid phone number')
  ]
};

/**
 * Doctor validation rules
 */
export const doctorValidation = {
  create: [
    body('specialization')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Specialization is required'),
    
    body('qualification')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Qualification is required'),
    
    body('experience')
      .isInt({ min: 0 })
      .withMessage('Experience must be a non-negative number'),
    
    body('consultationFee')
      .isFloat({ min: 0 })
      .withMessage('Consultation fee must be a non-negative number'),
    
    body('phoneNumber')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please enter a valid phone number'),
    
    body('availability')
      .isArray({ min: 1 })
      .withMessage('At least one availability slot is required'),
    
    body('availability.*.day')
      .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Invalid day'),
    
    body('availability.*.startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    
    body('availability.*.endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format')
  ]
};

/**
 * Appointment validation rules
 */
export const appointmentValidation = {
  create: [
    body('doctorId')
      .isMongoId()
      .withMessage('Invalid doctor ID'),
    
    body('appointmentDate')
      .isISO8601()
      .withMessage('Please enter a valid appointment date')
      .custom((value) => {
        const appointmentDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (appointmentDate < today) {
          throw new Error('Appointment date cannot be in the past');
        }
        return true;
      }),
    
    body('appointmentTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Appointment time must be in HH:MM format'),
    
    body('reasonForVisit')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Reason for visit must be between 5 and 500 characters'),
    
    body('type')
      .optional()
      .isIn(['consultation', 'follow-up', 'emergency', 'routine-checkup'])
      .withMessage('Invalid appointment type'),
    
    body('duration')
      .optional()
      .isInt({ min: 15, max: 180 })
      .withMessage('Duration must be between 15 and 180 minutes')
  ],
  
  update: [
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
      .withMessage('Invalid appointment status'),
    
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ]
};

/**
 * Common validation rules
 */
export const commonValidation = {
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],
  
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};