import db from "../lib/connectdb.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Recruiter from "../lib/models/recruitor.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { mode, email, password } = req.body || {};

  if (!mode || !["login", "register"].includes(mode)) {
    return res.status(400).json({ success: false, message: "Valid mode required: login or register" });
  }

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });
  }

  try {
    await db.connect();

    if (mode === "login") {
      const recruiter = await Recruiter.findOne({ email: normalizedEmail }).select("+password");

      if (!recruiter) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      const match = await bcrypt.compare(password, recruiter.password);
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: recruiter._id, role: "recruiter" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        token,
        recruiter: {
          _id: recruiter._id,
          name: recruiter.name,
          email: recruiter.email,
          companyName: recruiter.companyName,
          companyWebsite: recruiter.companyWebsite,
          designation: recruiter.designation,
          department: recruiter.department
        }
      });
    }

    if (mode === "register") {
      const {
        name,
        companyName,
        companyWebsite,
        designation,
        department,
        bio,
        location,
        contactNumber
      } = req.body || {};

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Full name is required" });
      }

      if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
        return res.status(400).json({ success: false, message: "Company name is required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
      }

      if (contactNumber && !PHONE_REGEX.test(String(contactNumber).trim())) {
        return res.status(400).json({ success: false, message: "Invalid contact number format" });
      }

      const exists = await Recruiter.findOne({ email: normalizedEmail });
      if (exists) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashed = await bcrypt.hash(password, 10);

      const recruiter = await Recruiter.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        companyName: companyName.trim(),
        companyWebsite: (companyWebsite || "").trim(),
        designation: (designation || "").trim(),
        department: (department || "").trim(),
        bio: (bio || "").trim(),
        location: (location || "").trim(),
        contactNumber: contactNumber ? String(contactNumber).trim() : ""
      });

      const token = jwt.sign(
        { id: recruiter._id, role: "recruiter" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        success: true,
        token,
        recruiter: {
          _id: recruiter._id,
          name: recruiter.name,
          email: recruiter.email,
          companyName: recruiter.companyName,
          companyWebsite: recruiter.companyWebsite,
          designation: recruiter.designation,
          department: recruiter.department
        }
      });
    }

    return res.status(400).json({ success: false, message: "Invalid mode value" });

  } catch (err) {
    console.error("Recruiter Auth Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    try {
      await db.disconnect?.();
    } catch {}
  }
}
