import mongoose from "mongoose";

const PilgrimSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },

    idType: { type: String, required: true },
    idNumber: { type: String, required: true },
    idProofFile: { type: String, required: true },

    priorityEnabled: { type: Boolean, default: false },
    priorityType: { type: String, default: "" },
    proofType: { type: String, default: "" },
    proofNumber: { type: String, default: "" },
    priorityProofFile: { type: String, default: "" },
    otherCase: { type: String, default: "" },
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },

    darshanType: { type: String, enum: ["GENERAL", "SEEGHRA"], required: true },
    date: { type: String, required: true },
    slotTime: { type: String, required: true },

    personsCount: { type: Number, required: true },

    pilgrims: { type: [PilgrimSchema], required: true },

    status: {
      type: String,
      enum: ["BOOKED", "ENTERED", "EXITED", "CANCELLED"],
      default: "BOOKED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", TicketSchema);
