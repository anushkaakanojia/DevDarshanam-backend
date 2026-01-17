import express from "express";
import Ticket from "../models/Ticket.js";
import Slot from "../models/Slot.js";
import { upload } from "../config/multer.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

function generateTicketId() {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ED-${new Date().getFullYear()}-${rand}`;
}

function normalizeTimeRange(value) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
}

/**
 * POST /api/tickets/book
 *
 * multipart/form-data
 * fields:
 * - date
 * - slotTime
 * - darshanType (GENERAL/SEEGHRA)
 * - personsCount
 * - pilgrims (JSON string array)
 *
 * files:
 * - idProofFiles (multiple)
 * - priorityProofFiles (multiple)
 */
router.post(
  "/book",
  requireAuth,
  upload.fields([
    { name: "idProofFiles", maxCount: 10 },
    { name: "priorityProofFiles", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { date, slotTime, darshanType, personsCount, pilgrims } = req.body;

      if (!date || !slotTime || !darshanType || !personsCount || !pilgrims) {
        return res.status(400).json({
          success: false,
          message: "date, slotTime, darshanType, personsCount, pilgrims are required",
        });
      }

      const timeNorm = normalizeTimeRange(slotTime);

      let pilgrimList;
      try {
        pilgrimList = JSON.parse(pilgrims);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid pilgrims JSON format",
        });
      }

      const count = Number(personsCount);

      if (!Array.isArray(pilgrimList) || pilgrimList.length !== count) {
        return res.status(400).json({
          success: false,
          message: "pilgrims array must match personsCount",
        });
      }

      // ✅ Find slot
      const slot = await Slot.findOne({
        date,
        timeRange: timeNorm,
        darshanType: darshanType.toUpperCase(),
        isActive: true,
      });

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: "Slot not found for this date/time/darshanType",
        });
      }

      // ✅ total capacity of slot
      const totalCap =
        Number(slot.normalCapacity || 0) +
        Number(slot.priorityCapacity || 0) +
        Number(slot.otherCapacity || 0);

      const remaining = Math.max(0, totalCap - Number(slot.bookedCount || 0));

      if (count > remaining) {
        return res.status(403).json({
          success: false,
          message: `Not enough seats available. Remaining: ${remaining}`,
        });
      }

      // ✅ Attach uploaded files
      const idFiles = req.files?.idProofFiles || [];
      const priorityFiles = req.files?.priorityProofFiles || [];

      if (idFiles.length !== count) {
        return res.status(400).json({
          success: false,
          message: "ID proof file is required for each person",
        });
      }

      // priority proofs depend on priorityEnabled persons
      const priorityEnabledCount = pilgrimList.filter((p) => p.priorityEnabled).length;

      if (priorityEnabledCount > 0 && priorityFiles.length !== priorityEnabledCount) {
        return res.status(400).json({
          success: false,
          message: "Priority proof files must match number of priority persons",
        });
      }

      let priorityFileIndex = 0;

      const finalPilgrims = pilgrimList.map((p, idx) => {
        const pilgrim = {
          fullName: p.fullName,
          phone: p.phone,
          dob: p.dob,
          gender: p.gender,

          idType: p.idType,
          idNumber: p.idNumber,
          idProofFile: idFiles[idx]?.filename,

          priorityEnabled: Boolean(p.priorityEnabled),
          priorityType: p.priorityEnabled ? p.priorityType || "" : "",
          proofType: p.priorityEnabled ? p.proofType || "" : "",
          proofNumber: p.priorityEnabled ? p.proofNumber || "" : "",
          otherCase: p.priorityEnabled ? p.otherCase || "" : "",
          priorityProofFile: "",
        };

        if (pilgrim.priorityEnabled) {
          pilgrim.priorityProofFile = priorityFiles[priorityFileIndex]?.filename || "";
          priorityFileIndex++;
        }

        return pilgrim;
      });

      // ✅ Create Ticket
      const ticketId = generateTicketId();

      const ticket = await Ticket.create({
        ticketId,
        userId: req.user.userId,
        userEmail: req.user.email,

        darshanType: darshanType.toUpperCase(),
        date,
        slotTime: timeNorm,

        personsCount: count,
        pilgrims: finalPilgrims,
      });

      // ✅ Update slot booked count by personsCount
      slot.bookedCount = Number(slot.bookedCount || 0) + count;
      await slot.save();

      res.json({
        success: true,
        message: "✅ Ticket booked successfully",
        ticket,
        qrValue: ticket.ticketId,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * ✅ GET /api/tickets/my
 * shows logged in user's tickets
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ GET /api/tickets/:ticketId
 */
router.get("/:ticketId", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      userId: req.user.userId,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
