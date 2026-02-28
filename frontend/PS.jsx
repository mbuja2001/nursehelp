// src/PatientSummary/PS.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Header from "./Components/Header";
import Footer from "./Components/footer";
import LeftColumn from "./Components/LeftColumn";
import MiddleColumn from "./Components/MiddleColumn";
import RightColumn from "./Components/RightColumn";
import Vitals from "./Components/Vitals";

import "./PS.css";
import "./PS_index.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export default function PS() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const isNew = !patientId;

  // ----------------------
  // Patient / Encounter State
  // ----------------------
  const [patientData, setPatientData] = useState(() => {
    const saved = localStorage.getItem("ps_patient");
    return saved ? JSON.parse(saved) : {
      name: "Patient A",
      symptoms: "Chest pain",
      duration: "2 hours",
      painLevel: "Severe",
      history: "No significant history"
    };
  });

  const [transcript, setTranscript] = useState(() => {
    const saved = localStorage.getItem("ps_transcript");
    return saved ? JSON.parse(saved) : [
      { id: 1, type: "question", text: "What is the primary reason?" },
      { id: 2, type: "answer", text: "Sharp chest pains..." }
    ];
  });

  const [vitalsData, setVitalsData] = useState(() => {
    const saved = localStorage.getItem("ps_vitals");
    return saved ? JSON.parse(saved) : {
      temp: "--",
      bp: "--",
      hr: "--",
      o2: "--",
      resp: "--"
    };
  });

  const [triageResult, setTriageResult] = useState(null);

  const [showForm, setShowForm] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [loadingEncounter, setLoadingEncounter] = useState(false);

  // ----------------------
  // Persist locally
  // ----------------------
  useEffect(() => localStorage.setItem("ps_patient", JSON.stringify(patientData)), [patientData]);
  useEffect(() => localStorage.setItem("ps_transcript", JSON.stringify(transcript)), [transcript]);
  useEffect(() => localStorage.setItem("ps_vitals", JSON.stringify(vitalsData)), [vitalsData]);

  // ----------------------
  // Load existing encounter
  // ----------------------
  useEffect(() => {
    let mounted = true;
    const loadEncounter = async () => {
      if (!patientId) return;
      setLoadingEncounter(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/encounters/${patientId}`);
        if (!res.ok) throw new Error("Failed to fetch encounter");
        const { encounter } = await res.json();
        if (!mounted || !encounter) return;
        setPatientData(encounter.patient || {});
        setTranscript(encounter.transcript || []);
        setVitalsData(encounter.vitals || {});
        setTriageResult(encounter.triage || null);
        setShowForm(false);
      } catch (err) {
        console.warn("Unable to load encounter:", err);
      } finally {
        if (mounted) setLoadingEncounter(false);
      }
    };
    loadEncounter();
    return () => { mounted = false; };
  }, [patientId]);

  // ----------------------
  // Navigation / Logout
  // ----------------------
  const handleGoBack = () => navigate("/", { state: { fromSummary: true } });
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ----------------------
  // Validate Vitals
  // ----------------------
  const validateVitals = (v) => {
    if (!v?.bp || v.bp === "--") return { ok: false, message: "BP is required" };
    if (v.hr !== "--" && v.hr !== "" && (Number(v.hr) < 20 || Number(v.hr) > 220)) return { ok: false, message: "Heart rate out of range (20-220)" };
    if (v.o2 !== "--" && v.o2 !== "" && (Number(v.o2) < 30 || Number(v.o2) > 100)) return { ok: false, message: "O2 out of range (30-100)" };
    return { ok: true };
  };

  // ----------------------
  // Build payload for triage
  // ----------------------
  const buildPayload = () => ({
    patient: patientData,
    transcript,
    vitals: vitalsData
  });

  // ----------------------
  // Save patient file & run triage
  // ----------------------
  const handleSavePatient = async () => {
    const vCheck = validateVitals(vitalsData);
    if (!vCheck.ok) { alert(vCheck.message); return; }

    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await fetch(`${BACKEND_URL}/api/triage/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Save triage failed");
      }

      const data = await res.json();
      if (!data?.encounter) throw new Error("No encounter returned from server");

      // Navigate to dedicated Patient Report page (pass encounter id)
      const enc = data.encounter;
      // prefer server id, otherwise client could build a temporary id
      // *** IMPORTANT FIX: navigate to /summary/:id (matches router) ***
      navigate(`/summary/${enc._id || enc.id}`, { state: { encounter: enc } });

    } catch (err) {
      console.error("Save patient error:", err);
      alert("Save failed: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-main-page-wrapper">
      {showForm ? (
        <Vitals
          onComplete={() => setShowForm(false)}
          setVitalsData={setVitalsData}
          vitalsData={vitalsData}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="app-wrapper">
          <Header onBackClick={handleGoBack} onLogout={handleLogout} />
          <main className="main-container">
            <div className="dashboard-grid" style={{ display: "flex", gap: "20px", padding: "20px" }}>
              <LeftColumn data={patientData} setData={setPatientData} />
              <MiddleColumn data={transcript} setData={setTranscript} />
              <RightColumn
                vitalsData={vitalsData}
                triage={triageResult}
                onOpenForm={() => setShowForm(true)}
                onSavePatient={handleSavePatient}
                saving={saving}
              />
            </div>
          </main>
          <Footer />
        </div>
      )}
    </div>
  );
}