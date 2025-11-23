// controllers/PatientController.js
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { 
  asyncHandler, 
  NotFoundError 
} from '../../utils/errorHandler.js';

export class PatientController {
  /**
   * Get all patients (admin/doctor only)
   */
  static getAllPatients = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
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
        { patientId: searchRegex }
      ];
    }

    // Get patients with pagination
    const patients = await Patient.find(filter)
      .populate('user', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Patient.countDocuments(filter);

    res.json(
      ApiResponse.paginated(
        'Patients retrieved successfully',
        patients,
        { page, limit, total }
      )
    );
  });

  /**
   * Get patient by ID
   */
  static getPatientById = asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id)
      .populate('user', 'name email profileImage createdAt');

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    res.json(
      ApiResponse.success(
        'Patient retrieved successfully',
        patient
      )
    );
  });

  /**
   * Create patient profile
   */
  static createPatient = asyncHandler(async (req, res) => {
    const {
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      bloodGroup
    } = req.body;

    // Create patient profile
    const patient = await Patient.create({
      user: req.user._id,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      bloodGroup
    });

    // Populate user details
    await patient.populate('user', 'name email');

    res.status(201).json(
      ApiResponse.success(
        'Patient profile created successfully',
        patient
      )
    );
  });

  /**
   * Update patient profile
   */
  static updatePatient = asyncHandler(async (req, res) => {
    const {
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      bloodGroup
    } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    // Update fields
    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
    if (gender) patient.gender = gender;
    if (phoneNumber) patient.phoneNumber = phoneNumber;
    if (address) patient.address = { ...patient.address, ...address };
    if (emergencyContact) patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
    if (medicalHistory) patient.medicalHistory = medicalHistory;
    if (allergies) patient.allergies = allergies;
    if (bloodGroup) patient.bloodGroup = bloodGroup;

    await patient.save();
    await patient.populate('user', 'name email');

    res.json(
      ApiResponse.success(
        'Patient profile updated successfully',
        patient
      )
    );
  });

  /**
   * Delete patient profile
   */
  static deletePatient = asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    await Patient.findByIdAndDelete(req.params.id);

    res.json(
      ApiResponse.success('Patient profile deleted successfully')
    );
  });

  /**
   * Get patient appointments
   */
  static getPatientAppointments = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { patient: req.params.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.from && req.query.to) {
      filter.appointmentDate = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    // Get appointments with pagination
    const appointments = await Appointment.find(filter)
      .populate('doctor', 'doctorId specialization consultationFee')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    res.json(
      ApiResponse.paginated(
        'Patient appointments retrieved successfully',
        appointments,
        { page, limit, total }
      )
    );
  });

  /**
   * Get patient medical history
   */
  static getMedicalHistory = asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id).select('medicalHistory allergies bloodGroup');

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    res.json(
      ApiResponse.success(
        'Medical history retrieved successfully',
        {
          medicalHistory: patient.medicalHistory,
          allergies: patient.allergies,
          bloodGroup: patient.bloodGroup
        }
      )
    );
  });

  /**
   * Add medical history entry
   */
  static addMedicalHistory = asyncHandler(async (req, res) => {
    const { condition, diagnosedDate, status, notes } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    patient.medicalHistory.push({
      condition,
      diagnosedDate,
      status,
      notes
    });

    await patient.save();

    res.status(201).json(
      ApiResponse.success(
        'Medical history entry added successfully',
        patient.medicalHistory[patient.medicalHistory.length - 1]
      )
    );
  });

  /**
   * Add allergy
   */
  static addAllergy = asyncHandler(async (req, res) => {
    const { allergen, severity, notes } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    patient.allergies.push({
      allergen,
      severity,
      notes
    });

    await patient.save();

    res.status(201).json(
      ApiResponse.success(
        'Allergy added successfully',
        patient.allergies[patient.allergies.length - 1]
      )
    );
  });
}
