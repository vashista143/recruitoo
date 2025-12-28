import jwt from "jsonwebtoken";
import db from "../lib/connectdb.js";
import Recruiter from "../lib/models/recruitor.js";
import Job from "../lib/models/job.js";

const JWT_SECRET = "supersecretkey";

export default async function handler(req, res) {
  await db.connect();

  const action = req.query.action || req.body?.action;

  // =============================
  // CREATE NEW JOB
  // =============================
  if (req.method === "POST" && action === "create") {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authorization token missing" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const recruiterId = decoded?.id || decoded?.userId || decoded?.sub;

      if (!recruiterId) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const recruiter = await Recruiter.findById(recruiterId);
      if (!recruiter) {
        return res.status(401).json({ message: "Recruiter not found" });
      }

      const {
        companyName,
        jobTitle,
        title,
        companyLogo,
        companyLogoLink,
        location,
        experience,
        experienceRange,
        salary,
        openings,
        mustHaveSkills,
        keySkills,
        requiredSkills,
        niceToHaveSkills,
        department,
        roleCategory,
        education,
        employmentType,
        description,
      } = req.body;

      const finalTitle = (title || jobTitle || "").trim();
      if (!finalTitle || !companyName || !location) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const toArray = (val) =>
        Array.isArray(val)
          ? val
          : typeof val === "string"
          ? val.split(",").map(s => s.trim()).filter(Boolean)
          : [];

      const newJob = {
        title: finalTitle,
        companyName,
        companyLogo: recruiter.companyLogoLink || companyLogo || companyLogoLink || "",
        location,
        experienceRange: experienceRange || experience || "",
        salary: salary || "Not Disclosed",
        openings: parseInt(openings, 10) || 1,
        employmentType: employmentType || "Full Time",
        roleCategory: roleCategory || "Software Development",
        department: department || "",
        education: toArray(education),
        requiredSkills: toArray(requiredSkills || keySkills || mustHaveSkills),
        niceToHaveSkills: toArray(niceToHaveSkills),
        description: description || "",
        postedBy: recruiterId,
      };

      const createdJob = await Job.create(newJob);
      return res.status(201).json({ success: true, job: createdJob });

    } catch (err) {
      console.error("Create job error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // =============================
  // EDIT JOB
  // =============================
  if (req.method === "PUT" && action === "edit") {
    try {
      const { jobId, ...updates } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: "jobId required" });
      }

      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $set: updates },
        { new: true }
      );

      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.status(200).json({
        success: true,
        job: updatedJob,
      });
    } catch (err) {
      console.error("Edit job error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // =============================
  // CLOSE JOB
  // =============================
  if (req.method === "PUT" && action === "close") {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: "jobId required" });
      }

      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { status: "closed" },
        { new: true }
      );

      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      return res.status(200).json({
        success: true,
        job: updatedJob,
      });
    } catch (err) {
      console.error("Close job error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // =============================
  // INVALID REQUEST
  // =============================
  return res.status(400).json({ message: "Invalid request" });
}
