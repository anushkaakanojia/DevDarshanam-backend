import mongoose from "mongoose";

const EntryExitLogSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true },
    action: { type: String, enum: ["ENTRY", "EXIT"], required: true },
    gate: { type: String, default: "Main Gate" },
    zoneName: { type: String, required: true }, // e.g., "Gate 2", "Queue Line"
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("EntryExitLog", EntryExitLogSchema);
