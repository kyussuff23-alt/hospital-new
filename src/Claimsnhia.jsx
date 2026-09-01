import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
// ✅ Import the new isolated sub-module cleanly
import Nhiavett from "./Nhiavett"; 

const claimsQueryClient = new QueryClient();

function ClaimsNhiaTable({ onRequestProcessed }) {
  const [claimsFilter, setClaimsFilter] = useState("All");
  const [alert, setAlert] = useState({ message: null, type: "success" });
  
  // ✅ TRACKER STATE: Houses the claim data object when a row link is activated
  const [selectedClaimForVetting, setSelectedClaimForVetting] = useState(null);

  const triggerAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: null, type: "success" }), 4000);
  };

  const { data: claimslive = [], isLoading } = useQuery({
    queryKey: ["nhiaPendingClaimsData"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nhia_claims_biodata")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        triggerAlert("Error fetching existing pending claims.", "danger");
        throw error;
      }
      return data || [];
    },
    refetchInterval: 30000, 
    refetchOnWindowFocus: true,
  });

  const filteredClaims = claimslive.filter((claim) => {
    if (claimsFilter === "All") return true;
    return claim.status?.toLowerCase() === claimsFilter.toLowerCase();
  });

  return (
    <div className="card shadow-sm p-4 bg-white rounded">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark m-0">Claims Processing Queue</h4>
          <p className="text-muted small m-0">Click any patient record to launch audit workflow panel.</p>
        </div>
        
        <select 
          className="form-select w-auto"
          value={claimsFilter}
          onChange={(e) => setClaimsFilter(e.target.value)}
        >
          <option value="All">All Live Pending</option>
        </select>
      </div>

      {alert.message && (
        <div className={`alert alert-${alert.type} d-flex align-items-center mb-3 shadow-sm`} role="alert">
          <div>{alert.message}</div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading outstanding claims...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-5 border border-dashed rounded bg-light">
          <span className="fs-1">📥</span>
          <p className="text-muted mt-2 fw-medium">No pending claims found.</p>
        </div>
      ) : (
        <div className="table-responsive border rounded" style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
          <table className="table table-hover align-middle m-0">
            <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
              <tr>
                <th>Date Submitted</th>
                <th>Ref ID</th>
                <th>Enrollee Name</th>
                <th>NHIA Number</th>
                <th>Hospital Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr key={claim.id}>
                  <td>
                    <span className="small text-muted text-nowrap">
                      {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "N/A"}
                    </span>
                  </td>
                  <td><span className="badge bg-secondary font-monospace">{claim.refid}</span></td>
                  
                  {/* ✅ THE INTUITIVE LINK: Click to open modal layout matrix */}
                  <td>
                    <button 
                      onClick={() => setSelectedClaimForVetting(claim)}
                      className="btn btn-link p-0 text-start text-decoration-none fw-bold text-primary text-nowrap shadow-none"
                    >
                      🔍 {claim.enrolleename}
                    </button>
                  </td>
                  
                  <td><span className="font-monospace text-secondary">{claim.nhianumber}</span></td>
                  <td className="text-nowrap text-muted">{claim.hospitalname}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ SEAMLESS CONTEXT OVERLAY LAYER INJECTION */}
      {selectedClaimForVetting && (
        <Nhiavett 
          claim={selectedClaimForVetting} 
          onClose={() => setSelectedClaimForVetting(null)} 
          onRequestProcessed={() => {
            triggerAlert("Claim state evaluated and dispatched cleanly.", "success");
            if (onRequestProcessed) onRequestProcessed();
          }}
        />
      )}
    </div>
  );
}

export default function Claimsnhia(props) {
  return (
    <QueryClientProvider client={claimsQueryClient}>
      <ClaimsNhiaTable {...props} />
    </QueryClientProvider>
  );
}
