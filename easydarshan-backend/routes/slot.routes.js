import express from "express";
import Slot from "../models/Slot.js";

const router = express.Router();

// ✅ normalize timeRange format
function normalizeTimeRange(value) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
}

/**
 * POST /api/slots/create
 * body:
 * { date, timeRange, darshanType, normalCapacity, priorityCapacity, otherCapacity }
 */
router.post("/create", async (req, res) => {
  try {
    let {
      date,
      timeRange,
      darshanType,
      normalCapacity,
      priorityCapacity,
      otherCapacity,
    } = req.body;

    if (!date || !timeRange) {
      return res.status(400).json({
        success: false,
        message: "date and timeRange are required",
      });
    }

    timeRange = normalizeTimeRange(timeRange);

    // ✅ Default type
    darshanType = (darshanType || "GENERAL").toUpperCase();

    if (!["GENERAL", "SEEGHRA"].includes(darshanType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid darshanType (must be GENERAL or SEEGHRA)",
      });
    }

    const existing = await Slot.findOne({ date, timeRange, darshanType });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Slot already exists for this darshanType",
      });
    }

    const slot = await Slot.create({
      date,
      timeRange,
      darshanType,

      normalCapacity: Number(normalCapacity || 0),
      priorityCapacity: Number(priorityCapacity || 0),
      otherCapacity: Number(otherCapacity || 0),
    });

    return res.json({
      success: true,
      message: "✅ Slot created",
      slot,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/slots
 * Optional filters: ?date=YYYY-MM-DD&darshanType=GENERAL
 */
router.get("/", async (req, res) => {
  try {
    const { date, darshanType } = req.query;

    const query = {};
    if (date) query.date = date;
    if (darshanType) query.darshanType = darshanType.toUpperCase();

    const slots = await Slot.find(query).sort({ date: 1, timeRange: 1 });
    return res.json({ success: true, slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ GET /api/slots/by-date
 * usage: /api/slots/by-date?date=2026-01-17&darshanType=GENERAL
 */
router.get("/by-date", async (req, res) => {
  try {
    const { date, darshanType } = req.query;

    if (!date || !darshanType) {
      return res.status(400).json({
        success: false,
        message: "date and darshanType are required",
      });
    }

    const slots = await Slot.find({
      date,
      darshanType: darshanType.toUpperCase(),
      isActive: true,
    }).sort({ timeRange: 1 });

    return res.json({
      success: true,
      slots,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
/**
 * ✅ GET /api/slots/calendar-summary?darshanType=GENERAL
 * Returns { date, totalCapacity, bookedCount, available, ratioAvailable }
 */
router.get("/calendar-summary", async (req, res) => {
  try {
    const { darshanType } = req.query;

    if (!darshanType) {
      return res.status(400).json({
        success: false,
        message: "darshanType is required (GENERAL/SEEGHRA)",
      });
    }

    const type = darshanType.toUpperCase();

    const slots = await Slot.find({ darshanType: type, isActive: true });

    // group by date
    const map = {};

    for (const s of slots) {
      if (!map[s.date]) {
        map[s.date] = {
          date: s.date,
          totalCapacity: 0,
          bookedCount: 0,
        };
      }

      const totalCap =
        Number(s.normalCapacity || 0) +
        Number(s.priorityCapacity || 0) +
        Number(s.otherCapacity || 0);

      map[s.date].totalCapacity += totalCap;
      map[s.date].bookedCount += Number(s.bookedCount || 0);
    }

    const summary = Object.values(map)
      .map((d) => {
        const available = Math.max(0, d.totalCapacity - d.bookedCount);
        const ratioAvailable = d.totalCapacity > 0 ? available / d.totalCapacity : 0;

        return {
          ...d,
          available,
          ratioAvailable,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


export default router;
