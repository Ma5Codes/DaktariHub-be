// routes/AppointmentRoute.js
import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Create new appointment (patients only)
router.post(
  '/book',
  // Add role check middleware here if needed
  AppointmentController.createAppointment
);

// Get appointments for current user (patient or doctor)
router.get(
  '/my-appointments',
  (req, res, next) => {
    if (req.user.role === 'patient') {
      return AppointmentController.getPatientAppointments(req, res, next);
    } else if (req.user.role === 'doctor') {
      return AppointmentController.getDoctorAppointments(req, res, next);
    } else {
      return res.status(403).json({ error: 'Invalid role for this endpoint' });
    }
  }
);

// Get doctor notifications (doctors only)
router.get(
  '/notifications',
  (req, res, next) => {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access notifications' });
    }
    return AppointmentController.getDoctorNotifications(req, res, next);
  }
);

// Get specific appointment by ID
router.get(
  '/:appointmentId',
  AppointmentController.getAppointmentById
);

// Update appointment status
router.patch(
  '/:appointmentId/status',
  AppointmentController.updateAppointmentStatus
);

export default router;