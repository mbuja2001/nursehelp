// src/PatientSummary/Components/Vitals.jsx
import React, { useState, useEffect } from "react";

export default function Vitals({ onComplete, onCancel, setVitalsData, vitalsData }) {
  const [formData, setFormData] = useState({
    temp: vitalsData?.temp === '--' ? '' : vitalsData?.temp || '',
    bp: vitalsData?.bp === '--' ? '' : vitalsData?.bp || '',
    hr: vitalsData?.hr === '--' ? '' : vitalsData?.hr || '',
    o2: vitalsData?.o2 === '--' ? '' : vitalsData?.o2 || '',
    resp: vitalsData?.resp === '--' ? '' : vitalsData?.resp || ''
  });

  useEffect(() => {
    setFormData({
      temp: vitalsData?.temp === '--' ? '' : vitalsData?.temp || '',
      bp: vitalsData?.bp === '--' ? '' : vitalsData?.bp || '',
      hr: vitalsData?.hr === '--' ? '' : vitalsData?.hr || '',
      o2: vitalsData?.o2 === '--' ? '' : vitalsData?.o2 || '',
      resp: vitalsData?.resp === '--' ? '' : vitalsData?.resp || ''
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitalsData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.bp) {
      return { ok: false, message: "BP (e.g. 120/80) is required" };
    }
    const hrVal = Number(formData.hr);
    if (formData.hr && (isNaN(hrVal) || hrVal < 20 || hrVal > 220)) {
      return { ok: false, message: "HR must be a number between 20 and 220" };
    }
    const o2Val = Number(formData.o2);
    if (formData.o2 && (isNaN(o2Val) || o2Val < 30 || o2Val > 100)) {
      return { ok: false, message: "O2 must be a number between 30 and 100" };
    }
    return { ok: true };
  };

  const handleSave = () => {
    const v = validate();
    if (!v.ok) return alert(v.message);

    // normalize: keep numbers as numbers where appropriate
    const normalized = {
      temp: formData.temp === "" ? "--" : Number(formData.temp),
      bp: formData.bp,
      hr: formData.hr === "" ? "--" : Number(formData.hr),
      o2: formData.o2 === "" ? "--" : Number(formData.o2),
      resp: formData.resp === "" ? "--" : Number(formData.resp)
    };

    setVitalsData(normalized);
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Clinical Vitals Intake</h2>

        <div className="vitals-grid">
          <div className="form-group">
            <label>Temp (°C)</label>
            <input
              name="temp"
              type="number"
              step="0.1"
              value={formData.temp}
              onChange={handleChange}
              className="vitals-input"
            />
          </div>

          <div className="form-group">
            <label>BP (mmHg)</label>
            <input
              name="bp"
              type="text"
              value={formData.bp}
              onChange={handleChange}
              placeholder="e.g. 120/80"
              className="vitals-input"
            />
          </div>

          <div className="form-group">
            <label>Heart Rate (BPM)</label>
            <input
              name="hr"
              type="number"
              value={formData.hr}
              onChange={handleChange}
              className="vitals-input"
            />
          </div>

          <div className="form-group">
            <label>O2 Sat (%)</label>
            <input
              name="o2"
              type="number"
              value={formData.o2}
              onChange={handleChange}
              className="vitals-input"
            />
          </div>

          <div className="form-group">
            <label>Resp Rate</label>
            <input
              name="resp"
              type="number"
              value={formData.resp}
              onChange={handleChange}
              className="vitals-input"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSave} className="save-file-btn">Save & Continue</button>
          <button onClick={onCancel} className="edit-action-btn" style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}