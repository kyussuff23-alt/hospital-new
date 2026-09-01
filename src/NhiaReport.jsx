import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function NhiaReport() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [hcpCode, setHcpCode] = useState("");
  
  // 🟢 NEW WORKFLOW STATES: Program router and secure credential keys
  const [programType, setProgramType] = useState("ALL"); // ALL, NHIA, or NYSC
  const [officerPassword, setOfficerPassword] = useState("");
  const [showSecurityPrompt, setShowStaffPrompt] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: null, type: "info" });

  const triggerStatus = (text, type = "info") => {
    setStatusMessage({ text, type });
    if (type !== "loading") {
      setTimeout(() => setStatusMessage({ text: null, type: "info" }), 5000);
    }
  };

  const handleTriggerExportSecurityGate = (e) => {
    e.preventDefault();
    if (!dateStart || !dateEnd || !hcpCode.trim()) {
      triggerStatus("Missing Parameters! Start Date, End Date, and HCP Provider Code are strictly required.", "danger");
      return;
    }
    // Launch secure sign-off prompt box before downloading any rows
    setShowStaffPrompt(true);
  };

  const handleVerifyPasswordAndDownload = async () => {
    const secureReportCredentials = {
      "2345": "bello",     
      "4567": "kunle"
    };

    const inputPassword = String(officerPassword).trim();
    const verifiedStaffName = secureReportCredentials[inputPassword];

    if (!verifiedStaffName) {
      alert("❌ ACCESS DENIED: Invalid administrative password code. Reporting download sequence aborted.");
      return;
    }

    setShowStaffPrompt(false);
    setOfficerPassword(""); // Flush memory
    
    setIsExporting(true);
    triggerStatus("Querying transactional database streams...", "loading");

    try {
      // 1. Base Query Filter: Time metrics, HCP Code, and Processed validation
      let biodataQuery = supabase
        .from("nhia_claims_biodata")
        .select("id, refid, enrolleename, gender, nhianumber, callupnumber, statecode, batch, stream, phonenumber, diagnosis, hospitalname, hcpcode, authcode, created_at, status")
        .gte("created_at", `${dateStart}T00:00:00Z`)
        .lte("created_at", `${dateEnd}T23:59:59Z`)
        .eq("hcpcode", hcpCode.trim())
        .eq("status", "processed");

      // 🟢 ROUTER REDUCTION LAYER: Restricts rows using text prefixes matching the database keys
      if (programType === "NHIA") {
        biodataQuery = biodataQuery.like("refid", "NHIA-%");
      } else if (programType === "NYSC") {
        biodataQuery = biodataQuery.like("refid", "NYSC-%");
      }

      const { data: biodataRecords, error: biodataError } = await biodataQuery;

      if (biodataError) throw biodataError;

      if (!biodataRecords || biodataRecords.length === 0) {
        triggerStatus(`No finalized 'processed' records found matching Provider: ${hcpCode} under program: ${programType}.`, "warning");
        setIsExporting(false);
        return;
      }

      // Extract unique refids to cleanly pull related child data
      const refIdList = biodataRecords.map(row => row.refid);

      // 2. Fetch corresponding item lines from the child drugs ledger using refid links
      const { data: drugRecords, error: drugsError } = await supabase
        .from("nhia_claims_drugs")
        .select("refid, nhiacode, description, dosage, strengths, presentation, price, quantity, period, total, variance")
        .in("refid", refIdList);

      if (drugsError) throw drugsError;

      // Group matching child records into a lookup dictionary map
      const childDrugsMap = (drugRecords || []).reduce((acc, drug) => {
        if (!acc[drug.refid]) acc[drug.refid] = [];
        acc[drug.refid].push(drug);
        return acc;
      }, {});

      // 3. Compile structural column headers
      const csvHeaders = [
        "Date Submitted", "Ref ID", "Authorization Code", "Enrollee Name", "Gender", "NHIA Number", 
        "Callup Number", "State Code", "Batch", "Stream", "Phone Number", "Diagnosis Filed", 
        "Hospital Name", "HCP Code", "Claim Status", "Item Code", "Item Description", 
        "Dosage", "Strengths", "Presentation", "Unit Price", "Qty Approved", "Days Period", "Line Total Cost", "Audit Variance Notes"
      ];

      const csvRows = [csvHeaders.join(",")];
      // 4. Flatten and iterate parent + nested tables row-by-row into unified CSV strings
      biodataRecords.forEach((parent) => {
        const matchingDrugs = childDrugsMap[parent.refid] || [];

        if (matchingDrugs.length === 0) {
          const rowData = [
            parent.created_at ? new Date(parent.created_at).toLocaleDateString() : "", parent.refid, parent.authcode || "N/A",
            `"${(parent.enrolleename || "").replace(/"/g, '""')}"`, parent.gender || "", parent.nhianumber || "", parent.callupnumber || "",
            parent.statecode || "", parent.batch || "", parent.stream || "", parent.phonenumber || "",
            `"${(parent.diagnosis || "").replace(/"/g, '""')}"`, `"${(parent.hospitalname || "").replace(/"/g, '""')}"`, parent.hcpcode || "", parent.status || "",
            "", "", "", "", "", "", "", "", "", ""
          ];
          csvRows.push(rowData.join(","));
        } else {
          matchingDrugs.forEach((child) => {
            const rowData = [
              parent.created_at ? new Date(parent.created_at).toLocaleDateString() : "", parent.refid, parent.authcode || "N/A",
              `"${(parent.enrolleename || "").replace(/"/g, '""')}"`, parent.gender || "", parent.nhianumber || "", parent.callupnumber || "",
              parent.statecode || "", parent.batch || "", parent.stream || "", parent.phonenumber || "",
              `"${(parent.diagnosis || "").replace(/"/g, '""')}"`, `"${(parent.hospitalname || "").replace(/"/g, '""')}"`, parent.hcpcode || "", parent.status || "",
              child.nhiacode || "", `"${(child.description || "").replace(/"/g, '""')}"`, child.dosage || "", child.strengths || "",
              child.presentation || "", child.price || 0, child.quantity || 0, child.period || 0, child.total || 0, `"${(child.variance || "").replace(/"/g, '""')}"`
            ];
            csvRows.push(rowData.join(","));
          });
        }
      });

      // 5. Build file stream payload blob and force an automated browser file download
      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const downloadUrl = URL.createObjectURL(blob);
      
      const executionAnchorLink = document.createElement("a");
      executionAnchorLink.setAttribute("href", downloadUrl);
      executionAnchorLink.setAttribute("download", `${programType}_Advice_HCP_${hcpCode}_${dateStart}_to_${dateEnd}.csv`);
      document.body.appendChild(executionAnchorLink);
      
      executionAnchorLink.click();
      document.body.removeChild(executionAnchorLink);
      URL.revokeObjectURL(downloadUrl); 

      triggerStatus(`Relational spreadsheet advice authorized by ${verifiedStaffName} dispatched successfully!`, "success");
    } catch (err) {
      console.error(err);
      triggerStatus(`Export Error pipeline fault: ${err.message}`, "danger");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="card shadow-sm border p-4 bg-white rounded-4 mt-3">
      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase small tracking-wide">
        📊 Processed Provider Remittance Advice Engine
      </h6>
      <p className="text-muted small mb-4">
        Enter required data parameters below. Financial report compilation loops require administrative verification codes.
      </p>

      <form onSubmit={handleTriggerExportSecurityGate}>
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label text-muted small fw-semibold uppercase mb-1">Start Date *</label>
            <input type="date" className="form-control form-control-sm shadow-none" value={dateStart} onChange={(e) => setDateStart(e.target.value)} required />
          </div>
          <div className="col-md-3">
            <label className="form-label text-muted small fw-semibold uppercase mb-1">End Date *</label>
            <input type="date" className="form-control form-control-sm shadow-none" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} required />
          </div>
          {/* 🟢 NEW DROPDOWN COMPONENT: Filters program streams before hitting server keys */}
          <div className="col-md-3">
            <label className="form-label text-muted small fw-semibold uppercase mb-1">Insurance Stream Matrix *</label>
            <select className="form-select form-select-sm border-secondary shadow-none" value={programType} onChange={(e) => setProgramType(e.target.value)}>
              <option value="ALL">All Combined Claims</option>
              <option value="NHIA">NHIA Claims Only (NHIA-)</option>
              <option value="NYSC">NYSC Claims Only (NYSC-)</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label text-muted small fw-semibold uppercase mb-1">HCP Code *</label>
            <input type="text" className="form-control form-control-sm shadow-none fw-bold" placeholder="Type exact HCP code..." value={hcpCode} onChange={(e) => setHcpCode(e.target.value)} required />
          </div>
        </div>

        {statusMessage.text && (
          <div className={`alert alert-${statusMessage.type === "loading" ? "info" : statusMessage.type} small py-2 mb-3 shadow-none`} role="alert">
            {statusMessage.type === "loading" && <span className="spinner-border spinner-border-sm me-2" role="status"></span>}
            {statusMessage.text}
          </div>
        )}

        <div className="d-flex justify-content-end">
          <button type="submit" disabled={isExporting} className="btn btn-sm btn-primary px-4 fw-bold shadow-sm d-flex align-items-center">
            {isExporting ? "Extracting Advice CSV..." : "📥 Authorize & Download Spreadsheet"}
          </button>
        </div>
      </form>

      {/* 🔐 SECURE SUB-MODAL PASWORD CHECK OVERLAY */}
      {showSecurityPrompt && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1100 }} tabIndex="-1">
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <form className="modal-content border-0 shadow-lg rounded-3" onSubmit={(e) => { e.preventDefault(); handleVerifyPasswordAndDownload(); }}>
              <div className="modal-header bg-dark text-white py-2"><h6 className="modal-title fw-bold">🔑 Administrative Security Override</h6></div>
              <div className="modal-body p-3 bg-white">
                <label className="form-label text-muted small fw-semibold uppercase mb-1">Enter Report Download Password</label>
                <input type="password" className="form-control text-center font-monospace tracking-widest border-2" placeholder="••••" value={officerPassword} onChange={(e) => setOfficerPassword(e.target.value)} autoFocus />
              </div>
              <div className="modal-footer bg-light p-2 d-flex justify-content-between">
                <button type="button" className="btn btn-sm btn-outline-secondary px-3" onClick={() => { setShowStaffPrompt(false); setOfficerPassword(""); }}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-dark px-3 fw-bold" disabled={!officerPassword}>Verify & Download</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
