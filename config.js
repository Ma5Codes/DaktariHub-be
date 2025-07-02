import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 6005;

export const mongoDBUrl = process.env.DB_Url;

export const JWT_SECRET = process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTExOTU4NjcsImV4cCI6MTc1MTE5OTQ2N30.Y5uiTTKPRy1ymnh06xQWBNxXgmzsUGjg0pxvvVSl2tw";