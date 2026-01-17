import express from "express";
import Slot from "../models/Slot.js";

const router = express.Router();

/**
 * ADMIN: Create or Update Slot
 * POST /api/slots/create
 */
router.post("/create", async (req, res) => {
  try {
    const {
      date,
      timeRange,
      darshanType,
      normalCapacity,
      priorityCapacity,
      otherCapacity, // ✅ NEW
    } = req.body;

    if (!date || !timeRange || !darshanType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const price = darshanType === "SEEGHRA" ? 300 : 0;

    const existing = await Slot.findOne({ date, timeRange, darshanType });

    // ---------------- UPDATE EXISTING SLOT ----------------
    if (existing) {
      existing.queues.normal.capacity = normalCapacity;
      existing.queues.priority.capacity = priorityCapacity;

      // ✅ NEW — update other queue
      existing.queues.other.capacity = otherCapacity;

      await existing.save();

      return res.json({ success: true, slot: existing });
    }

    // ---------------- CREATE NEW SLOT ----------------
    const slot = await Slot.create({
      date,
      timeRange,
      darshanType,
      price,
      queues: {
        normal: { capacity: normalCapacity },
        priority: { capacity: priorityCapacity },

        // ✅ NEW — added without touching existing structure
        other: { capacity: otherCapacity },
      },
    });

    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PILGRIM: Get slots by date & darshan
 * GET /api/slots/by-date?date=YYYY-MM-DD&darshanType=GENERAL
 */
router.get("/by-date", async (req, res) => {
  try {
    const { date, darshanType } = req.query;

    const slots = await Slot.find({
      date,
      darshanType,
      isActive: true,
    }).sort({ timeRange: 1 });

    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
