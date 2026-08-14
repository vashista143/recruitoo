import User from "../lib/models/user.js";
import DB from "../lib/connectdb.js";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const { userid, name, education, university, gender, dateOfBirth, mobile, email, location } = req.body || {};

  if (!userid) {
    return res.status(400).json({
      success: false,
      message: "Failed to update profile: User ID is required"
    });
  }

  let sanitizedMobile;
  if (mobile !== undefined && mobile !== null && String(mobile).trim() !== "") {
    const cleaned = String(mobile).replace(/[\s-+]/g, "").slice(-10);

    if (!MOBILE_REGEX.test(cleaned)) {
      return res.status(400).json({
        success: false,
        errorField: "mobile",
        message: "Failed to update profile: Please enter a valid 10-digit mobile number starting with 6-9"
      });
    }

    sanitizedMobile = cleaned;
  }

  try {
    await DB.connect();

    const updateData = {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(education !== undefined && { education }),
      ...(university !== undefined && { university: String(university).trim() }),
      ...(gender !== undefined && { gender }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(sanitizedMobile !== undefined && { mobile: sanitizedMobile }),
      ...(email !== undefined && { email: String(email).toLowerCase().trim() }),
      ...(location !== undefined && { location: String(location).trim() }),
    };

    const updatedUser = await User.findByIdAndUpdate(
      userid,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Failed to update profile: User account not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile: An unexpected server error occurred. Please try again later."
    });
  } finally {
    try {
      await DB.disconnect?.();
    } catch {}
  }
}
