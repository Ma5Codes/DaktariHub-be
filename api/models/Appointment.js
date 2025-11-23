// models/Appointment.js
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    required: [true, 'Appointment ID is required']
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor reference is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [180, 'Maximum appointment duration is 180 minutes']
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      message: 'Invalid appointment status'
    },
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: {
      values: ['consultation', 'follow-up', 'emergency', 'routine-checkup'],
      message: 'Invalid appointment type'
    },
    default: 'consultation'
  },
  reasonForVisit: {
    type: String,
    required: [true, 'Reason for visit is required'],
    trim: true,
    maxlength: [500, 'Reason for visit cannot exceed 500 characters']
  },
  symptoms: [String],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    notes: String
  },
  fees: {
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative']
    },
    additionalCharges: {
      type: Number,
      default: 0,
      min: [0, 'Additional charges cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    }
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, { 
  timestamps: true 
});

// Generate appointment ID before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentId = `APT${String(count + 1).padStart(6, '0')}`;
  }
  
  // Calculate total amount
  this.fees.totalAmount = this.fees.consultationFee + (this.fees.additionalCharges || 0);
  
  next();
});

// Index for efficient queries
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);