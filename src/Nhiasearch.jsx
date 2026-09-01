import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Nhiasearch({ show, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // If the modal state is false, do not render anything
  if (!show) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("nhiahospital")
      .select("*")
      .or(`hospname.ilike.%${query}%,nhiacode.ilike.%${query}%`);

    if (!error && data) {
      setResults(data);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* 1. Dark background overlay layer using native Bootstrap classes */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* 2. Main Bootstrap Modal Container */}
      <div 
        className="modal fade show" 
        style={{ display: "block", zIndex: 1050 }} 
        tabIndex="-1"
        role="dialog"
      >
        {/* Adds center alignment and scalable width options (modal-lg) */}
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content shadow">
            
            {/* Modal Header containing title and 'X' close action button */}
            <div className="modal-header">
              <h5 className="modal-title">Search Registered Providers</h5>
              <button 
                type="button" 
                className="btn-close" 
                aria-label="Close" 
                onClick={onClose}
              ></button>
            </div>

            {/* Modal Body containing search controls and query outputs */}
            <div className="modal-body">
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter hospital name or NHIA code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleSearch} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </button>
              </div>

              {/* Dynamic Search Results Container */}
              {results.length > 0 ? (
                <ul className="list-group max-vh-50 overflow-auto">
                  {results.map((h) => (
                    <li key={h.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-0 text-dark">{h.hospname}</h6>
                        <small className="text-muted">Code: {h.nhiacode}</small>
                      </div>
                      <span className="badge bg-secondary rounded-pill">Tier {h.tier}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                query && !loading && (
                  <div className="text-center py-4 text-muted small">
                    No clinical providers matched your parameters.
                  </div>
                )
              )}
            </div>

            {/* Modal Footer containing close button actions */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Dismiss
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
