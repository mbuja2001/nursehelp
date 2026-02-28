// src/models/encounter.model.js
import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema({
  id: { type: Number },
  type: { type: String },
  text: { type: String }
}, { _id: false }); // avoid nested _id

const encounterSchema = new mongoose.Schema({
  nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", default: null },
  patient: {
    name: String,
    symptoms: String,
    duration: String,
    painLevel: String,
    history: String
  },
  transcript: { type: [transcriptSchema], default: [] }, // << important fix
  vitals: {
    temp: Number,
    bp: String,
    hr: Number,
    o2: Number,
    resp: Number
  },
  triage: { type: Object, default: {} },
  nurseNotes: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "completed", "unassigned"], 
    default: "unassigned" 
  },
  severity: { type: Number, default: 1 },
  isWaiting: { type: Boolean, default: true },
  submittedAt: Date,
  attendedAt: Date
}, { timestamps: true });

export const Encounter = mongoose.model("Encounter", encounterSchema);