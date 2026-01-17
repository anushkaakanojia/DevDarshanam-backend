import express from "express";
import Ticket from "../models/Ticket.js";
import Zone from "../models/Zone.js";
import EntryExitLog from "../models/EntryExitLog.js";

const router = express.Router();

/**
 * POST /api/verify/scan
 * body: { ticketId, action, zoneName, gate }
 * action: "ENTRY" | "EXIT"
 */
router.post("/scan", async (req, res) => {
  try {
    const { ticketId, action, zoneName, gate } = req.body;

    if (!ticketId || !action || !zoneName) {
      return res.status(400).json({
        success: false,
        message: "ticketId, action, zoneName are required",
      });
    }

    // ✅ Ensure ticket exists
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // ✅ Entry/Exit rules
    if (action === "ENTRY" && ticket.status !== "BOOKED") {
      return res.status(400).json({
        success: false,
        message: `Ticket cannot ENTER. Current status: ${ticket.status}`,
      });
    }

    if (action === "EXIT" && ticket.status !== "ENTERED") {
      return res.status(400).json({
        success: false,
        message: `Ticket cannot EXIT. Current status: ${ticket.status}`,
      });
    }

    // ✅ Ensure zone exists
    const zone = await Zone.findOne({ zoneName });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found",
      });
    }

    // ✅ Update zone count + ticket status
    if (action === "ENTRY") {
      zone.currentCount += 1;
      ticket.status = "ENTERED";
    } else {
      zone.currentCount = Math.max(0, zone.currentCount - 1);
      ticket.status = "EXITED";
    }

    await zone.save();
    await ticket.save();

    // ✅ Log entry/exit
    const log = await EntryExitLog.create({
      ticketId,
      action,
      gate: gate || "Main Gate",
      zoneName,
    });

    // ✅ Updated zones list for dashboards
    const zones = await Zone.find().sort({ zoneName: 1 });

    // ✅ REALTIME SOCKET.IO EVENTS
    const io = req.app.get("io");

    if (io) {
      io.emit("zones_update", zones);
      io.emit("ticket_update", {
        ticketId: ticket.ticketId,
        status: ticket.status,
        zoneName,
        action,
        time: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: `✅ ${action} verified`,
      ticket,
      updatedZone: zone,
      zones,
      log,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
