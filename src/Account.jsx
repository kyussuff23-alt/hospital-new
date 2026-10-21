import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import { useAuth } from "./AuthContext";
import logo from "./logo.jpg"; // ✅ Place your logo image in src folder and import it
import AcctRefund from "./AcctRefund"; // ✅ Clean separate file import

export default function Account() {
  const { userRole } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const handleUnauthorizedClick = () => { setShowModal(true); };
  
  // Log both the value and type for clarity
  console.log("Account received userRole:", userRole);
  console.log("Type of userRole:", typeof userRole);

  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  
  // State to control visibility of the separate Refunds dashboard modal view
  const [showRefundsModal, setShowRefundsModal] = useState(false);

  const filteredPayments = payments.filter((p) =>
    [p.hcpcode, p.batchnumber, p.hospname].some((field) =>
      field?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Auto‑dismiss alert after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000); // 5 seconds
      return () => clearTimeout(timer); // cleanup if component unmounts
    }
  }, [error]);

  const expectedHeaders = [
    "hcpcode",
    "batchnumber",
    "hospname",
    "narration",
    "noofencounter",
    "billamount",
    "approvedamount",
    "bankname",
    "acctno",
    "dateofpayment"
  ];

  useEffect(() => {
    fetchPayments();
  }, []);
  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from("myaccount")
        .select("*")
        .order("dateofpayment", { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch registered historical payments rows.");
    }
  }

  function formatNaira(value) {
    if (!value) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  function handleGenerateReceipt(payment) {
    const doc = new jsPDF();
    doc.addImage(logo, "JPEG", 85, 10, 40, 20);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, 45, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    let y = 65;
    const lineGap = 10;
    doc.text(`HCP Code: ${payment.hcpcode}`, 20, y); y += lineGap;
    doc.text(`Hospital Name: ${payment.hospname}`, 20, y); y += lineGap;
    doc.text(`Narration: ${payment.narration}`, 20, y); y += lineGap;

    doc.setFont("helvetica", "bold");
    doc.text(`Bill Amount: ₦${Number(payment.billamount).toLocaleString()}`, 20, y); y += lineGap;
    doc.text(`Approved Amount: ₦${Number(payment.approvedamount).toLocaleString()}`, 20, y); y += lineGap;
    doc.setFont("helvetica", "normal");

    doc.text(`Paying Bank: WEMA BANK PLC`, 20, y); y += lineGap;
    doc.text(`Account No: ${payment.acctno}`, 20, y); y += lineGap;
    doc.text(`Date of Payment: ${new Date(payment.dateofpayment).toLocaleDateString("en-GB")}`, 20, y); y += lineGap;

    doc.line(20, y + 5, 190, y + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("This is a system-generated receipt. No signature required.", 105, y + 15, { align: "center" });
    doc.save(`receipt_${payment.id}.pdf`);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
        const rows = results.data;
        const fileHeaders = Object.keys(rows[0] || {});
        const missing = expectedHeaders.filter(h => !fileHeaders.includes(h));
        if (missing.length > 0) {
          setError(`❌ Invalid CSV headers. Missing: ${missing.join(", ")}`);
          return;
        }

        const errors = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const ok = await validateAndInsert(row, i + 1, errors);
          setUploadProgress(Math.round(((i + 1) / rows.length) * 100));
          if (!ok) continue;
        }

        if (errors.length > 0) {
          setError("Upload finished with errors:\n" + errors.join("\n"));
        } else {
          setError("✅ All rows uploaded successfully!");
        }
        setUploadProgress(0);
        fetchPayments();
      }
    });
  }

  async function validateAndInsert(row, rowNumber, errors) {
    const { data: hospital } = await supabase
      .from("myhospitals")
      .select("hcpcode, name")
      .eq("hcpcode", row.hcpcode)
      .eq("name", row.hospname)
      .single();

    if (!hospital) {
      errors.push(`Row ${rowNumber}: Invalid hospital (${row.hospname}) or HCP code (${row.hcpcode})`);
      return false;
    }

    const { data: batch } = await supabase
      .from("mybatch")
      .select("batchnumber, billamount")
      .eq("batchnumber", row.batchnumber)
      .single();

    if (!batch) {
      errors.push(`Row ${rowNumber}: Invalid batch number (${row.batchnumber})`);
      return false;
    }

    const uploadedBill = parseFloat((row.billamount || "").toString().replace(/,/g, ""));
    const expectedBill = parseFloat((batch.billamount || "").toString().replace(/,/g, ""));

    if (uploadedBill !== expectedBill) {
      errors.push(`Row ${rowNumber}: Bill amount (${uploadedBill}) does not match batch (${expectedBill})`);
      return false;
    }

    const validBanks = [
      "Access Bank", "Ecobank", "FCMB", "Fidelity", "First Bank", "GTBank", 
      "Polaris Bank", "Providus Bank", "Stanbic IBTC", "Sterling Bank", 
      "Suntrust Bank", "Union Bank", "UBA", "Unity Bank Plc", "Wema Bank", 
      "Zenith Bank", "Kuda Bank", "Opay", "Moniepoint", "Palmpay", "FairMoney MFB", "Lapo Microfinance Bank"
    ];
    if (!validBanks.includes(row.bankname)) {
      errors.push(`Row ${rowNumber}: Invalid bank name (${row.bankname})`);
      return false;
    }

    if (parseFloat(row.approvedamount) > parseFloat(row.billamount)) {
      errors.push(`Row ${rowNumber}: Approved amount (${row.approvedamount}) exceeds bill (${row.billamount})`);
      return false;
    }

    const { data: existing } = await supabase
      .from("myaccount")
      .select("id")
      .eq("hcpcode", row.hcpcode)
      .eq("batchnumber", row.batchnumber)
      .maybeSingle();

    if (existing) {
      setError(`Row ${rowNumber}: Duplicate profile already exists.`);
      errors.push(`Row ${rowNumber}: Duplicate profile row.`);
      return false;
    }

    const { data, error } = await supabase
      .from("myaccount")
      .insert([{
        hcpcode: row.hcpcode,
        batchnumber: row.batchnumber,
        hospname: row.hospname,
        narration: row.narration,
        noofencounter: parseInt(row.noofencounter, 10),
        billamount: parseFloat((row.billamount || "").toString().replace(/,/g, "")),
        approvedamount: parseFloat((row.approvedamount || "").toString().replace(/,/g, "")),
        bankname: row.bankname,
        acctno: row.acctno,
        dateofpayment: row.dateofpayment
      }])
      .select();

    if (error) {
      errors.push(`Row ${rowNumber}: DB error (${error.message})`);
      return false;
    }
    return true;
  }
  const totalPayout = filteredPayments.reduce((acc, curr) => acc + (parseFloat(curr.approvedamount) || 0), 0);
  const totalEncounters = filteredPayments.reduce((acc, curr) => acc + (parseInt(curr.noofencounter, 10) || 0), 0);

  return (
    <div className="container-fluid py-4 bg-light min-vh-100" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Upper Alerts Board */}
      {error && (
        <div className="alert alert-warning alert-dismissible shadow-sm border-start border-4 border-warning fade show small py-2 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </div>
      )}

      {/* Card Metrics Board */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Total Disbursed Payout</span>
            <h3 className="fw-bold text-success mt-2 mb-0">{formatNaira(totalPayout)}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Batches Audited</span>
            <h3 className="fw-bold text-primary mt-2 mb-0">{filteredPayments.length}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Encounter Volume</span>
            <h3 className="fw-bold text-dark mt-2 mb-0">{totalEncounters.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Action Controller Block */}
      <div className="card border-0 shadow-sm rounded-3 p-3 mb-4 bg-white">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          
          {/* Action Functional Buttons */}
          <div className="d-flex align-items-center gap-2">
            {(userRole === "admin" || userRole === "account") ? (
              <>
                <button
                  className="btn btn-primary btn-sm fw-semibold shadow-sm d-inline-flex align-items-center"
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  <i className="bi bi-cloud-upload me-2"></i>Upload Payment
                </button>
                <input
                  type="file"
                  id="fileInput"
                  accept=".csv,.xlsx"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </>
            ) : (
              <button
                className="btn btn-outline-secondary btn-sm fw-semibold"
                onClick={handleUnauthorizedClick}
              >
                <i className="bi bi-lock me-2"></i>Upload Payment
              </button>
            )}

            {/* Refunds Modal Launcher Button */}
            <button
              type="button"
              className="btn btn-dark btn-sm fw-semibold shadow-sm d-inline-flex align-items-center"
              onClick={() => setShowRefundsModal(true)}
            >
              <i className="bi bi-wallet2 me-2"></i>Refunds
            </button>
          </div>

          {/* Search Box Configuration */}
          <div style={{ maxWidth: "320px", width: "100%" }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-1"
                placeholder="Search code, batch number or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {uploadProgress > 0 && (
          <div className="progress mt-3" style={{ height: "6px" }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
      </div>

      {/* Responsive Data Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-dark" style={{ fontSize: "0.875rem" }}>
            <thead className="table-light text-secondary fw-semibold small border-bottom border-light">
              <tr>
                <th className="py-3 px-4">HCP / Batch Profile</th>
                <th className="py-3">Hospital Provider</th>
                <th className="py-3">Narration Scope</th>
                <th className="py-3 text-center">Encounters</th>
                <th className="py-3 text-end">Bill Amount</th>
                <th className="py-3 text-end">Approved Payout</th>
                <th className="py-3">Settlement Bank</th>
                <th className="py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="border-0">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-5">
                    <i className="bi bi-folder-x display-6 block mb-2 text-black-50"></i>
                    <div>No logged ledger accounts matched your active queries.</div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="border-bottom border-light-subtle">
                    <td className="py-3 px-4">
                      <div className="fw-semibold text-primary mb-1">{p.hcpcode}</div>
                      <span className="badge bg-light text-dark border font-monospace small px-1.5 py-1">{p.batchnumber}</span>
                    </td>
                    <td>
                      <div className="fw-medium text-dark truncate-text" style={{ maxWidth: "200px" }}>{p.hospname}</div>
                    </td>
                    <td>
                      <div className="text-muted small truncate-text" style={{ maxWidth: "160px" }}>{p.narration || "N/A"}</div>
                    </td>
                    <td className="text-center fw-semibold text-secondary">{p.noofencounter}</td>
                    <td className="text-end text-muted font-monospace">{formatNaira(p.billamount)}</td>
                    <td className="text-end fw-bold text-dark font-monospace">{formatNaira(p.approvedamount)}</td>
                    <td>
                      <div className="fw-medium text-secondary mb-0.5" style={{ fontSize: "0.825rem" }}>{p.bankname}</div>
                      <span className="text-muted small font-monospace">{p.acctno}</span>
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-xs py-1 px-2 rounded-2 d-inline-flex align-items-center gap-1 transition-all"
                        onClick={() => handleGenerateReceipt(p)}
                        title="Generate Voucher Document PDF"
                      >
                        <i className="bi bi-file-earmark-pdf"></i> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Restriction Security Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg text-center p-3">
              <div className="text-danger mb-2"><i className="bi bi-shield-lock display-5"></i></div>
              <h5 className="fw-bold text-dark">Access Restricted</h5>
              <p className="text-muted small mb-3">Your active profile role limits editing or spreadsheet upload triggers.</p>
              <button type="button" className="btn btn-secondary btn-sm w-100" onClick={() => setShowModal(false)}>Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* External Separate Refunds Component Module Mounting Point */}
      {showRefundsModal && (
        <AcctRefund isOpen={showRefundsModal}  userRole={userRole}  onClose={() => setShowRefundsModal(false)} />
      )}
    </div>
  );
}
