import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function StaleRefundModal({ isOpen, onClose, fetchData }) {
  // Navigation State: "list" shows the search table, "edit" shows the selected row form
  const [viewMode, setViewMode] = useState("list"); 
  const [searchPolicyId, setSearchPolicyId] = useState("");
  const [foundRecords, setFoundRecords] = useState([]);

  // Active Row Edit State
  const [selectedRecord, setSelectedRecord] = useState({
    id: "",
    policyid: "",
    enrolleename: "",
    plan: "",
    client: "",
    gender: "",
    diagnosis: "",
    provider: "",
    reason: "",
    authcode: "",
    requestamount: "",
    approvedamount: "",
    encounter_date: ""
  });

  // Processing UI states
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  if (!isOpen) return null;

  // Format currency helper to Nigerian Naira
  const formatNaira = (value) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Fetch all historical refund records associated with the target Policy ID
  const handleSearchLedger = async () => {
    if (!searchPolicyId.trim()) {
      setModalError("Please enter a valid Policy ID to run query search.");
      return;
    }

    setIsSearching(true);
    setModalError("");
    setModalSuccess("");
    setFoundRecords([]);

    try {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .eq("policyid", searchPolicyId.trim())
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setFoundRecords(data);
        setModalSuccess(`Found ${data.length} refund historical matching logs.`);
      } else {
        setModalError("No historical records matched this Policy ID inside refunds ledger.");
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Database index processing error.");
    } finally {
      setIsSearching(false);
    }
  };
  // Triggered when a user clicks a row inside the results table view
  const handleSelectRowForEdit = (record) => {
    setModalError("");
    setModalSuccess("");
    
    setSelectedRecord({
      id: record.id || "",
      policyid: record.policyid || "",
      enrolleename: record.enrolleename || "",
      plan: record.plan || "",
      client: record.client || "",
      gender: record.gender || "",
      diagnosis: record.diagnosis || "",
      provider: record.provider || "",
      reason: record.reason || "",
      authcode: record.authcode || "",
      requestamount: record.requestamount !== null ? record.requestamount.toString() : "",
      approvedamount: record.approvedamount !== null ? record.approvedamount.toString() : "0.00",
      encounter_date: record.encounter_date || ""
    });

    setViewMode("edit"); // Pivot UI layer to active single form modification panel
  };

  // Handles input updates strictly for the allowed requestamount metric column
  const handleAmountChange = (e) => {
    const { value } = e.target;
    setSelectedRecord((prev) => ({
      ...prev,
      requestamount: value
    }));
  };

  // Execute database record UPDATE query mutation sequence
  const handleExecuteUpdate = async (e) => {
    e.preventDefault();

    if (!selectedRecord.id) {
      setModalError("Primary key targeting context missing.");
      return;
    }

    if (!selectedRecord.requestamount || parseFloat(selectedRecord.requestamount) <= 0) {
      setModalError("Please enter a valid request amount above zero.");
      return;
    }

    setIsUpdating(true);
    setModalError("");

    try {
      const { error } = await supabase
        .from("refunds")
        .update({
          requestamount: parseFloat(selectedRecord.requestamount),
          updated_at: new Date().toISOString() // Bumping database modification tracking parameters
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      if (fetchData) await fetchData(); // Trigger top-level layout update sequence
      
      // Dynamic cleanup redirecting browser focus parameters back to matching records ledger list view
      setModalSuccess("Request amount changed and synchronized successfully!");
      setViewMode("list");
      
      // Auto-re-fetch table to present current values immediately
      const updatedList = foundRecords.map((item) => 
        item.id === selectedRecord.id 
          ? { ...item, requestamount: parseFloat(selectedRecord.requestamount) } 
          : item
      );
      setFoundRecords(updatedList);
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to update target record row registry.");
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content text-dark" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          
          {/* Modal Branding Header */}
          <div className="modal-header bg-dark text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center mb-0">
              <i className="bi bi-clock-history text-warning me-2"></i>Stale Refunds Dynamic Auditor
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" disabled={isUpdating}></button>
          </div>

          <div className="modal-body bg-light p-3">
            {modalError && <div className="alert alert-danger py-2 small shadow-sm mb-3">{modalError}</div>}
            {modalSuccess && <div className="alert alert-success py-2 small shadow-sm mb-3">{modalSuccess}</div>}

            {/* CONDITIONAL RENDER PANELS LAYOUT BLOCK */}
            {viewMode === "list" ? (
              <>
                {/* Search Bar Inputs Controller Section */}
                <div className="card border-0 shadow-sm p-3 mb-3 bg-white">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-9">
                      <label className="form-label small fw-semibold text-secondary">Query Enrollee Policy ID</label>
                      <input
                        type="text"
                        className="form-control form-control-sm border-secondary"
                        placeholder="Enter policy ID to search matching entries array..."
                        value={searchPolicyId}
                        onChange={(e) => setSearchPolicyId(e.target.value)}
                        disabled={isSearching}
                      />
                    </div>
                    <div className="col-md-3">
                      <button
                        type="button"
                        className="btn btn-dark btn-sm w-100 fw-semibold text-white shadow-sm"
                        onClick={handleSearchLedger}
                        disabled={isSearching}
                      >
                        {isSearching ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-search me-1"></i>}
                        Search Ledger
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Table Logs Display Interface Grid */}
                <div className="card border-0 shadow-sm rounded overflow-hidden bg-white">
                  <div className="table-responsive" style={{ maxHeight: "350px" }}>
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                      <thead className="table-light text-secondary border-bottom fw-semibold small sticky-top">
                        <tr>
                          <th className="py-2.5 px-3">Policy / Name</th>
                          <th className="py-2.5">Provider Facility</th>
                          <th className="py-2.5">Diagnosis Description</th>
                          <th className="py-2.5">Authorization Code</th>
                          <th className="py-2.5 text-end">Request Amount</th>
                          <th className="py-2.5 text-end">Approved Payout</th>
                          <th className="py-2.5 text-center">Status</th>
                          <th className="py-2.5 text-center">Date Logged</th>
                          <th className="py-2.5 text-center">Action Trigger</th>
                        </tr>
                      </thead>
                      <tbody className="border-0">
                        {foundRecords.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-5 text-muted">
                              <i className="bi bi-file-earmark-spreadsheet display-6 mb-2 d-block text-black-50"></i>
                              Enter a Policy ID above to view historical matching logs rows.
                            </td>
                          </tr>
                        ) : (
                          foundRecords.map((r) => (
                            <tr key={r.id} className="border-bottom border-light-subtle">
                              <td className="py-2 px-3 fw-medium">
                                <div className="text-primary fw-bold mb-0.5">{r.policyid}</div>
                                <div className="text-dark small">{r.enrolleename}</div>
                              </td>
                              <td className="text-secondary small">{r.provider || "—"}</td>
                              <td className="text-muted small truncate" style={{ maxWidth: "150px" }}>{r.diagnosis || "—"}</td>
                              <td><span className="font-monospace small bg-light border px-1.5 py-0.5 rounded text-dark fw-medium">{r.authcode || "N/A"}</span></td>
                              <td className="text-end font-monospace text-muted fw-semibold">{formatNaira(r.requestamount)}</td>
                              <td className="text-end font-monospace text-dark fw-bold">{formatNaira(r.approvedamount)}</td>
                              <td className="text-center">
                                <span className={`badge px-2 py-1 rounded small ${r.status === "approved" ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning border border-warning-subtle"}`}>
                                  {r.status || "initiated"}
                                </span>
                              </td>
                              <td className="text-center text-muted small font-monospace">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-xs py-1 px-2.5 font-medium rounded d-inline-flex align-items-center gap-1"
                                  onClick={() => handleSelectRowForEdit(r)}
                                >
                                  <i className="bi bi-pencil-square"></i> Select
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
                         ) : (
              /* Single Selected Record Locked Correction Form Panel View UI Layer */
              <form onSubmit={handleExecuteUpdate} className="card border-0 shadow-sm p-4 bg-white">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                  <h6 className="fw-bold text-secondary mb-0"><i className="bi bi-shield-lock-fill me-1 text-danger"></i>Editing Row ID Parameters Correction Screen</h6>
                  <button type="button" className="btn btn-outline-secondary btn-xs fw-semibold" onClick={() => setViewMode("list")}>
                    <i className="bi bi-arrow-left me-1"></i> Return to Table List
                  </button>
                </div>

                {/* Row Grid: Demographics Context Block (Completely locked read-only) */}
                <div className="row g-2 mb-3 bg-light p-2.5 rounded border border-light-subtle">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Policy ID (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.policyid} readOnly />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small fw-semibold text-muted">Enrollee Name (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.enrolleename} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Plan Type (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.plan || "—"} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Corporate Client (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.client || "—"} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Gender Category (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.gender || "—"} readOnly />
                  </div>
                </div>

                {/* Row Grid: Clinical Tracking Parameters (Completely locked read-only) */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Hospital Provider Facility (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.provider} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Encounter Date (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.encounter_date || "—"} readOnly />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Clinical Diagnosis Profile (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.diagnosis} readOnly />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Submission Reason Details (Locked)</label>
                    <textarea className="form-control form-control-sm bg-light" value={selectedRecord.reason || ""} readOnly rows="2"></textarea>
                  </div>
                </div>

                {/* Row Grid: Finance Parameters Verification Blocks */}
                <div className="row g-3 align-items-end">
                  
                  {/* WRITABLE TARGET FIELD PROFILE IN THE ENTIRE UI SHEET */}
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-primary">Request Amount * (EDITABLE)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm border-primary fw-bold text-dark fs-6"
                      value={selectedRecord.requestamount}
                      onChange={handleAmountChange}
                      required
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Approved Amount Allocation (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light text-muted font-monospace fw-semibold" value={formatNaira(selectedRecord.approvedamount)} readOnly />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Authorization Code (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light text-muted font-monospace" value={selectedRecord.authcode || "No Auth Code"} readOnly />
                  </div>
                </div>

                {/* Form Action Submitter Panels */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewMode("list")} disabled={isUpdating}>
                    Cancel Correction
                  </button>
                  <button type="submit" className="btn btn-warning btn-sm fw-semibold px-4 text-dark shadow-sm" disabled={isUpdating}>
                    {isUpdating ? "Processing Database Sync..." : "Synchronize Amount Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Modal Universal Static Footer Controls */}
          <div className="modal-footer py-2 bg-light border-top">
            <button type="button" className="btn btn-secondary btn-sm px-4 fw-medium shadow-sm" onClick={onClose} disabled={isUpdating}>
              Close Panel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
