import User from "../lib/models/user.js";
import DB from "../lib/connectdb.js";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userid, name, education, university, gender, dateOfBirth, mobile, email, location } = req.body || {};

  if (!userid) {
    return res.status(400).json({ message: "User id missing" });
  }

  if (mobile) {
    const cleanedMobile = String(mobile).replace(/[\s-+]/g, "").slice(-10);

    if (!MOBILE_REGEX.test(cleanedMobile)) {
      return res.status(400).json({ message: "Please provide a valid 10-digit mobile number" });
    }
  }

  try {
    await DB.connect();

    const updateData = {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(education !== undefined && { education }),
      ...(university !== undefined && { university: String(university).trim() }),
      ...(gender !== undefined && { gender }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(mobile !== undefined && { mobile: String(mobile).replace(/[\s-+]/g, "").slice(-10) }),
      ...(email !== undefined && { email: String(email).toLowerCase().trim() }),
      ...(location !== undefined && { location: String(location).trim() }),
    };

    const updatedUser = await User.findByIdAndUpdate(
      userid,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update user error", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    try {
      await DB.disconnect?.();
    } catch {}
  }
}
