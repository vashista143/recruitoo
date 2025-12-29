import { v2 as cloudinary } from "cloudinary"
import formidable from "formidable"
import fs from "fs"
import os from "os"
import { createRequire } from "module"
import User from "../lib/models/user.js"
import db from "../lib/connectdb.js"

const require = createRequire(import.meta.url)
const pdf = require("pdf-parse")

export const config = {
  api: { bodyParser: false },
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    await db.connect()

    const form = formidable({
      multiples: false,
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024, // 2MB
    })

    // ✅ await formidable (serverless safe)
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve({ fields, files })
      })
    })

    const userId = fields.userid?.[0] || fields.userid
    const file = files.resume?.[0]

    if (!userId || !file) {
      return res.status(400).json({ message: "Invalid upload data" })
    }

    // ✅ read file AFTER upload
    const fileBuffer = fs.readFileSync(file.filepath)

    // ✅ upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(file.filepath, {
      resource_type: "auto",
      folder: "resumes",
      public_id: `${userId}-${Date.now()}`,
    })

    // ✅ parse PDF safely
    let parsedText = ""
    try {
      const parsedPdf = await pdf(fileBuffer)
      parsedText = parsedPdf.text || ""
    } catch (pdfError) {
      console.error("PDF PARSE ERROR:", pdfError)
    }

    // ✅ save to DB
    await User.findByIdAndUpdate(userId, {
      resumePdfUrl: uploaded.secure_url,
      resumeParsedText: parsedText,
    })

    // ✅ cleanup temp file
    fs.unlinkSync(file.filepath)

    return res.status(200).json({
      message: "Resume uploaded and parsed successfully",
      resumeUrl: uploaded.secure_url,
      textLength: parsedText.length,
    })
  } catch (error) {
    console.error("UPLOAD ERROR:", error)
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    })
  }
}
