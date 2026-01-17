import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

/* -------------------- Helpers -------------------- */

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Runtime transporter creation (always reads env correctly)
async function sendOTPEmail(email, otp, purpose) {
  const subject =
    purpose === "VERIFY"
      ? "EasyDarshan OTP Verification"
      : "EasyDarshan Password Reset OTP";

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 12px;">
      <h2 style="margin:0;">EasyDarshan OTP</h2>
      <p style="margin-top:10px;">Your OTP for <b>${purpose}</b> is:</p>
      <h1 style="letter-spacing: 4px; margin: 10px 0;">${otp}</h1>
      <p>This OTP is valid for <b>5 minutes</b>.</p>
      <p style="margin-top:18px;">Thank you,<br/>EasyDarshan Team</p>
    </div>
  `;

  // ✅ HARD VALIDATION (prevents silent fail)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER / EMAIL_PASS missing in environment");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // ✅ must be gmail app password
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });
}

/* -------------------- Routes -------------------- */

/**
 * POST /api/auth/register
 * body: { email, password }
 *
 * Flow:
 * - If email exists & not verified -> resend OTP
 * - If email exists & verified -> block
 * - Else create user, send OTP
 * - If OTP fails -> rollback user creation
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password required",
      });
    }

    const exists = await User.findOne({ email });

    // ✅ Existing but not verified: resend OTP
    if (exists && !exists.isVerified) {
      const otp = generateOTP();
      const expiry = new Date(Date.now() + 5 * 60 * 1000);

      exists.otpCode = otp;
      exists.otpExpiry = expiry;
      await exists.save();

      try {
        await sendOTPEmail(email, otp, "VERIFY");
      } catch (mailErr) {
        console.log("❌ EMAIL SEND ERROR (RESEND OTP):", mailErr.message);
        return res.status(500).json({
          success: false,
          message: "OTP resend failed. Please try again.",
          debug: mailErr.message,
        });
      }

      return res.json({
        success: true,
        message: "✅ OTP resent to email (Account not verified yet)",
      });
    }

    // ✅ Existing and verified: cannot re-register
    if (exists && exists.isVerified) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // ✅ Create new user
    const passwordHash = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      email,
      passwordHash,
      isVerified: false,
      otpCode: otp,
      otpExpiry: expiry,
    });

    // ✅ Send OTP email (rollback user if fails)
    try {
      await sendOTPEmail(email, otp, "VERIFY");
    } catch (mailErr) {
      console.log("❌ EMAIL SEND ERROR (REGISTER):", mailErr.message);
      await User.deleteOne({ _id: user._id });

      return res.status(500).json({
        success: false,
        message: "OTP email failed to send. Please try again. (Account not created)",
        debug: mailErr.message,
      });
    }

    return res.json({
      success: true,
      message: "✅ Registered successfully. OTP sent to email.",
      userId: user._id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/verify-otp
 * body: { email, otp }
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isVerified) {
      return res.json({ success: true, message: "✅ Already verified" });
    }

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not generated" });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpCode = "";
    user.otpExpiry = null;
    await user.save();

    return res.json({ success: true, message: "✅ Email verified successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and Password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Email not verified" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "✅ Login successful",
      token,
      user: { email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * body: { email }
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otpCode = otp;
    user.otpExpiry = expiry;
    await user.save();

    try {
      await sendOTPEmail(email, otp, "RESET");
    } catch (mailErr) {
      console.log("❌ EMAIL SEND ERROR (FORGOT PASSWORD):", mailErr.message);
      return res.status(500).json({
        success: false,
        message: "Reset OTP email failed to send. Please try again.",
        debug: mailErr.message,
      });
    }

    return res.json({ success: true, message: "✅ Reset OTP sent to email" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * body: { email, otp, newPassword }
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and newPassword are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not generated" });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otpCode = "";
    user.otpExpiry = null;
    await user.save();

    return res.json({ success: true, message: "✅ Password reset successful" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
