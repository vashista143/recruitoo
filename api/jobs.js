import db from "../lib/connectdb.js";
import Job from "../lib/models/job.js";

export default async function handler(req, res) {
  await db.connect();

  const action = req.query.action || req.body?.action;

  // =============================
  // GET ALL JOBS
  // =============================
  if (req.method === "GET" && action === "all") {
    try {
      const jobs = await Job.find();
      return res.status(200).json({ success: true, jobs });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // =============================
  // GET JOBS BY RECRUITER
  // =============================
  if (req.method === "POST" && action === "recruiter") {
    const { recruiterId } = req.body;

    if (!recruiterId) {
      return res.status(400).json({ message: "Recruiter ID is required" });
    }

    try {
      const jobs = await Job.find({ postedBy: recruiterId });
      return res.status(200).json({ success: true, jobs });
    } catch (error) {
      console.error("Error fetching recruiter jobs:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // =============================
  // GET SINGLE JOB
  // =============================
  if (req.method === "POST" && action === "single") {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID required" });
    }

    try {
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }
      return res.status(200).json({ success: true, job });
    } catch (error) {
      console.error("Error fetching job:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // =============================
  // INVALID REQUEST
  // =============================
  return res.status(400).json({ message: "Invalid request" });
}
