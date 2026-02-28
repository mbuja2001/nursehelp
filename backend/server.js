import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import nurseRouter from "./routes/nurse.route.js";
import encounterRouter from "./routes/encounter.route.js";
import triageRouter from "./routes/triage.route.js";

dotenv.config();

const app = express();

// ----------------------
// 🔥 MUST BE FIRST
// ----------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ----------------------
// CORS
// ----------------------
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// ----------------------
// MongoDB
// ----------------------
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

// ----------------------
// ROUTES
// ----------------------
app.use("/api/nurses", nurseRouter);
app.use("/api/encounters", encounterRouter);
app.use("/api/triage", triageRouter);

// ----------------------
// HEALTH CHECK
// ----------------------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ----------------------
// GLOBAL ERROR HANDLER
// ----------------------
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);
  res.status(500).json({ message: err.message || "Server error" });
});

// ----------------------
// START
// ----------------------
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});