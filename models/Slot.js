import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // "YYYY-MM-DD"
    timeRange: { type: String, required: true }, // "11:30 - 12:00"
    capacity: { type: Number, default: 200 },
    bookedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Slot", SlotSchema);
