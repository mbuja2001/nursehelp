import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export default function PatientReport() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [encounter, setEncounter] = useState(location.state?.encounter || null);
  const [loading, setLoading] = useState(!encounter);
  const [saving, setSaving] = useState(false);
  const [nurseNotes, setNurseNotes] = useState(encounter?.nurseNotes || "");

  const getEncounterId = (enc) => enc?._id ?? null;

  useEffect(() => {
    if (encounter) return;
    let mounted = true;

    const fetchEncounter = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`${BACKEND_URL}/api/encounters/${id}`, { headers });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `Failed to load encounter (status ${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        const enc = payload?.encounter ?? payload;
        if (!mounted) return;

        if (!enc) throw new Error("Encounter response malformed");
        setEncounter(enc);
        setNurseNotes(enc?.nurseNotes || "");
      } catch (err) {
        console.error("Fetch encounter error:", err);
        alert("Failed to load report: " + (err.message || ""));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEncounter();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Loading patient report…</div>;
  if (!encounter) return <div style={{ padding: 24 }}>No report found.</div>;

  const { patient, vitals, transcript, triage } = encounter;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to confirm a report.");
        navigate("/");
        return;
      }

      const encId = getEncounterId(encounter);
      if (!encId) throw new Error("Encounter ID missing; cannot confirm.");

      const res = await fetch(`${BACKEND_URL}/api/encounters/${encId}/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nurseNotes }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Confirm failed (status ${res.status})`);
      }

      const data = await res.json().catch(() => null);
      const updatedEncounter = data?.encounter ?? data;
      if (!updatedEncounter) throw new Error("Server returned no updated encounter");

      setEncounter(updatedEncounter);
      alert("Patient report confirmed");
      navigate("/", { state: { newPatient: updatedEncounter } });
    } catch (err) {
      console.error("Confirm error:", err);
      alert("Failed to confirm: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleAttendPatient = async () => {
    if (!window.confirm("Mark this patient as attended by the physician?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to mark as attended.");
        navigate("/");
        return;
      }

      const encId = getEncounterId(encounter);
      if (!encId) throw new Error("Encounter ID missing; cannot mark as attended.");

      const res = await fetch(`${BACKEND_URL}/api/encounters/${encId}/attend`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Attend failed (status ${res.status})`);
      }

      const payload = await res.json().catch(() => null);
      const updated = payload?.encounter ?? payload;
      if (!updated) throw new Error("Server returned no updated encounter");

      setEncounter(updated);
      alert("Patient marked as attended");
      navigate("/");
    } catch (err) {
      console.error("Attend error:", err);
      alert("Failed to mark patient as attended: " + (err.message || ""));
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return "N/A";
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="patient-report-page" style={{ padding: 20 }}>
      <h2>Patient Report Preview</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <section className="block">
            <h4 className="block-label">Patient</h4>
            <div className="content-area">
              <strong>{patient?.name}</strong><br />
              {patient?.symptoms}<br />
              {patient?.duration} • {patient?.painLevel}<br />
              <em>{patient?.history}</em>
            </div>
          </section>

          <section className="block" style={{ marginTop: 12 }}>
            <h4 className="block-label">Transcript</h4>
            <div className="content-area">
              {(transcript || []).map((t) => (
                <div key={t.id ?? Math.random()} style={{ marginBottom: 8 }}>
                  <strong>{(t.type || "").toUpperCase()}</strong> — {t.text}
                </div>
              ))}
            </div>
          </section>

          <section className="block" style={{ marginTop: 12 }}>
            <h4 className="block-label">AI Triage</h4>
            <div className="content-area">
              <div><strong>ESI:</strong> {triage?.ESI ?? "N/A"}</div>
              <div><strong>Specialty:</strong> {triage?.specialty ?? "N/A"}</div>
              <div style={{ marginTop: 8 }}>
                <strong>Summary:</strong>
                <div style={{ marginTop: 6 }}>{triage?.ai_summary ?? triage?.summary ?? "No summary"}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Clinical Structure:</strong>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{triage?.clinical_structure ?? "N/A"}</pre>
              </div>
            </div>
          </section>
        </div>

        <aside>
          <section className="block">
            <h4 className="block-label">Patient Vitals & Queue</h4>
            <div className="vitals-display-list">
              <div className="vital-item"><span>Temp:</span> <strong>{vitals?.temp ?? '--'}°C</strong></div>
              <div className="vital-item"><span>BP:</span> <strong>{vitals?.bp ?? '--'}</strong></div>
              <div className="vital-item"><span>HR:</span> <strong>{vitals?.hr ?? '--'}</strong></div>
              <div className="vital-item"><span>O2:</span> <strong>{vitals?.o2 ?? '--'}%</strong></div>
              <div className="vital-item"><span>Resp:</span> <strong>{vitals?.resp ?? '--'}</strong></div>
            </div>

            <div style={{ marginTop: 8 }}>
              <strong>Waiting:</strong> {encounter.isWaiting ? "Yes" : "No"}<br />
              <strong>Waiting Time:</strong> {timeAgo(encounter.createdAt)}
            </div>
          </section>

          <section className="block" style={{ marginTop: 12 }}>
            <h4 className="block-label">Nurse Notes</h4>
            <textarea
              className="edit-textarea"
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
            />
          </section>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="edit-action-btn" onClick={() => navigate(-1)}>Edit</button>
            <button className="save-file-btn" onClick={handleConfirm} disabled={saving}>
              {saving ? "Confirming..." : "Confirm & Save Report"}
            </button>
            {encounter.isWaiting && (
              <button className="save-file-btn" onClick={handleAttendPatient} disabled={saving}>
                Mark as Attended
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}