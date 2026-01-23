import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import { useAuth } from "./AuthContext";
import logo from "./logo.jpg"; // ✅ Place your logo image in src folder and import it

export default function Account() {
  const { userRole } = useAuth();
  
  // Log both the value and type for clarity
  console.log("Account received userRole:", userRole);
  console.log("Type of userRole:", typeof userRole);

  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

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

  function formatNaira(value) {
    if (!value) return "";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value);
  }

 

function handleGenerateReceipt(payment) {
  const doc = new jsPDF();

  // ✅ Add Logo (top center)
  doc.addImage(logo, "JPEG", 85, 10, 40, 20);

  // ✅ Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", 105, 45, { align: "center" });

  // ✅ Horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // ✅ Receipt details section
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  let y = 65;
  const lineGap = 10;

  doc.text(`HCP Code: ${payment.hcpcode}`, 20, y); y += lineGap;
  doc.text(`Hospital Name: ${payment.hospname}`, 20, y); y += lineGap;
  doc.text(`Narration: ${payment.narration}`, 20, y); y += lineGap;

  // ✅ Amounts with Naira sign
  doc.setFont("helvetica", "bold");
  doc.text(`Bill Amount: ₦${Number(payment.billamount).toLocaleString()}`, 20, y); y += lineGap;
  doc.text(`Approved Amount: ₦${Number(payment.approvedamount).toLocaleString()}`, 20, y); y += lineGap;
  doc.setFont("helvetica", "normal");

  doc.text(`Paying Bank: WEMA BANK PLC`, 20, y); y += lineGap;
  doc.text(`Account No: ${payment.acctno}`, 20, y); y += lineGap;
  doc.text(
    `Date of Payment: ${new Date(payment.dateofpayment).toLocaleDateString("en-GB")}`,
    20,
    y
  ); y += lineGap;

  // ✅ Footer line
  doc.line(20, y + 5, 190, y + 5);

  // ✅ Footer text
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("This is a system-generated receipt. No signature required.", 105, y + 15, { align: "center" });

  // ✅ Save as PDF
  doc.save(`receipt_${payment.id}.pdf`);
}

 
 
