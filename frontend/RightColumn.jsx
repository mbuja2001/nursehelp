// src/PatientSummary/Components/RightColumn.jsx
import { useState } from "react";

export default function RightColumn({ vitalsData = {}, triage = null, onOpenForm, onSavePatient, saving }) {
  const [bedAssigned, setBedAssigned] = useState(false);
  const [doctorNotified, setDoctorNotified] = useState(false);

  const esi = triage?.ESI ?? null;

  const getSeverityClass = (level) => {
    if (level === null) return "";
    if (level === 1 || level === 2) return "sev-high";
    if (level === 3) return "sev-mod";
    return "sev-low";
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/pdf/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vitals: vitalsData, triage })
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patient-summary.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed");
    }
  };

  return (
    <div className="right-column-layout">

      {/* ------------------ */}
      {/* Case Severity */}
      {/* ------------------ */}
      <div className={`block severity-block ${getSeverityClass(esi)}`}>
        <h4 className="block-label">Case Severity</h4>
        {esi === null ? (
          <div style={{ color: '#777', margin: '16px 0' }}>— Not Assessed —</div>
        ) : (
          <div className={`severity-circle ${getSeverityClass(esi)}`}>
            <span>ESI {esi}</span>
          </div>
        )}
      </div>

      {/* ------------------ */}
      {/* Patient Vitals */}
      {/* ------------------ */}
      <div className="block">
        <div className="block-header">
          <h4 className="block-label">Patient Vitals</h4>
          <button className="edit-action-btn" onClick={onOpenForm}>✎</button>
        </div>
        <div className="vitals-display-list">
          <div className="vital-item"><span>Temp:</span> <strong>{vitalsData?.temp ?? '--'}°C</strong></div>
          <div className="vital-item"><span>BP:</span> <strong>{vitalsData?.bp ?? '--'}</strong></div>
          <div className="vital-item"><span>HR:</span> <strong>{vitalsData?.hr ?? '--'}</strong></div>
          <div className="vital-item"><span>O2:</span> <strong>{vitalsData?.o2 ?? '--'}%</strong></div>
          <div className="vital-item"><span>Resp:</span> <strong>{vitalsData?.resp ?? '--'}</strong></div>
        </div>
      </div>

      {/* ------------------ */}
      {/* Checklist */}
      {/* ------------------ */}
      <div className="block">
        <div className="action-checklist">
          <label className={`checklist-item ${bedAssigned ? 'completed' : ''}`}>
            <input type="checkbox" checked={bedAssigned} onChange={() => setBedAssigned(!bedAssigned)} />
            <span>Assign Bed</span>
          </label>

          <label className={`checklist-item ${doctorNotified ? 'completed' : ''}`}>
            <input type="checkbox" checked={doctorNotified} onChange={() => setDoctorNotified(!doctorNotified)} />
            <span>Notify Doctor</span>
          </label>
        </div>
      </div>

      {/* ------------------ */}
      {/* Bottom Actions */}
      {/* ------------------ */}
      <div className="bottom-action" style={{ display: "flex", gap: 8, flexDirection: "column" }}>
        {/* Trigger triage + save */}
        <button
          className="save-file-btn"
          onClick={onSavePatient}
          disabled={saving}
        >
          {saving ? "Saving..." : "💾 SAVE PATIENT FILE"}
        </button>

        {/* Optional: PDF download */}
        <button
          className="edit-action-btn"
          onClick={handleDownload}
        >
          📄 DOWNLOAD PDF
        </button>
      </div>
    </div>
  );
}