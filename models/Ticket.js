import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userEmail: { type: String },
    ticketId: { type: String, unique: true }, // ED-XXXX
    name: { type: String, required: true },
    phone: { type: String, required: true },

    idType: { type: String, required: true },
    idNumber: { type: String, required: true },

    // uploads (we'll store filename for now)
    idProofFile: { type: String },

    date: { type: String, required: true },
    slotTime: { type: String, required: true },

    priorityEnabled: { type: Boolean, default: false },
    priorityType: { type: String, default: "" },

    proofType: { type: String, default: "" },
    proofNumber: { type: String, default: "" },
    priorityProofFile: { type: String, default: "" },

    otherCase: { type: String, default: "" },

    status: {
      type: String,
      enum: ["BOOKED", "ENTERED", "EXITED", "CANCELLED"],
      default: "BOOKED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", TicketSchema);
