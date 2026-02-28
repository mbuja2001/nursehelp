// src/routes/triage.route.js
import express from "express";
import { runTriage } from "../controllers/triage.controller.js";
// import { protect } from "../middleware/authmiddleware.js"; ❌ remove for now

const router = express.Router();

// ✅ TEMP: no auth blocking
router.post("/run", runTriage);

export default router;