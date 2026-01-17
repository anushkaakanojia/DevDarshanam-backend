import express from "express";
import Slot from "../models/Slot.js";

const router = express.Router();

/**
 * POST /api/slots/create
 * body: { date, timeRange, capacity }
 */
router.post("/create", async (req, res) => {
  try {
    const { date, timeRange, capacity } = req.body;

    if (!date || !timeRange) {
      return res.status(400).json({ success: false, message: "date and timeRange are required" });
    }

    const existing = await Slot.findOne({ date, timeRange });
    if (existing) {
      return res.status(409).json({ success: false, message: "Slot already exists" });
    }

    const slot = await Slot.create({
      date,
      timeRange,
      capacity: capacity || 200,
    });

    res.json({ success: true, message: "Slot created", slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/slots
 */
router.get("/", async (req, res) => {
  try {
    const slots = await Slot.find().sort({ date: 1, timeRange: 1 });
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
