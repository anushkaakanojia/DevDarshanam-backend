import express from "express";
import Zone from "../models/Zone.js";

const router = express.Router();

/**
 * POST /api/zones/init
 * Initialize default zones (only once)
 */
router.post("/init", async (req, res) => {
  try {
    const defaultZones = [
      { zoneName: "Gate 1", maxCapacity: 400 },
      { zoneName: "Gate 2", maxCapacity: 400 },
      { zoneName: "Queue Line", maxCapacity: 800 },
      { zoneName: "Darshan Hall", maxCapacity: 700 },
      { zoneName: "Exit", maxCapacity: 500 },
      { zoneName: "Prasadam Area", maxCapacity: 600 },
    ];

    const created = [];

    for (const z of defaultZones) {
      const exists = await Zone.findOne({ zoneName: z.zoneName });
      if (!exists) {
        const newZone = await Zone.create({ ...z, currentCount: 0 });
        created.push(newZone);
      }
    }

    const zones = await Zone.find().sort({ zoneName: 1 });

    res.json({
      success: true,
      message: "Zones initialized",
      createdCount: created.length,
      zones,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/zones
 */
router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find().sort({ zoneName: 1 });
    res.json({ success: true, zones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
