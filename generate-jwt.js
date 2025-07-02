import jwt from "jsonwebtoken";

// Replace this with your actual secret key
const JWT_SECRET = "your-actual-secret-key-here";

// The payload (data you want to encode in the token)
const payload = {
  id: "user123",
  email: "user@example.com",
};

// Generate token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

console.log("Generated JWT Token:");
console.log(token);

