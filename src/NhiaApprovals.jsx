import React, { useState } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
// ✅ Cleanly import the newly created executive vetting sub-modal
import NhiaFinalApprovals from "./NhiaFinalApprovals";
// ✅ Import the new isolated sub-module cleanly for spreadsheet generation
import NhiaReport from "./NhiaReport";

// Initialize an isolated cache client engine instance for this component scope
const dynamicLocalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const ITEMS_PER_PAGE = 10;

function ApprovedClaimsLedger() {
  const [currentPage, setCurrentPage] = useState(0);
  
  // ✅ STATE TRACKER: Holds active row data when a senior officer triggers the authorization token link
  const [selectedClaimForFinalApproval, setSelectedClaimForFinalApproval] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // 🟢 NEW STATE TOGGLE: Switches between the master grid list view or the report query dashboard sheet
  const [showReportDashboard, setShowReportDashboard] = useState(false);

  const triggerAlertMessage = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4500);
  };

  // Keep tracking parameter context current inside query cache scopes
  dynamicLocalQueryClient.setQueryData(["currentPage"], currentPage);

  // 🛰️ LIVE DATABASE LAYER: Fetch paginated approved claims + total count
  const { data, isLoading, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["nhiaApprovedClaimsLedger", currentPage],
    queryFn: async () => {
      const fromOffset = currentPage * ITEMS_PER_PAGE;
      const toOffset = fromOffset + ITEMS_PER_PAGE - 1;

      const { data: records, error: fetchError, count } = await supabase
        .from("nhia_claims_biodata")
        .select("id,created_at, refid, authcode, enrolleename, nhianumber, hospitalname", { count: "exact" })
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(fromOffset, toOffset);

      if (fetchError) throw fetchError;
      return { records: records || [], totalCount: count || 0 };
    },
    placeholderData: (previousData) => previousData,
  });

  const approvedClaims = data?.records || [];
  const totalRecords = data?.totalCount || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
      {/* 🟢 REWIRED DYNAMIC HEADER PANEL STRIP */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="fw-bold text-dark m-0">
            {showReportDashboard ? "📊 Remittance Advice & Reporting Console" : "🛡️ Executive Approvals Archive Ledger"}
          </h5>
          <p className="text-muted small m-0">
            {showReportDashboard ? "Generate cross-referenced invoice spreadsheets filtered by hospital timelines." : "Reviewing cleared encounters requiring historical authorization verification keys."}
          </p>
        </div>
        
        <div className="d-flex gap-2 text-nowrap">
          {/* 📊 THE NEW EXPLICIT TOGGLE REPORT LINK TRIGGER ELEMENT */}
          <button 
            type="button"
            className={`btn btn-sm fw-bold px-3 shadow-sm ${showReportDashboard ? "btn-dark" : "btn-outline-primary"}`}
            onClick={() => setShowReportDashboard(!showReportDashboard)}
          >
            {showReportDashboard ? "📋 Back to Approvals Ledger" : "📊 Open Remittance Reports"}
          </button>

          {!showReportDashboard && (
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary font-monospace d-flex align-items-center gap-1 shadow-sm"
              onClick={() => refetch()}
            >
              🔄 Re-Sync Ledger
            </button>
          )}
        </div>
      </div>

      {alertMessage && (
        <div className="alert alert-success small p-2 mb-3 shadow-sm" role="alert">
          ℹ️ {alertMessage}
        </div>
      )}

      {/* 🟢 CONDITIONALLY RENDER EITHER THE INVOICE GENERATOR OR THE PRIMARY DATA GRID SEGMENTS */}
      {showReportDashboard ? (
        <NhiaReport />
      ) : isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
          <span className="text-muted small fw-medium">Compiling authorization matrices from Supabase...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger small p-3 m-0">
          ❌ <strong>Database Connection Fault:</strong> {error.message}
        </div>
      ) : approvedClaims.length === 0 ? (
        <div className="text-center py-5 bg-light rounded border border-dashed">
          <span className="fs-3">📁</span>
          <p className="text-muted small mt-2 m-0 fw-semibold">No approved claim parameters exist within this specific catalog segment.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap" style={{ fontSize: "0.85rem" }}>
              <thead className="table-dark">
                <tr style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  <th className="ps-3">Date Approved</th>
                  <th>Reference ID</th>
                  <th>Authorization Code</th>
                  <th>Enrollee Full Name</th>
                  <th>NHIA Number</th>
                  <th className="pe-3">Hospital Facility Origin</th>
                </tr>
              </thead>
              <tbody>
                {approvedClaims.map((claim, index) => (
                  <tr key={index} className="hover-bg-light">
                    <td className="ps-3 font-monospace text-secondary">
                      {new Date(claim.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit'
                      })}
                    </td>
                    <td className="fw-bold font-monospace text-secondary">{claim.refid || "—"}</td>
                    <td>
                      {claim.authcode ? (
                        /* ✅ REWIRED LINK INTERCEPTOR: Click to set state and launch modal */
                        <a 
                          href="#/" 
                          className="text-success fw-bold font-monospace text-decoration-none border-bottom border-success border-dashed pb-0.5"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedClaimForFinalApproval(claim);
                          }}
                        >
                          🔐 {claim.authcode}
                        </a>
                      ) : (
                        <span className="text-muted small italic opacity-50">No Token Generated</span>
                      )}
                    </td>
                    <td className="fw-semibold text-dark">{claim.enrolleename || "—"}</td>
                    <td className="font-monospace text-muted">{claim.nhianumber || "—"}</td>
                    <td className="text-secondary fw-medium pe-3">{claim.hospitalname || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 pt-3 border-top gap-3">
            <div className="text-muted small">
              Showing <strong className="text-dark">{currentPage * ITEMS_PER_PAGE + 1}</strong> to{" "}
              <strong className="text-dark">
                {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalRecords)}
              </strong>{" "}
              of <strong className="text-dark">{totalRecords}</strong> records
            </div>

            <nav aria-label="Approvals ledger pagination">
              <ul className="pagination pagination-sm m-0 gap-1">
                <li className={`page-item ${currentPage === 0 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link rounded-3 border px-3 shadow-none fw-semibold"
                    onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                  >
                    ← Previous
                  </button>
                </li>
                
                <li className="page-item d-flex align-items-center px-2">
                  <span className="text-muted small font-monospace">
                    Page <strong>{currentPage + 1}</strong> of <strong>{totalPages || 1}</strong>
                  </span>
                </li>

                <li className={`page-item ${currentPage >= totalPages - 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link rounded-3 border px-3 shadow-none fw-semibold"
                    onClick={() => setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev))}
                    disabled={currentPage >= totalPages - 1 || isPlaceholderData}
                  >
                    Next →
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}

      <div className="card-footer bg-transparent border-top mt-3 pt-3 p-0 d-flex align-items-center justify-content-between text-muted small opacity-75">
        <span>Live Connection Pipeline Security Checked</span>
        <span>Operational Page Cache Tracking Enabled</span>
      </div>

      {/* ✅ OVERLAY POPUP DISPATCHER LAYER */}
      {selectedClaimForFinalApproval && (
        <NhiaFinalApprovals 
          claim={selectedClaimForFinalApproval}
          onClose={() => setSelectedClaimForFinalApproval(null)}
          onRequestProcessed={(decision) => {
            triggerAlertMessage(`Executive audit logged. Order marked successfully as: ${decision}`);
            refetch(); // Silently sync background tabular arrays
          }}
        />
      )}
    </div>
  );
}

export default function NhiaApprovals() {
  return (
    <QueryClientProvider client={dynamicLocalQueryClient}>
      <ApprovedClaimsLedger />
    </QueryClientProvider>
  );
}
