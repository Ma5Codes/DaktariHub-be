// controllers/DoctorController.js
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { 
  asyncHandler, 
  NotFoundError 
} from '../../utils/errorHandler.js';

export class DoctorController {
  /**
   * Get all doctors
   */
  static getAllDoctors = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.specialization) {
      filter.specialization = new RegExp(req.query.specialization, 'i');
    }
    if (req.query.isVerified !== undefined) {
      filter.isVerified = req.query.isVerified === 'true';
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const userIds = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).distinct('_id');
      
      filter.$or = [
        { user: { $in: userIds } },
        { doctorId: searchRegex },
        { specialization: searchRegex }
      ];
    }

    // Get doctors with pagination
    const doctors = await Doctor.find(filter)
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(filter);

    res.json(
      ApiResponse.paginated(
        'Doctors retrieved successfully',
        doctors,
        { page, limit, total }
      )
    );
  });

  /**
   * Get doctor by ID
   */
  static getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'name email profileImage createdAt');

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    res.json(
      ApiResponse.success(
        'Doctor retrieved successfully',
        doctor
      )
    );
  });

  /**
   * Create doctor profile
   */
  static createDoctor = asyncHandler(async (req, res) => {
    const {
      specialization,
      qualification,
      experience,
      consultationFee,
      availability,
      phoneNumber,
      address
    } = req.body;

    // Create doctor profile
    const doctor = await Doctor.create({
      user: req.user._id,
      specialization,
      qualification,
      experience,
      consultationFee,
      availability,
      phoneNumber,
      address
    });

    // Populate user details
    await doctor.populate('user', 'name email');

    res.status(201).json(
      ApiResponse.success(
        'Doctor profile created successfully',
        doctor
      )
    );
  });

  /**
   * Update doctor profile
   */
  static updateDoctor = asyncHandler(async (req, res) => {
    const {
      specialization,
      qualification,
      experience,
      consultationFee,
      availability,
      phoneNumber,
      address
    } = req.body;

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    // Update fields
    if (specialization) doctor.specialization = specialization;
    if (qualification) doctor.qualification = qualification;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (availability) doctor.availability = availability;
    if (phoneNumber) doctor.phoneNumber = phoneNumber;
    if (address) doctor.address = { ...doctor.address, ...address };

    await doctor.save();
    await doctor.populate('user', 'name email');

    res.json(
      ApiResponse.success(
        'Doctor profile updated successfully',
        doctor
      )
    );
  });

  /**
   * Get doctor appointments
   */
  static getDoctorAppointments = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { doctor: req.params.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      filter.appointmentDate = {
        $gte: date,
        $lt: nextDate
      };
    }

    // Get appointments with pagination
    const appointments = await Appointment.find(filter)
      .populate('patient')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    res.json(
      ApiResponse.paginated(
        'Doctor appointments retrieved successfully',
        appointments,
        { page, limit, total }
      )
    );
  });

  /**
   * Get doctor availability
   */
  static getAvailability = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select('availability');

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    res.json(
      ApiResponse.success(
        'Doctor availability retrieved successfully',
        doctor.availability
      )
    );
  });

  /**
   * Update doctor availability
   */
  static updateAvailability = asyncHandler(async (req, res) => {
    const { availability } = req.body;

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    doctor.availability = availability;
    await doctor.save();

    res.json(
      ApiResponse.success(
        'Doctor availability updated successfully',
        doctor.availability
      )
    );
  });
}