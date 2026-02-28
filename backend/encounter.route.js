import express from "express";
import {
  startEncounter,
  runTriage,
  confirmEncounter,
  attendEncounter,
  getWaitingEncounters,
  getEncounterById
} from "../controllers/encounter.controller.js";

import { protect } from "../middleware/authmiddleware.js";

const router = express.Router();

router.post("/", protect, startEncounter);
router.post("/triage", runTriage);

router.get("/waiting", protect, getWaitingEncounters);

router.patch("/:id/confirm", protect, confirmEncounter);
router.put("/:id/attend", protect, attendEncounter);

router.get("/:id", protect, getEncounterById);

export default router;