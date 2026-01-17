import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ EasyDarshan Backend Running",
    time: new Date().toISOString(),
  });
});

export default router;
