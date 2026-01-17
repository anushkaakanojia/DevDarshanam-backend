import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    zoneName: { type: String, unique: true },
    currentCount: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 500 },
  },
  { timestamps: true }
);

ZoneSchema.virtual("densityLevel").get(function () {
  const ratio = this.currentCount / this.maxCapacity;

  if (ratio < 0.4) return "LOW";
  if (ratio < 0.75) return "MODERATE";
  return "HIGH";
});

ZoneSchema.set("toJSON", { virtuals: true });
ZoneSchema.set("toObject", { virtuals: true });

export default mongoose.model("Zone", ZoneSchema);
