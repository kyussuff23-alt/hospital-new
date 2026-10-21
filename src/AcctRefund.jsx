import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AcctRefund({ isOpen, onClose, userRole }) {
  // Navigation State Engine: "list" exposes matching logs table array, "edit" opens single form panel
  const [viewMode, setViewMode] = useState("list"); 
  const [searchPolicyId, setSearchPolicyId] = useState("");
  const [foundRecords, setFoundRecords] = useState([]);

  // Active Row State Map targeting column schemas inside refunds table
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
    approvedamount: "0.00", // Will hold formatted string with commas for UI text field input
    encounter_date: ""
  });

  // Processing UI layout states
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  if (!isOpen) return null;

  // Format currency formatting helper engine
  const formatNaira = (value) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Helper to add thousand separator commas in real time to raw value inputs
  const formatNumberWithCommas = (valueString) => {
    if (!valueString) return "";
    // Strip everything except numbers and a single decimal point
    const cleanValue = valueString.replace(/[^0-9.]/g, "");
    const parts = cleanValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  // Fetch all corresponding historical rows from refunds ledger matching Policy ID input string
  const handleSearchLedger = async () => {
    if (!searchPolicyId.trim()) {
      setModalError("Please enter a valid Policy ID to query.");
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
        setModalSuccess(`Found ${data.length} historical refund request matching records.`);
      } else {
        setModalError("No historical records matched this Policy ID inside refunds table.");
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Database index processing layer exception error.");
    } finally {
      setIsSearching(false);
    }
  };
  // Triggered when a row is clicked from the list view table grid
  const handleSelectRowForAudit = (record) => {
    setModalError("");
    setModalSuccess("");
    
    // Add commas to initial database value to feed into the customized text input field cleanly
    const rawAmount = record.approvedamount !== null ? record.approvedamount.toString() : "0.00";
    const initialFormattedAmount = formatNumberWithCommas(rawAmount);

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
      approvedamount: initialFormattedAmount,
      encounter_date: record.encounter_date || ""
    });

    setViewMode("edit"); // Switch viewport over to single item detail adjustment form
  };

  // Handles input updates and intercepts strings to add comma formatting on the fly
  const handleAmountInputChange = (e) => {
    const { value } = e.target;
    // Intercept input value stream and cast thousand separators directly
    const liveCommaFormattedValue = formatNumberWithCommas(value);
    setSelectedRecord((prev) => ({
      ...prev,
      approvedamount: liveCommaFormattedValue
    }));
  };

  // Execute single record row mutation UPDATE call against target row ID parameter
  const handleExecuteAuditSync = async (e) => {
    e.preventDefault();

    if (!selectedRecord.id) {
      setModalError("Primary tracking row key target bound mismatch.");
      return;
    }

    const isAuthorized = userRole === "admin" || userRole === "account";
    if (!isAuthorized) {
      setModalError("Security validation error: Unauthorized role access configuration parameters.");
      return;
    }

    // 🧼 Clean out the UI commas to extract a clean numeric float before updating database indexes
    const rawNumericValue = parseFloat(selectedRecord.approvedamount.replace(/,/g, "")) || 0;

    setIsUpdating(true);
    setModalError("");

    try {
      const { error } = await supabase
        .from("refunds")
        .update({
          approvedamount: rawNumericValue,
          status: "paid", 
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      setModalSuccess("Disbursement processed. Record marked as paid successfully!");
      setViewMode("list");

      // Instantly map updated array properties internally to avoid broken states
      const updatedList = foundRecords.map((item) => 
        item.id === selectedRecord.id 
          ? { ...item, approvedamount: rawNumericValue, status: "paid" } 
          : item
      );
      setFoundRecords(updatedList);
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Failed to commit adjustment update onto table metrics.");
    } finally {
      setIsUpdating(false);
    }
  };
  // Check authorization roles directly for conditional rendering styling cues
  const isInputEditable = userRole === "admin" || userRole === "account";

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content text-dark" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          
          {/* Main Module Banner Branding Header */}
          <div className="modal-header bg-dark text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center mb-0" style={{ fontSize: "1.05rem" }}>
              <i className="bi bi-wallet2 text-primary me-2"></i>Account Refund Adjuster Panel
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" disabled={isUpdating}></button>
          </div>

          <div className="modal-body bg-light p-3">
            {modalError && <div className="alert alert-danger py-2 small shadow-sm mb-3">{modalError}</div>}
            {modalSuccess && <div className="alert alert-success py-2 small shadow-sm mb-3">{modalSuccess}</div>}

            {/* INTERACTION LAYERS DECOUPLER SWITCH PANELS DIRECTION */}
            {viewMode === "list" ? (
              <>
                {/* Policy Identification Query Search Board Card Block */}
                <div className="card border-0 shadow-sm p-3 mb-3 bg-white">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-9">
                      <label className="form-label small fw-semibold text-secondary">Verify Ledger Policy ID</label>
                      <input
                        type="text"
                        className="form-control form-control-sm border-secondary"
                        placeholder="Enter active policy tracking string ID..."
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
                        Query Ledger
                      </button>
                    </div>
                  </div>
                </div>

                {/* Database Search Matrix Results Output Grid Board (9 Columns Balanced Map) */}
                <div className="card border-0 shadow-sm rounded overflow-hidden bg-white">
                  <div className="table-responsive" style={{ maxHeight: "350px" }}>
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                      <thead className="table-light text-secondary border-bottom fw-semibold small sticky-top">
                        <tr>
                          <th className="py-2.5 px-3">Policy / Name</th>
                          <th className="py-2.5">Provider Facility</th>
                          <th className="py-2.5">Diagnosis Context</th>
                          <th className="py-2.5">Authorization Code</th>
                          <th className="py-2.5 text-end">Request Amount</th>
                          <th className="py-2.5 text-end">Approved Payout</th>
                          <th className="py-2.5 text-center">Status</th>
                          <th className="py-2.5 text-center">Date Logged</th>
                          <th className="py-2.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="border-0">
                        {foundRecords.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-5 text-muted">
                              <i className="bi bi-wallet-fill display-6 mb-2 d-block text-black-50"></i>
                              Input an active Policy ID string identifier to pull ledger profiles rows.
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
                                <span className={`badge px-2 py-1 rounded small ${r.status === "paid" ? "bg-success text-white" : r.status === "approved" ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning border border-warning-subtle"}`}>
                                  {r.status || "initiated"}
                                </span>
                              </td>
                              <td className="text-center text-muted small font-monospace">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}
                              </td>
                              <td className="text-center">
                                {/* 🔒 ✅ LOCK/DISABLE AUDIT BUTTON DYNAMICALLY IF THE RECORD IS ALREADY PAID */}
                                <button
                                  type="button"
                                  className={`btn btn-xs py-1 px-2.5 font-medium rounded d-inline-flex align-items-center gap-1 ${r.status === "paid" ? "btn-light text-muted border disabled" : "btn-outline-primary"}`}
                                  onClick={() => handleSelectRowForAudit(r)}
                                  disabled={r.status === "paid"}
                                  title={r.status === "paid" ? "This historical claim has already been settled." : "Process audit update"}
                                >
                                  {r.status === "paid" ? <i className="bi bi-lock-fill"></i> : <i className="bi bi-shield-check"></i>}
                                  {r.status === "paid" ? "Settled" : "Audit"}
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
              /* Single Selected Log Audit/Adjustment Parameter Interface Screen Block */
              <form onSubmit={handleExecuteAuditSync} className="card border-0 shadow-sm p-4 bg-white">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                  <h6 className="fw-bold text-secondary mb-0"><i className="bi bi-sliders me-1 text-primary"></i>Finance Disbursement Audit Allocation Sheet</h6>
                  <button type="button" className="btn btn-outline-secondary btn-xs fw-semibold" onClick={() => setViewMode("list")}>
                    <i className="bi bi-arrow-left me-1"></i> Back to Results List
                  </button>
                </div>

                {/* Context Column Data Blocks (Locked read-only tracking) */}
                <div className="row g-2 mb-3 bg-light p-2.5 rounded border border-light-subtle">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Policy ID</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.policyid} readOnly />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small fw-semibold text-muted">Enrollee Name</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.enrolleename} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Plan Classification</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.plan || "—"} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Corporate Client Sponsor</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.client || "—"} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Gender Category</label>
                    <input type="text" className="form-control form-control-sm bg-white" value={selectedRecord.gender || "—"} readOnly />
                  </div>
                </div>

                {/* Additional Clinical Tracking Profiles (Locked read-only validation) */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Provider Facility</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.provider} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Encounter Date</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.encounter_date || "—"} readOnly />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-muted">Diagnosis Statement Profile</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={selectedRecord.diagnosis} readOnly />
                  </div>
                </div>

                {/* Finance Inputs Fields Matrix Configuration Row */}
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Initial Request Amount (Locked)</label>
                    <input type="text" className="form-control form-control-sm bg-light text-muted font-monospace fw-semibold" value={formatNaira(selectedRecord.requestamount)} readOnly />
                  </div>

                  {/* 🔓 ⚙️ APPROVED AMOUNT SWITCHED TO TYPE="TEXT" TO ALLOW LIVE COMMA INLINE FORMATTING */}
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-success">
                      Approved Payout Amount * {isInputEditable ? "(EDITABLE)" : "(LOCKED)"}
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-success-subtle text-success fw-bold">₦</span>
                      <input
                        type="text"
                        className={`form-control fw-bold fs-6 font-monospace ${isInputEditable ? "border-success text-dark" : "bg-light text-muted border-secondary"}`}
                        name="approvedamount"
                        value={selectedRecord.approvedamount}
                        onChange={handleAmountInputChange}
                        readOnly={!isInputEditable}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-muted">Authorization String Code</label>
                    <input type="text" className="form-control form-control-sm bg-light font-monospace text-muted" value={selectedRecord.authcode || "No Authorization Key"} readOnly />
                  </div>
                </div>

                {/* Dynamic Footer Controls Actions Submitter block */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewMode("list")} disabled={isUpdating}>
                    Discard Updates
                  </button>
                  {isInputEditable && (
                    <button type="submit" className="btn btn-success btn-sm fw-semibold px-4 text-white shadow-sm" disabled={isUpdating}>
                      {isUpdating ? "Saving Audit Ledger..." : "Commit Payment & Disburse"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Static Window Controller Footer Layout element */}
          <div className="modal-footer py-2 bg-light border-top">
            <button type="button" className="btn btn-secondary btn-sm px-4 fw-medium" onClick={onClose} disabled={isUpdating}>
              Close Dashboard
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
