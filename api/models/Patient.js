// models/Patient.js
import mongoose from 'mongoose';

const patientSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  patientId: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    default: 'patient',
    required: true
  }
}, { timestamps: true });

export const Patient = mongoose.model('Patient', patientSchema);