// Handle file upload
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
        const rows = results.data;

        // ✅ Validate headers
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
        setUploadProgress(0); // reset
        fetchPayments(); // refresh table
      }
    });
  }

  // Validation + Insert
 async function validateAndInsert(row, rowNumber, errors) {
  // ✅ Check hospital in myhospitals
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

  
  
  
  
 // ✅ Check batch in mybatch and match billamount
const { data: batch } = await supabase
  .from("mybatch")
  .select("batchnumber, billamount")
  .eq("batchnumber", row.batchnumber)
  .single();

if (!batch) {
  errors.push(`Row ${rowNumber}: Invalid batch number (${row.batchnumber})`);
  return false;
}

// ✅ Compare billamount from CSV vs batch record
const uploadedBill = parseFloat((row.billamount || "").toString().replace(/,/g, ""));
const expectedBill = parseFloat((batch.billamount || "").toString().replace(/,/g, ""));

if (uploadedBill !== expectedBill) {
  errors.push(
    `Row ${rowNumber}: Bill amount (${uploadedBill}) does not match batch record (${expectedBill})`
  );
  return false;
}
// ✅ Check bankname
  const validBanks = [
    "Access Bank",
    "Ecobank",
    "FCMB",
    "Fidelity",
    "First Bank",
    "GTBank",
    "Polaris Bank",
    "Providus Bank",
    "Stanbic IBTC",
    "Sterling Bank",
    "Union Bank",
    "UBA",
    "Unity Bank Plc",
    "Wema Bank",
    "Zenith Bank",
    "Kuda Bank",
    "Opay",
    "Moniepoint",
    "Palmpay",
    "FairMoney MFB",
    "Lapo Microfinance Bank",
  ];
  if (!validBanks.includes(row.bankname)) {
    errors.push(`Row ${rowNumber}: Invalid bank name (${row.bankname})`);
    return false;
  }

  // ✅ Safeguard: approvedamount ≤ billamount
  if (parseFloat(row.approvedamount) > parseFloat(row.billamount)) {
    errors.push(`Row ${rowNumber}: Approved amount (${row.approvedamount}) cannot exceed bill amount (${row.billamount})`);
    return false;
  }

 // ✅ Duplicate check using only hcpcode + batchnumber
const { data: existing } = await supabase
  .from("myaccount")
  .select("id")
  .eq("hcpcode", row.hcpcode)
  .eq("batchnumber", row.batchnumber)
  .maybeSingle();

if (existing) {
  setError(
    `Row ${rowNumber}: Duplicate record already exists for HCP ${row.hcpcode} and Batch ${row.batchnumber}`
  );
  errors.push(
    `Row ${rowNumber}: Duplicate record already exists for HCP ${row.hcpcode} and Batch ${row.batchnumber}`
  );
  return false;
}


  // ✅ Insert if all checks pass
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
  .select();   // ✅ forces Supabase to return the inserted row



  if (error) {
    errors.push(`Row ${rowNumber}: Database error (${error.message})`);
    return false;
  }
  if (!data) {
    errors.push(`Row ${rowNumber}: Insert returned no data`);
    return false;
  }

  return true;
}

  async function fetchPayments() {
    const { data, error } = await supabase.from("myaccount").select("*");
    if (error) {
      setError(error.message);
    } else {
      setPayments(data);
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("myaccount").delete().eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      fetchPayments();
    }
  }

 

  return (
    <div className="container mt-4">
      <h3>Account Section</h3>

      {/* Error / Success Alert */}
      {error && (
        <div className={`alert ${error.startsWith("✅") ? "alert-success" : "alert-danger"}`}>
          {error.split("\n").map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {uploadProgress > 0 && (
        <div className="progress mb-3">
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ width: `${uploadProgress}%` }}
          >
            {uploadProgress}%
          </div>
        </div>
      )}

      {/* Upload Payment Button */}
      <button
        className="btn btn-primary mb-3"
        onClick={() => document.getElementById("fileInput").click()}
      >
        Upload Payment
      </button>
      <input
        type="file"
        id="fileInput"
        accept=".csv,.xlsx"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
       
       <input
  type="text"
  className="form-control mb-3"
  placeholder="Search by HCP Code, Batch Number, or Hospital Name..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>


      {/* Payments Table */}
    <div className="table-responsive">
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>S/N</th>
            <th>HCP Code</th>
            <th>Batch Number</th>
            <th>Hospital Name</th>
            <th>Narration</th>
            <th>No. of Encounter</th>
            <th>Bill Amount</th>
            <th>Approved Amount</th>
            <th>Bank Name</th>
            <th>Account No</th>
            <th>Date of Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
      <tbody>
  {filteredPayments.map((p, index) => (
    <tr key={p.id}>
      <td>{index + 1}</td> {/* ✅ Serial number */}
      <td>{p.hcpcode}</td>
      <td>{p.batchnumber}</td>
      <td>{p.hospname}</td>
      <td>{p.narration}</td>
      <td>{p.noofencounter}</td>
      <td>{formatNaira(p.billamount)}</td>
      <td>{formatNaira(p.approvedamount)}</td>
      <td>{p.bankname}</td>
      <td>{p.acctno}</td>
      <td>
        {new Date(p.dateofpayment).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td>
        <button
          className="btn btn-danger btn-sm me-2"
          onClick={() => {
            setSelectedPaymentId(p.id);
            setShowDeleteModal(true);
          }}
        >
          Delete
        </button>
        <button
          className="btn btn-success btn-sm"
          onClick={() => handleGenerateReceipt(p)}
        >
          Receipt
        </button>
      </td>
    </tr>
  ))}
</tbody>
  </table>
    </div>
    {showDeleteModal && (
  <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
    <div className="modal-dialog modal-dialog-centered modal-sm modal-md modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Confirm Delete</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowDeleteModal(false)}
          ></button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this record?</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              await handleDelete(selectedPaymentId);
              setShowDeleteModal(false);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    
    </div>
  );
}
