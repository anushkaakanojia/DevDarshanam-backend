import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },

    isVerified: { type: Boolean, default: false },

    // OTP stored temporarily
    otpCode: { type: String, default: "" },
    otpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
