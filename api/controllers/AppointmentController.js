// controllers/AppointmentController.js
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/errorHandler.js';
import mongoose from 'mongoose';

export class AppointmentController {
  /**
   * Create a new appointment
   */
  static createAppointment = asyncHandler(async (req, res) => {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      reasonForVisit,
      symptoms,
      type = 'consultation',
      duration = 30
    } = req.body;

    // Validate required fields
    if (!doctorId || !appointmentDate || !appointmentTime || !reasonForVisit) {
      return res.status(400).json(
        ApiResponse.error('All required fields must be provided')
      );
    }

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json(
        ApiResponse.error('Doctor not found')
      );
    }

    // Validate patient exists (from auth middleware)
    const patientId = req.user.profile; // This should be the patient's profile ID
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json(
        ApiResponse.error('Patient profile not found')
      );
    }

    // Check for conflicting appointments
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDateTime.getTime() - 30 * 60000), // 30 minutes before
        $lte: new Date(appointmentDateTime.getTime() + 30 * 60000)  // 30 minutes after
      },
      status: { $nin: ['cancelled', 'no-show'] }
    });

    if (conflictingAppointment) {
      return res.status(409).json(
        ApiResponse.error('Doctor is not available at this time')
      );
    }

    // Create appointment
    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      duration,
      reasonForVisit,
      symptoms: symptoms || [],
      type,
      fees: {
        consultationFee: doctor.consultationFee || 100,
        additionalCharges: 0,
        totalAmount: doctor.consultationFee || 100
      },
      status: 'scheduled'
    });

    await appointment.save();

    // Populate the appointment data for response
    await appointment.populate([
      { path: 'patient', select: 'firstName lastName email phone' },
      { path: 'doctor', select: 'firstName lastName specialty consultationFee' }
    ]);

    res.status(201).json(
      ApiResponse.success(
        'Appointment booked successfully',
        appointment
      )
    );
  });

  /**
   * Get all appointments for a patient
   */
  static getPatientAppointments = asyncHandler(async (req, res) => {
    const patientId = req.user.profile;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { patient: patientId };
    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'firstName lastName specialty consultationFee')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json(
      ApiResponse.success(
        'Patient appointments retrieved successfully',
        appointments,
        {
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      )
    );
  });

  /**
   * Get all appointments for a doctor
   */
  static getDoctorAppointments = asyncHandler(async (req, res) => {
    const doctorId = req.user.profile;
    const { status, date, page = 1, limit = 10 } = req.query;

    const filter = { doctor: doctorId };
    if (status) {
      filter.status = status;
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      filter.appointmentDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName email phone')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json(
      ApiResponse.success(
        'Doctor appointments retrieved successfully',
        appointments,
        {
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      )
    );
  });

  /**
   * Update appointment status
   */
  static updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    if (!['confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json(
        ApiResponse.error('Invalid appointment status')
      );
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json(
        ApiResponse.error('Appointment not found')
      );
    }

    // Check if user has permission to update this appointment
    const userRole = req.user.role;
    const userId = req.user.profile;

    if (userRole === 'patient' && appointment.patient.toString() !== userId) {
      return res.status(403).json(
        ApiResponse.error('Not authorized to update this appointment')
      );
    }

    if (userRole === 'doctor' && appointment.doctor.toString() !== userId) {
      return res.status(403).json(
        ApiResponse.error('Not authorized to update this appointment')
      );
    }

    appointment.status = status;
    if (notes) {
      appointment.notes = notes;
    }

    await appointment.save();

    await appointment.populate([
      { path: 'patient', select: 'firstName lastName email phone' },
      { path: 'doctor', select: 'firstName lastName specialty' }
    ]);

    res.json(
      ApiResponse.success(
        'Appointment status updated successfully',
        appointment
      )
    );
  });

  /**
   * Get doctor notifications (pending appointments)
   */
  static getDoctorNotifications = asyncHandler(async (req, res) => {
    const doctorId = req.user.profile;

    // Get new appointments (scheduled status) from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await Appointment.find({
      doctor: doctorId,
      status: 'scheduled',
      appointmentDate: { $gte: today }
    })
      .populate('patient', 'firstName lastName')
      .sort({ appointmentDate: 1 })
      .limit(10);

    res.json(
      ApiResponse.success(
        'Doctor notifications retrieved successfully',
        notifications
      )
    );
  });

  /**
   * Get appointment by ID
   */
  static getAppointmentById = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialty consultationFee');

    if (!appointment) {
      return res.status(404).json(
        ApiResponse.error('Appointment not found')
      );
    }

    // Check if user has permission to view this appointment
    const userRole = req.user.role;
    const userId = req.user.profile;

    if (userRole === 'patient' && appointment.patient._id.toString() !== userId) {
      return res.status(403).json(
        ApiResponse.error('Not authorized to view this appointment')
      );
    }

    if (userRole === 'doctor' && appointment.doctor._id.toString() !== userId) {
      return res.status(403).json(
        ApiResponse.error('Not authorized to view this appointment')
      );
    }

    res.json(
      ApiResponse.success(
        'Appointment retrieved successfully',
        appointment
      )
    );
  });
}