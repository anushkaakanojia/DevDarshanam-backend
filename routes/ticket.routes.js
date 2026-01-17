import express from "express";
import Ticket from "../models/Ticket.js";
import Slot from "../models/Slot.js";
import { upload } from "../config/multer.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Ticket ID generator
function generateTicketId() {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ED-${new Date().getFullYear()}-${rand}`;
}

// ✅ Normalize time range formatting
function normalizeSlotTime(value) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
}

/**
 * POST /api/tickets/book
 * multipart/form-data
 * fields:
 * name, phone, date, slotTime, idType, idNumber
 * priorityEnabled, priorityType, proofType, proofNumber, otherCase
 * files: idProofFile, priorityProofFile
 */
router.post(
  "/book",
  requireAuth,
  upload.fields([
    { name: "idProofFile", maxCount: 1 },
    { name: "priorityProofFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        phone,
        date,
        slotTime,
        idType,
        idNumber,
        priorityEnabled,
        priorityType,
        proofType,
        proofNumber,
        otherCase,
      } = req.body;

      // ✅ Required validations
      if (!name || !phone || !date || !slotTime || !idType || !idNumber) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // ✅ Normalize slot time for safe matching
      const normalizedSlotTime = normalizeSlotTime(slotTime);

      // ✅ ID proof mandatory
      const idProofFile = req.files?.idProofFile?.[0]?.filename;
      if (!idProofFile) {
        return res.status(400).json({
          success: false,
          message: "ID Proof file is required",
        });
      }

      // ✅ Find slot
      const slot = await Slot.findOne({ date, timeRange: normalizedSlotTime });
      if (!slot) {
        return res.status(404).json({
          success: false,
          message: `Slot not found for ${date} (${normalizedSlotTime})`,
        });
      }

      // ✅ Check capacity
      if (slot.bookedCount >= slot.capacity) {
        return res.status(403).json({ success: false, message: "Slot is full" });
      }

      // ✅ Priority logic
      const priorityOn = priorityEnabled === "true" || priorityEnabled === true;

      let priorityProofFile = "";
      if (priorityOn) {
        priorityProofFile = req.files?.priorityProofFile?.[0]?.filename;

        if (!priorityType || !proofType || !proofNumber || !priorityProofFile) {
          return res.status(400).json({
            success: false,
            message:
              "Priority access requires: priorityType, proofType, proofNumber and priorityProofFile",
          });
        }

        if (priorityType === "Other" && (!otherCase || otherCase.trim() === "")) {
          return res.status(400).json({
            success: false,
            message: "Other case description is required when priorityType is Other",
          });
        }
      }

      // ✅ Create ticket
      const ticketId = generateTicketId();

      const ticket = await Ticket.create({
        ticketId,

        // ✅ Link to logged-in user
        userId: req.user.userId,
        userEmail: req.user.email,

        name,
        phone,
        date,
        slotTime: normalizedSlotTime,

        idType,
        idNumber,
        idProofFile,

        priorityEnabled: priorityOn,
        priorityType: priorityOn ? priorityType : "",
        proofType: priorityOn ? proofType : "",
        proofNumber: priorityOn ? proofNumber : "",
        priorityProofFile: priorityOn ? priorityProofFile : "",
        otherCase: priorityOn ? otherCase || "" : "",
      });

      // ✅ Update slot booked count
      slot.bookedCount += 1;
      await slot.save();

      return res.json({
        success: true,
        message: "✅ Ticket booked successfully",
        ticket,
        qrValue: ticket.ticketId,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/tickets/:ticketId
 * ✅ Protected + only owner can access
 */
router.get("/:ticketId", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // ✅ Owner check
    if (ticket.userId?.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access this ticket",
      });
    }

    return res.json({ success: true, ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/tickets
 * ✅ Protected + returns only logged-in user's tickets
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      tickets,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
