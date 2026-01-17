import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import healthRoutes from "./routes/health.routes.js";
import slotRoutes from "./routes/slot.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import zoneRoutes from "./routes/zone.routes.js";
import verifyRoutes from "./routes/verify.routes.js";
import authRoutes from "./routes/auth.routes.js";






const app = express();
const server = http.createServer(app);


app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));



app.use("/api/health", healthRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/auth", authRoutes);





const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Socket Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket Disconnected:", socket.id);
  });
});


const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});
console.log("EMAIL_HOST =", process.env.EMAIL_HOST);
console.log("EMAIL_PORT =", process.env.EMAIL_PORT);
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "✅ Loaded" : "❌ Missing");
