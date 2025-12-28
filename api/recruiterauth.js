import db from "../lib/connectdb.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Recruiter from "../lib/models/recruitor.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { mode, email, password } = req.body || {};

  if (!mode) {
    return res.status(400).json({ success: false, message: "Mode required: login or register" });
  }

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    await db.connect();

    // ****************************************
    // LOGIN MODE
    // ****************************************
    if (mode === "login") {
      const recruiter = await Recruiter.findOne({ email }).select("+password");

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

    // ****************************************
    // REGISTER MODE
    // ****************************************
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
      } = req.body;

      if (!name || !email || !password || !companyName) {
        return res.status(400).json({ success: false, message: "Required fields missing" });
      }

      const exists = await Recruiter.findOne({ email });
      if (exists) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }

      const hashed = await bcrypt.hash(password, 10);

      const recruiter = await Recruiter.create({
        name,
        email,
        password: hashed,
        companyName,
        companyWebsite,
        designation,
        department,
        bio,
        location,
        contactNumber
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
    return res.status(500).json({ success: false, message: err.message });
  }
}
