// controllers/patientController.js
import { Patient } from "../models/Patient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { JWT_SECRET } from "../../config.js";

// Register a new patient
export const registerPatient = async (req, res) => {
  try {
    console.log("Request received:", req.body);
    const { name, email, gender, mobile, age, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the patient already exists
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ message: "Patient already exists" });
    }

    // Create a new patient
    const newPatient = await Patient.create({
      name,
      email,
      gender,
      mobile,
      age,
      password: hashedPassword,
      patientId: uuidv4(),
      role: role || 'patient', // Default to patient if role not specified
    });

    res.status(201).json({ message: "Patient registered successfully", newPatient });
  } catch (error) {
    console.error("Error registering patient:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAllPatients = async (req, res) => {
  const patients = await Patient.find();
  return res.status(200).json({ data: patients });
};
// Login a patient
export const loginPatient = async (req, res) => {
  try {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("Missing email or password:", { email: !!email, password: !!password });
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log("Looking for patient with email:", normalizedEmail);
    
    // Find the patient by email
    const patient = await Patient.findOne({ email: normalizedEmail });
    console.log("Patient found:", patient ? "Yes" : "No");
    
    if (!patient) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Patient password field exists:", !!patient.password);
    // Check if patient has a password stored
    if (!patient.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Attempting password comparison...");
    // Compare the passwords
    const isMatch = await bcrypt.compare(password, patient.password);
    console.log("Password match result:", isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: patient._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log("Login successful, token generated");
    res.status(200).json({ 
      token,
      user: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deletePatient = async (req, res) => {
  const { patientId } = req.body;

  const patient = await Patient.deleteOne({ _id: patientId });

  console.log(patient);

  if (!patient) {
    return res.status(400).json({
      success: false,
      message: "Patient not found",
    });
  }

  return res.status();
};
