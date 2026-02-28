// src/PatientSummary/Components/LeftColumn.jsx
import React, { useState } from "react";

export default function LeftColumn({ data = {}, setData }) {
  // local UI editing flags
  const [editing, setEditing] = useState({
    name: false, symptoms: false, duration: false, painLevel: false, history: false
  });

  // helper to update top-level patient fields (guard setData)
  const updateField = (field, value) => {
    if (typeof setData !== "function") return;
    setData(prev => ({ ...prev, [field]: value }));
  };

  // clear field with confirmation
  const handleClear = (field) => {
    if (!window.confirm("Are you sure you want to clear this field?")) return;
    updateField(field, "");
  };

  return (
    <div className="left-column-layout">
      <div className="block block-small">
        <div className="display-container">
          {editing.name ? (
            <input
              className="edit-input"
              value={data?.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => setEditing(prev => ({ ...prev, name: false }))}
              autoFocus
            />
          ) : (
            <p onClick={() => setEditing(prev => ({ ...prev, name: true }))}>{data?.name || "Unnamed"}</p>
          )}
          <button className="edit-action-btn" onClick={() => setEditing(prev => ({ ...prev, name: !prev.name }))}>
            {editing.name ? "✅" : "✎"}
          </button>
        </div>
      </div>

      {[
        { key: "symptoms", label: "Symptoms" },
        { key: "duration", label: "Duration" },
        { key: "painLevel", label: "Pain Level" },
        { key: "history", label: "History" }
      ].map((sec) => (
        <div className="block" key={sec.key}>
          <div className="block-header">
            <h4 className="block-label">{sec.label}</h4>
            <div className="action-group">
              <button
                className="edit-action-btn"
                onClick={() => setEditing(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
              >
                {editing[sec.key] ? "✅" : "✎"}
              </button>
              <button className="delete-btn" onClick={() => handleClear(sec.key)}>×</button>
            </div>
          </div>

          {editing[sec.key] ? (
            <textarea
              className="edit-textarea"
              value={data?.[sec.key] || ""}
              onChange={(e) => updateField(sec.key, e.target.value)}
            />
          ) : (
            <div className="content-area">{data?.[sec.key] || <em>Not provided</em>}</div>
          )}
        </div>
      ))}
    </div>
  );
}