import mongoose from "mongoose";
import axios from "axios";
import { Encounter } from "../models/encounter.model.js";
import { Vital } from "../models/vitals.model.js";

// ----------------------
// Safe transcript parser
// ----------------------
const parseTranscript = (transcript) => {
  if (!transcript) return [];
  if (Array.isArray(transcript)) return transcript;
  if (typeof transcript === "string") {
    try {
      return JSON.parse(transcript.replace(/'/g, '"'));
    } catch (e) {
      console.warn("Transcript parse error:", e.message);
      return [];
    }
  }
  return [];
};

// ----------------------
// Python triage URL
// ----------------------
const PYTHON_URL = process.env.PYTHON_URL || "http://localhost:5000/triage";

// ----------------------
// Run Triage
// ----------------------
export const runTriage = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.patient || !payload?.vitals) {
      return res.status(400).json({ message: "Patient and vitals required" });
    }

    const nurseId = req.user?._id || null;
    const transcriptArray = parseTranscript(payload.transcript);

    // Call Python service if URL provided
    let triage = { ESI: 1, ai_summary: "No triage available" };
    try {
      const pythonRes = await axios.post(PYTHON_URL, payload, {
        timeout: 60000,
        headers: { "Content-Type": "application/json" },
      });
      if (pythonRes?.data) triage = pythonRes.data;
    } catch (err) {
      console.warn("Python triage call failed, using default triage:", err.message);
    }

    const severity = triage.ESI || 1;

    const encounter = await Encounter.create({
      nurse_id: nurseId,
      patient: payload.patient,
      transcript: transcriptArray,
      vitals: payload.vitals,
      triage: { ...triage, severity },
      nurseNotes: payload.nurseNotes || "",
      status: nurseId ? "pending" : "unassigned",
      submittedAt: null,
      isWaiting: true,
      severity,
    });

    return res.status(201).json({ message: "Triage completed", encounter });
  } catch (err) {
    console.error("Triage error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ----------------------
// Start Encounter (manual nurse intake)
// ----------------------
export const startEncounter = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    const nurseId = req.user._id;
    const transcriptArray = parseTranscript(req.body.transcript);

    const encounter = await Encounter.create({
      nurse_id: nurseId,
      patient: req.body.patient || {},
      transcript: transcriptArray,
      vitals: {
        temp: req.body.temperature,
        bp: req.body.blood_pressure,
        hr: req.body.heart_rate,
        o2: req.body.oxygen_saturation,
        resp: req.body.resp,
      },
      triage: req.body.triage || {},
      severity: req.body.severity || 1,
      status: "pending",
      isWaiting: true,
      nurseNotes: req.body.nurseNotes || "",
    });

    // Save vitals if provided
    if (
      req.body.temperature ||
      req.body.blood_pressure ||
      req.body.heart_rate ||
      req.body.oxygen_saturation
    ) {
      await Vital.create({
        encounter_id: encounter._id,
        temperature: req.body.temperature,
        blood_pressure: req.body.blood_pressure,
        heart_rate: req.body.heart_rate,
        oxygen_saturation: req.body.oxygen_saturation,
        resp: req.body.resp,
      });
    }

    return res.status(201).json({ message: "Encounter created successfully", encounter });
  } catch (err) {
    console.error("Start Encounter Error:", err);
    return res.status(400).json({ message: err.message || "Failed to create encounter" });
  }
};

// ----------------------
// Confirm Encounter
// ----------------------
export const confirmEncounter = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    const { id } = req.params;
    const nurseId = req.user._id;
    const nurseNotes = req.body.nurseNotes || "";

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid encounter id" });

    const encounter = await Encounter.findOneAndUpdate(
      { _id: id, $or: [{ nurse_id: nurseId }, { nurse_id: null }] },
      { $set: { status: "confirmed", submittedAt: new Date(), nurseNotes, nurse_id: nurseId } },
      { new: true, select: "_id patient vitals severity status nurseNotes isWaiting" }
    );

    if (!encounter) return res.status(404).json({ message: "Encounter not found or assigned to another nurse" });

    return res.status(200).json({ message: "Encounter confirmed", encounter });
  } catch (err) {
    console.error("Confirm Encounter Error:", err);
    return res.status(500).json({ message: err.message || "Confirm failed" });
  }
};

// ----------------------
// Attend Encounter
// ----------------------
export const attendEncounter = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    const { id } = req.params;
    const nurseId = req.user._id;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid encounter id" });

    const encounter = await Encounter.findOne({ _id: id, nurse_id: nurseId });
    if (!encounter) return res.status(404).json({ message: "Encounter not found" });

    encounter.status = "completed";
    encounter.attendedAt = new Date();
    encounter.isWaiting = false;
    await encounter.save();

    return res.status(200).json({ message: "Encounter marked as attended", encounter });
  } catch (err) {
    console.error("Attend Encounter Error:", err);
    return res.status(500).json({ message: err.message || "Attend failed" });
  }
};

// ----------------------
// Get waiting encounters
// ----------------------
export const getWaitingEncounters = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    const nurseId = req.user._id;
    const encounters = await Encounter.find({ nurse_id: nurseId, isWaiting: true }).sort({ createdAt: 1 });
    return res.status(200).json(encounters);
  } catch (err) {
    console.error("Waiting Queue Error:", err);
    return res.status(500).json({ message: "Failed to fetch waiting encounters" });
  }
};

// ----------------------
// Get encounter by ID
// ----------------------
export const getEncounterById = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid encounter id" });

    const nurseId = req.user._id;
    const encounter = await Encounter.findOne({ _id: id, nurse_id: nurseId });
    if (!encounter) return res.status(404).json({ message: "Encounter not found" });

    return res.status(200).json({ encounter });
  } catch (err) {
    console.error("Get Encounter Error:", err);
    return res.status(500).json({ message: "Failed to fetch encounter" });
  }
};