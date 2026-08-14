import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../lib/connectdb.js";
import User from "../lib/models/user.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const SALT_ROUNDS = 10;
const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { mode, email, password, name, companyName } = req.body || {};

  if (!mode) {
    return res.status(400).json({ message: "Mode is required: login or register" });
  }

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!GMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "A valid Gmail address (@gmail.com) is required" });
  }

  try {
    await db.connect();

    if (mode === "login") {
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: "user" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const userSafe = {
        _id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        role: user.role,
        createdAt: user.createdAt,
      };

      return res.status(200).json({ message: "Login successful", token, user: userSafe });
    }

    if (mode === "register") {
      const existing = await User.findOne({ email: normalizedEmail });

      if (existing) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const newUser = await User.create({
        name: (name || "").trim(),
        email: normalizedEmail,
        password: hashedPassword,
        companyName: (companyName || "").trim(),
      });

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, role: "user" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const userSafe = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        companyName: newUser.companyName,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };

      return res.status(201).json({ message: "User registered", token, user: userSafe });
    }

    return res.status(400).json({ message: "Invalid mode value" });

  } catch (err) {
    console.error("auth error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    try { 
      await db.disconnect?.(); 
    } catch {}
  }
}
