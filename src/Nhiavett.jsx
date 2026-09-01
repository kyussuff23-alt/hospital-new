import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import Nhiaclaimshistory from "./Nhiaclaimshistory";




export default function Nhiavett({ claim, onClose, onRequestProcessed }) {
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

  // 🛠️ HELPER ENGINE: Formats the structural authorization token string based on verified staff data
  const generateAuthorizationToken = (staffSignatureName) => {
    let programPrefix = "UNKNOWN";
    const upperRefId = (claim.refid || "").toUpperCase();
    
    if (upperRefId.startsWith("NHIA-")) programPrefix = "NHIA";
    else if (upperRefId.startsWith("NYSC-")) programPrefix = "NYSC";

    const secureRandomToken = Math.floor(100000 + Math.random() * 900000);

    // Compile structural format string: 51/[PREFIX]/[6-DIGIT]/[NAME]
    return `51/${programPrefix}/${secureRandomToken}/${staffSignatureName}`;
  };

  // 4. Combined Transaction Matrix: Commits updates to both tables sequentially
  const processingMutation = useMutation({
    mutationFn: async ({ decision, verifiedStaffName }) => {
      const isApproved = decision === "Approved";
      const targetBiodataStatus = isApproved ? "approved" : "denied";
      const computedAuthCode = isApproved ? generateAuthorizationToken(verifiedStaffName) : null;

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
          authcode: computedAuthCode
        })
        .eq("id", claim.id);

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

      return { decision, computedAuthCode };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["nhiaPendingClaimsData"], (prevClaims = []) =>
        prevClaims.filter((c) => c.id !== claim.id)
      );

      if (onRequestProcessed) onRequestProcessed();
      
      if (result.decision === "Approved") {
        alert(`Claim successfully compiled! Generated Code: ${result.computedAuthCode}`);
      }

      onClose();
    },
    onError: (err) => {
      alert(`Transaction aborted: ${err.message}`);
    }
  });

  const handleFinalizeWorkflow = (decision) => {
    if (decision === "Denied") {
      const confirmRejection = window.confirm(
        "⚠️ WARNING: You are executing an absolute claim rejection! This operation will permanently wipe out medication totals, quantities, and durations to 0 for all itemized entries inside this record bundle. Variance notes will be archived.\n\nDo you want to proceed?"
      );
      if (!confirmRejection) return;
      
      processingMutation.mutate({ decision: "Denied", verifiedStaffName: null });
    }

    if (decision === "Approved") {
      setShowStaffPrompt(true);
    }
  };

  // 🔑 SECURE AUTHORIZATION GATEKEEPER
  const handleVerifyPasswordSignOff = () => {
    // Secure hardcoded credential dictionary mapping passwords to signatory profiles
    // 💡 In production, you can migrate these to an encrypted DB profile table later
    const secureStaffCredentials = {
      "235677": "tobi",     // Code 2456 mapped to password
      "567844": "bolaji",
      "345623": "toyin",
      "468767": "damilola",
      "345625": "peace",
      
      // Code 2334 mapped to password
    };

    const inputPassword = String(officerPassword).trim();
    const verifiedStaffName = secureStaffCredentials[inputPassword];

    if (!verifiedStaffName) {
      alert("❌ ACCESS DENIED: Invalid authorization password code. Verification signature failed.");
      return;
    }

    setShowStaffPrompt(false);
    setOfficerPassword(""); // Flush memory
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
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase small tracking-wide">
                Patient Medical Folder Profile
              </h6>
              <div className="row g-3">
                <div className="col-md-4"><label className="text-muted small d-block">Enrollee Full Name</label><input type="text" className="form-control bg-light text-dark fw-medium" value={claim.enrolleename} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Gender</label><input type="text" className="form-control bg-light text-dark text-capitalize" value={claim.gender} readOnly /></div>
<div className="col-md-3">
  <label className="text-muted small d-block">NHIA Identification Number</label>
  <div className="input-group">
    <input 
      type="text" 
      className="form-control bg-light text-secondary font-monospace" 
      value={claim.nhianumber || ""} 
      readOnly 
    />
    {claim.nhianumber && (
      <button 
        type="button"
        className="btn btn-outline-primary"
        title="Lookup Patient Claim Logs Timeline"
        onClick={() => setActiveHistoryLookup(claim.nhianumber)}
      >
        🔍 
      </button>
    )}
  </div>
  <small className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
    Click button to overlay archived cases.
  </small>
</div>
                <div className="col-md-3"><label className="text-muted small d-block">Call-Up Ticket ID</label><input type="text" className="form-control bg-light" value={claim.callupnumber || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">State Code</label><input type="text" className="form-control bg-light" value={claim.statecode || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Batch Matrix</label><input type="text" className="form-control bg-light" value={claim.batch || "N/A"} readOnly /></div>
                <div className="col-md-2"><label className="text-muted small d-block">Stream Router</label><input type="text" className="form-control bg-light" value={claim.stream || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">Contact Phone Line</label><input type="text" className="form-control bg-light" value={claim.phonenumber || "N/A"} readOnly /></div>
                <div className="col-md-3"><label className="text-muted small d-block">HCP Provider Code</label><input type="text" className="form-control bg-light font-monospace" value={claim.hcpcode} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Hospital Facility Origin</label><input type="text" className="form-control bg-light text-dark fw-medium" value={claim.hospitalname} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Authorization Token</label><input type="text" className="form-control bg-light font-monospace" value={claim.authcode || "N/A"} readOnly /></div>
                <div className="col-md-4"><label className="text-muted small d-block">Clinical Diagnostics Filed</label><input type="text" className="form-control bg-light text-danger fw-semibold" value={claim.diagnosis} readOnly /></div>
              </div>
</div>

{/* SECTION 2: ADAPTIVE DRUG DISPENSARY GRID */}
<div className="card border-0 shadow-sm p-4 bg-white rounded-3">
  
  {/* 🔍 LIVE BENEFIT SEARCH BAR (FOR INFORMATION ONLY) */}
  <div className="mb-4 p-3 bg-light rounded-3 border position-relative" style={{ zIndex: 10 }}>
    <label className="form-label fw-bold text-dark small text-uppercase tracking-wider mb-1">
      🛡️ Medical Benefit Lookup (Check Capitated vs FFS)
    </label>
    <div className="input-group shadow-sm">
      <span className="input-group-text bg-white text-muted border-end-0">🔍</span>
      <input 
        type="text" 
        className="form-control border-start-0 shadow-none" 
        placeholder="Type here to check service rules... (e.g. general consultations, surgeries)" 
        value={benefitSearchQuery}
        onChange={(e) => {
          setBenefitSearchQuery(e.target.value);
          setShowBenefitDropdown(true);
        }}
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

    {/* FLOATING LOOKUP SHEET */}
    {showBenefitDropdown && benefitSearchQuery.trim().length > 1 && (
      <div 
        className="position-absolute w-100 bg-white shadow-lg border rounded-3 mt-1 p-2"
        style={{ top: "100%", left: "0px", zIndex: 100, maxHeight: "240px", overflowY: "auto" }}
      >
        <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom bg-light rounded-top small mb-1">
          <span className="text-secondary fw-bold small">Policy Database Results</span>
          <button type="button" className="btn-close shadow-none" style={{ fontSize: "10px" }} onClick={() => setShowBenefitDropdown(false)}></button>
        </div>

        {isSearchingBenefits ? (
          <div className="text-center py-3 text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            Searching coverage parameters...
          </div>
        ) : benefitSearchResults.length === 0 ? (
          <div className="text-center py-3 text-muted small">
            No items matching <strong className="text-dark">"{benefitSearchQuery}"</strong> found in benefits table.
          </div>
        ) : (
          benefitSearchResults.map((benefit, index) => {
            const isCapitated = String(benefit.status).toLowerCase().includes("capitat");
            const badgeClass = isCapitated ? "bg-info text-dark" : "bg-warning text-dark";

            return (
              <div 
                key={index} 
                className="d-flex justify-content-between align-items-center p-2 border-bottom border-light hover-bg-light rounded"
                style={{ cursor: "default" }}
              >
                <div>
                  <span className="fw-semibold text-dark small d-block">
                    • {benefit.itemdescription}
                  </span>
                  {benefit.serviceid && (
                    <small className="text-muted font-monospace d-block ms-3" style={{ fontSize: "11px" }}>
                      Code: {benefit.serviceid}
                    </small>
                  )}
                </div>
                <span className={`badge ${badgeClass} text-uppercase font-monospace px-2 py-1 fw-bold`}>
                  {benefit.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    )}
  </div>

  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase small tracking-wide">
    Itemized Tariff Claims Audit Table
  </h6>

  {isLoadingDrugs ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                  <p className="text-muted small mt-2">Streaming ledger rows...</p>
                </div>
              ) : editableDrugs.length === 0 ? (
                <div className="text-center py-4 text-muted small">No items linked to this claim profile.</div>
              ) : (
                <div className="table-responsive border rounded bg-light">
                  <table className="table table-hover align-middle m-0">
                    <thead className="table-dark small">
                      <tr>
                        <th>NHIA Code</th>
                        <th style={{ width: "25%" }}>Description / Presentation</th>
                        <th style={{ width: "15%" }}>Price (₦)</th>

                        <th style={{ width: "9%" }}>Qty (Edit)</th>
                        <th style={{ width: "9%" }}>Period (Days)</th>
                        <th>Total (Calculated)</th>
                        <th style={{ width: "30%" }}>Audit Variance Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {editableDrugs.map((drug) => (
                        <tr key={drug.id} className="bg-white">
                          <td><span className="badge bg-secondary font-monospace">{drug.nhiacode}</span></td>
                          <td>
                            <div className="fw-medium text-dark text-wrap">{drug.description}</div>
                            <span className="text-muted font-monospace block small">
                              {drug.strengths || ""} {drug.presentation ? `| ${drug.presentation}` : ""}
                            </span>
                          </td>
                          <td><input type="text" className="form-control form-control-sm bg-light text-end font-monospace" value={Number(drug.price).toLocaleString()} readOnly /></td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center font-monospace border-primary fw-bold"
                              value={drug.quantity}
                              onChange={(e) => handleDrugRowChange(drug.id, "quantity", e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center font-monospace border-primary fw-bold"
                              value={drug.period}
                              onChange={(e) => handleDrugRowChange(drug.id, "period", e.target.value)}
                            />
                          </td>
                          <td>
                            <div className="form-control form-control-sm bg-light text-end font-monospace fw-bold text-success">
                              {Number(drug.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-control form-control-sm"
                              placeholder="Describe tariff mismatch reasons..."
                              value={drug.variance || ""}
                              onChange={(e) => handleDrugRowChange(drug.id, "variance", e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Locked Workflow Footer Interface */}
          <div className="modal-footer bg-light rounded-bottom-4 justify-content-between p-3">
            <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose} disabled={processingMutation.isPending}>
              Cancel Evaluation
            </button>
            <div className="d-flex">
              <button 
                onClick={() => handleFinalizeWorkflow("Denied")}
                disabled={processingMutation.isPending}
                className="btn btn-danger px-4 me-2 shadow-sm fw-medium d-flex align-items-center"
              >
                {processingMutation.isPending && <span className="spinner-border spinner-border-sm me-2"></span>}
                ✕ Reject & File Denied
              </button>
              <button 
                onClick={() => handleFinalizeWorkflow("Approved")}
                disabled={processingMutation.isPending}
                className="btn btn-success px-4 shadow-sm fw-medium d-flex align-items-center"
              >
                {processingMutation.isPending && <span className="spinner-border spinner-border-sm me-2"></span>}
                ✓ Complete Vetting & Process
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🔐 SECURE INTERNAL MODAL: PASSWORD AUTHORIZATION CHALLENGE OVERLAY */}
      {showStaffPrompt && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1100 }} tabIndex="-1">
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-dark text-white py-2">
                <h6 className="modal-title fw-bold">🔑 Security Signature Authentication</h6>
              </div>
              <div className="modal-body p-3 bg-white">
                <label className="form-label text-muted small fw-semibold uppercase mb-1">Enter Personal Authorization Password</label>
                <input 
                  type="password" 
                  className="form-control text-center font-monospace tracking-widest border-2" 
                  placeholder="••••••••"
                  value={officerPassword}
                  onChange={(e) => setOfficerPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyPasswordSignOff()}
                  autoFocus
                />
                <span className="text-muted text-center d-block mt-2" style={{ fontSize: "11px" }}>
                  Your password directly injects your electronic tracking token into this audit transaction.
                </span>
              </div>
              <div className="modal-footer bg-light p-2 d-flex justify-content-between">
                <button type="button" className="btn btn-sm btn-outline-secondary px-3" onClick={() => { setShowStaffPrompt(false); setOfficerPassword(""); }}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-dark px-3 fw-bold" onClick={handleVerifyPasswordSignOff} disabled={!officerPassword}>
                  Verify & Sign
                </button>
              </div>
            </div>
          </div>
        
        
        
        
        </div>
    
    
    
    )}
   
   
         {activeHistoryLookup && (
        <Nhiaclaimshistory 
          nhianumber={activeHistoryLookup} 
          onClose={() => setActiveHistoryLookup(null)} 
        />
      )}
 </div>
  );
}
