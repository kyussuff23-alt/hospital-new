import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import Nhiaclaimshistory from "./Nhiaclaimshistory";

export default function NhiaFinalApprovals({ claim, onClose, onRequestProcessed }) {
  const queryClient = useQueryClient();
  
  // 🟢 MUTABLE STATE CONTAINER: Tracks editable inputs for all drugs locally
  const [editableDrugs, setEditableDrugs] = useState([]);
  // 🟢 NEW WORKFLOW STATE: Tracks the officer signing off on approval
  const [selectedStaffCode, setSelectedStaffCode] = useState("");

  // 🔍 INFORMATIONAL ONLY: Tracks the text typed into the benefit search bar
  const [benefitSearchQuery, setBenefitSearchQuery] = useState("");
  const [showBenefitDropdown, setShowBenefitDropdown] = useState(false);
  // 🟢 NEW WORKFLOW STATE: Tracks whether to show history panel modal for current enrollment code
  const [activeHistoryLookup, setActiveHistoryLookup] = useState(null);

  // TanStack Query: Quietly filters your nhia_benefit catalog dynamically as you type
  const { data: benefitSearchResults = [], isLoading: isSearchingBenefits } = useQuery({
    queryKey: ["nhiaBenefitsSearchCatalog", benefitSearchQuery],
    queryFn: async () => {
      if (!benefitSearchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from("nhia_benefits")
        .select("itemdescription, status, serviceid")
        .ilike("itemdescription", `%${benefitSearchQuery}%`) 
        .limit(6); // Snappy layout limit

      if (error) throw error;
      return data || [];
    },
    enabled: benefitSearchQuery.trim().length > 1, // Activates when user types 2+ characters
  });

  // 1. Fetch all associated drug items matching this claim's unique refid
  const { data: databaseDrugs, isLoading: isLoadingDrugs } = useQuery({
    queryKey: ["claimDrugs", claim.refid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nhia_claims_drugs")
        .select("*")
        .eq("refid", claim.refid);

      if (error) throw error;
      return data || [];
    },
    enabled: !!claim.refid, // Only run the query if we have a valid refid
  });

  // 2. Hydrate local state when the database returns the original line items
  useEffect(() => {
    if (databaseDrugs) {
      setEditableDrugs(databaseDrugs);
    }
  }, [databaseDrugs]);

  // 🟢 NEW WORKFLOW STATE: Tracks secure password verification entry
    // 🟢 NEW WORKFLOW STATE: Tracks secure password verification entry & session
  const [officerPassword, setOfficerPassword] = useState("");
  const [showStaffPrompt, setShowStaffPrompt] = useState(false);

  // 3. Mathematical Formula Tracker: Calculates row totals on-the-fly
  const handleDrugRowChange = (id, field, value) => {
    setEditableDrugs((prevDrugs) =>
      prevDrugs.map((drug) => {
        if (drug.id !== id) return drug;

        const updatedDrug = { ...drug, [field]: value };
        const currentPrice = Number(updatedDrug.price) || 0;
        const currentQty = field === "quantity" ? parseInt(value, 10) || 0 : parseInt(updatedDrug.quantity, 10) || 0;
        const currentPeriod = field === "period" ? parseInt(value, 10) || 0 : parseInt(updatedDrug.period, 10) || 0;

        updatedDrug.total = currentPrice * currentQty * currentPeriod;
        return updatedDrug;
      })
    );
  };

  // 4. Combined Transaction Matrix: Commits updates to both tables sequentially
  const processingMutation = useMutation({
    mutationFn: async ({ decision, verifiedStaffName }) => {
      const isApproved = decision === "Approved";
      const targetBiodataStatus = isApproved ? "processed" : "denied";

      let workingDrugsArray = [...editableDrugs];

      if (!isApproved) {
        workingDrugsArray = editableDrugs.map(drug => ({
          ...drug,
          quantity: 0,
          period: 0,
          total: 0
        }));
        setEditableDrugs(workingDrugsArray);
      }

      // A. Update Parent Biodata Row
      const { error: biodataError } = await supabase
        .from("nhia_claims_biodata")
        .update({ 
          status: targetBiodataStatus,
          authcode: isApproved ? claim.authcode : null
        })
        .eq("refid", claim.refid); // Using refid as verified by RLS fix

      if (biodataError) throw new Error(`Biodata Error: ${biodataError.message}`);

      // B. Update Child Drug Records
      if (workingDrugsArray.length > 0) {
        const updatePromises = workingDrugsArray.map((drug) =>
          supabase
            .from("nhia_claims_drugs")
            .update({
              quantity: drug.quantity,
              period: drug.period,
              total: drug.total,
              variance: drug.variance
            })
            .eq("id", drug.id)
        );

        const results = await Promise.all(updatePromises);
        const processingFailure = results.find((res) => res.error);
        if (processingFailure) throw new Error(`Drugs Sync Error: ${processingFailure.error.message}`);
      }

      return { decision, verifiedStaffName };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["nhiaApprovedClaimsLedger", queryClient.getQueryData(["currentPage"]) || 0], (prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          records: (prevData.records || []).filter((c) => c.id !== claim.id),
          totalCount: Math.max(0, (prevData.totalCount || 1) - 1),
        };
      });

      if (onRequestProcessed) onRequestProcessed(result.decision);
      
      if (result.decision === "Approved") {
        alert(`🎉 Executive vetting complete by ${result.verifiedStaffName || 'Senior Officer'}. Status successfully locked`);
      }

      onClose();
    },
    onError: (err) => {
      alert(`Transaction aborted: ${err.message}`);
    }
  });

  // 🔑 SESSION CHECK ENGINE (30 Mins Inactivity Router)
  const handleFinalizeWorkflow = (decision) => {
    if (decision === "Denied") {
      const confirmRejection = window.confirm(
        "⚠️ WARNING: You are executing an absolute claim rejection! This operation will permanently wipe out medication totals, quantities, and durations to 0 for all itemized entries inside this record bundle. Variance notes will be archived.\n\nDo you want to proceed?"
      );
      if (!confirmRejection) return;
      
      processingMutation.mutate({ decision: "Denied", verifiedStaffName: null });
      return;
    }

    if (decision === "Approved") {
      // Check session memory trackers
      const cachedSessionName = sessionStorage.getItem("senior_officer_name");
      const cachedSessionTimestamp = sessionStorage.getItem("senior_officer_session_time");
      
      const 	currentTime = Date.now();
      const thirtyMinutesInMs = 30 * 60 * 1000;

      // If session exists and is fresher than 30 minutes, bypass password completely!
      if (cachedSessionName && cachedSessionTimestamp && (currentTime - Number(cachedSessionTimestamp) < thirtyMinutesInMs)) {
        // Refresh the activity heartbeat timer for another 30 mins
        sessionStorage.setItem("senior_officer_session_time", String(currentTime));
        processingMutation.mutate({ decision: "Approved", verifiedStaffName: cachedSessionName });
      } else {
        // Session expired or empty: Clear caches and force password verification challenge popup
        sessionStorage.removeItem("senior_officer_name");
        sessionStorage.removeItem("senior_officer_session_time");
        setShowStaffPrompt(true);
      }
    }
  };

  // 🔑 SECURE AUTHORIZATION SEEDER
  const handleVerifyPasswordSignOff = () => {
    const secureStaffCredentials = {
      "2345": "bello",     
      "4567": "kunle",
      "4577": "mgt"
      
    };

    const inputPassword = String(officerPassword).trim();
    const verifiedStaffName = secureStaffCredentials[inputPassword];

    if (!verifiedStaffName) {
      alert("❌ ACCESS DENIED: Invalid senior authorization code. Verification signature failed.");
      return;
    }

    // Set 30-minute rolling session variables inside user browser layers
    sessionStorage.setItem("senior_officer_name", verifiedStaffName);
    sessionStorage.setItem("senior_officer_session_time", String(Date.now()));

    setShowStaffPrompt(false);
    setOfficerPassword(""); 
    processingMutation.mutate({ decision: "Approved", verifiedStaffName });
  };


  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 rounded-4">
          
          {/* Main Action Header Area */}
          <div className="modal-header bg-primary text-white rounded-top-4 py-3">
            <div>
              <h5 className="modal-title fw-bold m-0">Vetting Interface & Audit Portal</h5>
              <small className="opacity-75">Reference Linkage Tracker: {claim.refid}</small>
            </div>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose} disabled={processingMutation.isPending}></button>
          </div>

          <div className="modal-body p-4 bg-light">
            {/* SECTION 1: READ-ONLY BIODATA VIEW */}
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3 mb-4">
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase small tracking-wide">Patient Medical Folder Profile</h6>
              <div className="row g-3">
                <div className="col-md-4"><label className="text-muted small d-block">Enrollee Full Name</label><input type="text" className="form-control bg-light text-dark fw-medium" value={claim.enrolleename || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Gender</label><input type="text" className="form-control bg-light text-dark text-capitalize" value={claim.gender || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">NHIA Identification Number</label><input type="text" className="form-control bg-light text-secondary font-monospace" value={claim.nhianumber || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">Call-Up Ticket ID</label><input type="text" className="form-control bg-light" value={claim.callupnumber || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">State Code</label><input type="text" className="form-control bg-light" value={claim.statecode || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Batch Matrix</label><input type="text" className="form-control bg-light" value={claim.batch || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Stream Router</label><input type="text" className="form-control bg-light" value={claim.stream || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">Contact Phone Line</label><input type="text" className="form-control bg-light" value={claim.phonenumber || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">HCP Provider Code</label><input type="text" className="form-control bg-light font-monospace" value={claim.hcpcode || "N/A"} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Hospital Facility Origin</label><input type="text" className="form-control bg-light text-dark fw-medium" value={claim.hospitalname || "N/A"} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Authorization Token</label><input type="text" className="form-control bg-light font-monospace" value={claim.authcode || "N/A"} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Clinical Diagnostics Filed</label><input type="text" className="form-control bg-light text-danger fw-semibold" value={claim.diagnosis || "N/A"} readOnly /></div>
              </div>
            </div>
            {/* SECTION 2: LIVE MEDICAL BENEFIT REFERENCE CHECKER */}
            {/* SECTION 2: LIVE MEDICAL BENEFIT REFERENCE CHECKER */}
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3 mb-4">
              <div className="p-3 bg-light rounded-3 border position-relative" style={{ zIndex: 10 }}>
                <label className="form-label fw-bold text-dark small text-uppercase tracking-wider mb-1">🛡️ Medical Benefit Lookup (Check Capitated vs FFS)</label>
                <div className="input-group shadow-sm">
                  <span className="input-group-text bg-white text-muted border-end-0">🔍</span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 shadow-none" 
                    placeholder="Type here to check service rules... (Holistic Wildcard Search)" 
                    value={benefitSearchQuery}
                    onChange={(e) => { setBenefitSearchQuery(e.target.value); setShowBenefitDropdown(true); }}
                    onFocus={() => setShowBenefitDropdown(true)}
                  />
                  {benefitSearchQuery && (
                    <button 
                      className="btn btn-outline-secondary bg-white text-muted border-start-0" 
                      type="button" 
                      onClick={() => { setBenefitSearchQuery(""); setShowBenefitDropdown(false); }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                {/* ✅ MODIFIED DROPDOWN CONTAINER SHEET WITH CLOSE ACCORDION ACTION */}
                {showBenefitDropdown && benefitSearchQuery.trim().length > 1 && (
                  <div className="position-absolute w-100 bg-white shadow-lg border rounded-3 mt-1 p-2" style={{ top: "100%", left: "0px", zIndex: 100, maxHeight: "200px", overflowY: "auto" }}>
                    
                    {/* Header bar with custom dynamic close button element */}
                    <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom bg-light rounded-top small mb-1">
                      <span className="text-secondary fw-bold small">Policy Database Results</span>
                      <button 
                        type="button" 
                        className="btn-close shadow-none" 
                        style={{ fontSize: "10px", cursor: "pointer" }} 
                        onClick={() => setShowBenefitDropdown(false)}
                      ></button>
                    </div>

                    {isSearchingBenefits ? (
                      <div className="text-center py-2 text-muted small">Searching registries...</div>
                    ) : benefitSearchResults.length === 0 ? (
                      <div className="text-center py-2 text-muted small">No items matched.</div>
                    ) : (
                      benefitSearchResults.map((benefit, idx) => {
                        const isCap = String(benefit.status).toLowerCase().includes("capitat");
                        return (
                          <div key={idx} className="d-flex justify-content-between p-2 border-bottom text-dark small">
                            <span>• {benefit.itemdescription}</span>
                            <span className={`badge ${isCap ? "bg-info text-dark" : "bg-warning text-dark"}`}>{benefit.status}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: CHILD DRUG LEDGER ITEMS ADJUSTMENT GRID */}
            <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase small tracking-wide">Itemized Tariff Claims Audit Table</h6>
              {isLoadingDrugs ? (
                <div className="text-center py-4"><span className="text-muted small">Loading items...</span></div>
              ) : editableDrugs.length === 0 ? (
                <div className="text-center py-4 text-muted small">No child entries exist.</div>
              ) : (
                <div className="table-responsive border rounded bg-light">
                  <table className="table table-hover align-middle m-0">
                    <thead className="table-dark small">
                      <tr>
                        <th>NHIA Code</th>
                        <th>Description Parameters</th>
                        <th>Price (₦)</th>
                        <th style={{ width: "10%" }}>Qty (Edit)</th>
                        <th style={{ width: "10%" }}>Period (Days)</th>
                        <th>Total Cost</th>
                        <th style={{ width: "30%" }}>Audit Variance Notes</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {editableDrugs.map((drug) => (
                        <tr key={drug.id} className="bg-white">
                          <td><span className="badge bg-secondary font-monospace">{drug.nhiacode}</span></td>
                          <td>
                            <div className="fw-medium text-dark text-wrap">{drug.description}</div>
                            <small className="text-muted font-monospace block">{drug.strengths || ""} {drug.presentation ? `| ${drug.presentation}` : ""}</small>
                          </td>
                          <td><input type="text" className="form-control form-control-sm bg-light text-end font-monospace" value={Number(drug.price).toLocaleString()} readOnly /></td>
                          <td><input type="number" className="form-control form-control-sm text-center font-monospace" value={drug.quantity} onChange={(e) => handleDrugRowChange(drug.id, "quantity", e.target.value)} /></td>
                          <td><input type="number" className="form-control form-control-sm text-center font-monospace" value={drug.period} onChange={(e) => handleDrugRowChange(drug.id, "period", e.target.value)} /></td>
                          <td><div className="form-control form-control-sm bg-light text-end font-monospace fw-bold text-success">{Number(drug.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></td>
                          <td><input type="text" className="form-control form-control-sm" placeholder="Reason..." value={drug.variance || ""} onChange={(e) => handleDrugRowChange(drug.id, "variance", e.target.value)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Action Controllers */}
          <div className="modal-footer bg-light rounded-bottom-4 justify-content-between p-3">
            <button type="button" className="btn btn-sm btn-outline-secondary px-4 fw-medium" onClick={onClose} disabled={processingMutation.isPending}>Close Window</button>
            <div className="d-flex">
              <button type="button" className="btn btn-sm btn-danger px-4 me-2 shadow-sm fw-bold" disabled={processingMutation.isPending} onClick={() => handleFinalizeWorkflow("Denied")}>✕ Reject & File Denied</button>
              <button type="button" className="btn btn-sm btn-success px-4 shadow-sm fw-bold" disabled={processingMutation.isPending} onClick={() => handleFinalizeWorkflow("Approved")}>✓ Complete Final Vetting</button>
            </div>
          </div>

        </div>
      </div>

      {/* SECURE SUB-MODAL PASSWORD CHECK OVERLAY */}
      {showStaffPrompt && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1100 }} tabIndex="-1">
          {/* ✅ 1. Wrap the entire contents of the modal inside a form element */}
          <form 
            className="modal-dialog modal-sm modal-dialog-centered"
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleVerifyPasswordSignOff(); 
            }}
          >
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-dark text-white py-2">
                <h6 className="modal-title fw-bold">🔑 Signature Authentication</h6>
              </div>
              
              <div className="modal-body p-3 bg-white">
                <label className="form-label text-muted small fw-semibold uppercase mb-1">
                  Enter Security Authorization Code
                </label>
                {/* ✅ 2. Cleaned up input (removed onKeyDown because onSubmit handles it natively now) */}
                <input 
                  type="password" 
                  className="form-control text-center font-monospace tracking-widest border-2" 
                  placeholder="••••" 
                  value={officerPassword} 
                  onChange={(e) => setOfficerPassword(e.target.value)} 
                  autoFocus 
                />
              </div>
              
              <div className="modal-footer bg-light p-2 d-flex justify-content-between">
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary px-3" 
                  onClick={() => { setShowStaffPrompt(false); setOfficerPassword(""); }}
                >
                  Cancel
                </button>
                {/* ✅ 3. Changed type to "submit" so clicking it fires the form's onSubmit event listener */}
                <button 
                  type="submit" 
                  className="btn btn-sm btn-dark px-3 fw-bold" 
                  disabled={!officerPassword}
                >
                  Verify & Sign
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
