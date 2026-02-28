// src/Dashboard/TriageBoard.jsx
import React, { useEffect, useState } from "react";
const BACKEND_URL = "http://localhost:5001";

export default function TriageBoard() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchBoard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/queue`);
        const data = await res.json();
        if (mounted) setPatients(data);
      } catch (err) {
        console.error("queue fetch error", err);
      }
    };
    fetchBoard();
    const iv = setInterval(fetchBoard, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const colorFor = (esi) => {
    if (esi === 1 || esi === 2) return "#d62828";
    if (esi === 3) return "#f4a261";
    return "#2a9d8f";
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Triage Queue</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {patients.map(p => (
          <div key={p.id || p._id} style={{ background: colorFor(p.triage?.ESI || 5), color: "white", padding: 12, borderRadius: 6 }}>
            <div style={{ fontWeight: "bold" }}>{p.patientName}</div>
            <div>ESI: {p.triage?.ESI}</div>
            <div style={{ opacity: 0.9 }}>{p.triage?.specialty}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
