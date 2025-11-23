// routes/PatientRoute.js
import express from 'express';
import { PatientController } from '../controllers/PatientController.js';
import { 
  patientValidation, 
  commonValidation, 
  handleValidationErrors 
} from '../../utils/validation.js';
import { 
  authenticate, 
  authorize, 
  loadResourceAndCheckOwnership 
} from '../../middleware/auth.js';
import { Patient } from '../models/Patient.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Admin/Doctor only routes
router.get(
  '/', 
  authorize('admin', 'doctor'), 
  commonValidation.pagination, 
  handleValidationErrors, 
  PatientController.getAllPatients
);

// Patient profile routes
router.post(
  '/', 
  authorize('patient'), 
  patientValidation.create, 
  handleValidationErrors, 
  PatientController.createPatient
);

router.get(
  '/:id', 
  commonValidation.mongoId, 
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.getPatientById
);

router.put(
  '/:id', 
  commonValidation.mongoId,
  patientValidation.update,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.updatePatient
);

router.delete(
  '/:id', 
  commonValidation.mongoId,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.deletePatient
);

// Patient appointments
router.get(
  '/:id/appointments',
  commonValidation.mongoId,
  commonValidation.pagination,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.getPatientAppointments
);

// Medical history routes
router.get(
  '/:id/medical-history',
  commonValidation.mongoId,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.getMedicalHistory
);

router.post(
  '/:id/medical-history',
  commonValidation.mongoId,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.addMedicalHistory
);

router.post(
  '/:id/allergies',
  commonValidation.mongoId,
  handleValidationErrors,
  loadResourceAndCheckOwnership(Patient),
  PatientController.addAllergy
);

export default router;
