import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    timeRange: { type: String, required: true }, // "11:30 - 12:00"

    // ✅ NEW
    darshanType: {
      type: String,
      enum: ["GENERAL", "SEEGHRA"],
      required: true,
      default: "GENERAL",
    },

    normalCapacity: { type: Number, default: 200 },
    priorityCapacity: { type: Number, default: 0 },
    otherCapacity: { type: Number, default: 0 },

    // ✅ tracking
    bookedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Prevent duplicates for same date+time+type
SlotSchema.index({ date: 1, timeRange: 1, darshanType: 1 }, { unique: true });

export default mongoose.model("Slot", SlotSchema);
