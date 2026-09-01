import React, { useState } from "react";
import NhiaForm from "./NhiaForm";
import NhiaNyscForm from "./NhiaNyscForm";

export default function NhiaAuthorization() {
  // Operational state layout parameter
  const [formContext, setFormContext] = useState("NHIA");

  return (
    <div className="container-fluid px-0 mx-auto" style={{ maxWidth: "720px" }}>
      
      {/* 📊 Native Bootstrap Toggle Nav Pill Layout Wrapper Center */}
      <ul className="nav nav-pills nav-fill bg-white border rounded p-1 mb-4 shadow-sm">
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setFormContext("NHIA")}
            className={`nav-link py-2.5 text-uppercase fw-bold transition-all border-0 rounded text-xs ${
              formContext === "NHIA"
                ? "bg-primary text-white shadow-sm"
                : "text-secondary bg-transparent"
            }`}
            style={{ letterSpacing: "0.5px" }}
          >
            <span className="me-2">🛡️</span> Standard NHIA Entry
          </button>
        </li>
        
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setFormContext("NYSC")}
            className={`nav-link py-2.5 text-uppercase fw-bold transition-all border-0 rounded text-xs ${
              formContext === "NYSC"
                ? "bg-primary text-white shadow-sm"
                : "text-secondary bg-transparent"
            }`}
            style={{ letterSpacing: "0.5px" }}
          >
            <span className="me-2">🎓</span> NYSC Special Router
          </button>
        </li>
      </ul>

      {/* 🚀 Persistent Layout Optimization Node Mount Matrix */}
      {/* Keeping components mounted avoids infinite database refetching cycles on click events */}
      <div className={formContext === "NHIA" ? "d-block animate-fade-in" : "d-none"}>
        <NhiaForm />
      </div>

      <div className={formContext === "NYSC" ? "d-block animate-fade-in" : "d-none"}>
        <NhiaNyscForm />
      </div>

    </div>
  );
}
