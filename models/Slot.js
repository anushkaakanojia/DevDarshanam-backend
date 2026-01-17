import mongoose from "mongoose";

const QueueSchema = new mongoose.Schema(
  {
    capacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const SlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    timeRange: { type: String, required: true }, // "11:00 - 11:30"

    darshanType: {
      type: String,
      enum: ["GENERAL", "SEEGHRA"],
      required: true,
    },

    price: { type: Number, default: 0 }, // 0 or 300

    queues: {
      normal: {
        type: QueueSchema,
        required: true,
      },

      priority: {
        type: QueueSchema,
        required: true,
      },

      // ✅ NEW — added without touching existing logic
      other: {
        type: QueueSchema,
        required: true,
      },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Slot", SlotSchema);
