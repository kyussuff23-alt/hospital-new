import { useState,useEffect } from "react";
import { supabase } from "./supabaseClient";
import './Claims.css'
import { Modal, Button } from "react-bootstrap";

export default function Claims() {
  const [searchType, setSearchType] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const currentForm = results[currentPage]; 
  const [formValues, setFormValues] = useState({});
   const pageVals = formValues[currentPage] || {}; // <-- define once here
     const [showWarning, setShowWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);
 const [isFrozen, setIsFrozen] = useState(false);
const [showNotFound, setShowNotFound] = useState(false);


 
 
   // State for vetting inputs
const [frequency, setFrequency] = useState("");
const [period, setPeriod] = useState("");
const [bill, setBill] = useState("");
const [approved, setApproved] = useState("");
const [variance, setVariance] = useState("");
const [amount, setAmount] = useState("");


function normalizeAmount(amountStr) {
  if (amountStr === null || amountStr === undefined) return 0;
  // Convert to string, remove commas, trim spaces
  const cleaned = String(amountStr).replace(/,/g, "").trim();
  return parseFloat(cleaned) || 0;
}

// Recalculate Approved whenever amount, frequency, or period changes

// Sync amount whenever you move to a new claim
useEffect(() => {
  if (currentForm) {
    setAmount(currentForm.amountValue || "");
  }
}, [currentForm]);

 // Calculate approved whenever amount/frequency/period change
 // Recalculate Approved whenever amount, frequency, or period changes
useEffect(() => {
  const pageVals = formValues[currentPage] || {};
  const multiplier = getFrequencyMultiplier(pageVals.frequency);
  const periodNum = parseInt(pageVals.period, 10) || 0;
  const amountNum = normalizeAmount(pageVals.amount || currentForm?.amountValue || "");
  const result = amountNum * multiplier * periodNum;

  updateField("approved", result);
}, [
  formValues[currentPage]?.amount,
  formValues[currentPage]?.frequency,
  formValues[currentPage]?.period,
]);

// Recalculate Variance whenever bill or approved change
useEffect(() => {
  const pageVals = formValues[currentPage] || {};
  const billNum = normalizeAmount(pageVals.bill);
  const approvedNum = normalizeAmount(pageVals.approved);
  const newVariance = billNum - approvedNum;

  updateField("variance", newVariance);
}, [
  formValues[currentPage]?.bill,
  formValues[currentPage]?.approved,
]);

// Helper if you want to call it directly
function recalcVariance(billVal, approvedVal) {
  const billNum = normalizeAmount(billVal);
  const approvedNum = normalizeAmount(approvedVal);
  return billNum - approvedNum; // can be negative or positive
}


function getFrequencyMultiplier(freq) {
  switch (freq) {
    case "OD": return 1;
    case "BD": return 2;
    case "TDS": return 3;
    case "QDS": return 4;
    case "FTD": return 5;
    default: return 0;
  }
}

function recalcApproved(amountStr, freq, per) {
  const amountNum = normalizeAmount(amountStr); // <-- cleans "5,000.00" to 5000
  const multiplier = getFrequencyMultiplier(freq);
  const periodNum = parseInt(per, 10) || 0;
  const result = amountNum * multiplier * periodNum;
  setApproved(result);
}

  // Update a field for the current page
  function updateField(field, value) {
    setFormValues(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        [field]: value
      }
    }));
  }


   function collectAllValues() {
  if (results.length === 1) {
    return [formValues[0] || {}];
  }
  return results.map((_, idx) => formValues[idx] || {});
}

// clearing forms after succesfully submitting the form

function resetForm() {
  setFormValues({});
  setResults([]);
  setCurrentPage(0);
  setFrequency("");
  setPeriod("");
  setBill("");
  setApproved("");
  setVariance("");
  setAmount("");
  setIsFrozen(false);
}



async function handleSave() {
  const allValues = collectAllValues();

  const mergedValues = results.map((res, idx) => ({
    date: res?.date,
    policyid: res?.policyid,
    authcode: res?.authcode,
    provider: res?.provider,
    diagnosis: res?.diagnosis,
    services: res?.services,
    amount: res?.amount,
    frequency: allValues[idx]?.frequency || null,
    period: allValues[idx]?.period || null,
    bill: allValues[idx]?.bill || null,
    approved: allValues[idx]?.approved || null,
    variance: allValues[idx]?.variance || null,
    denial: allValues[idx]?.denial || null,
    vett: allValues[idx]?.vett || null
  }));

  const authcodes = mergedValues.map(v => v.authcode).filter(Boolean);

  const { data, error } = await supabase
    .from("claims")
    .select("authcode")
    .in("authcode", authcodes);

  if (error) {
    console.error("Error checking claims:", error.message);
    return;
  }

  if (data && data.length > 0) {
    // ✅ Claims already vetted → freeze inputs
    setIsFrozen(true);
    setShowWarning(true);
  } else {
    // ✅ New claims → insert
    await saveToClaims(mergedValues, "insert");
    setShowSuccess(true);
      resetForm(); // ✅ clear everything after success
  }
}


async function saveToClaims(values, mode = "insert") {
  let error;

  if (mode === "insert") {
    const { error: insertError } = await supabase
      .from("claims")
      .insert(values);
    error = insertError;
  } else if (mode === "update") {
    // Loop through each record and update by id
    for (const v of values) {
      const { error: updateError } = await supabase
        .from("claims")
        .update({
          frequency: v.frequency,
          period: v.period,
          bill: v.bill,
          approved: v.approved,
          variance: v.variance,
          denial: v.denial,
          vett: v.vett
        })
        .eq("id", v.id); // ✅ update by unique id

      if (updateError) {
        error = updateError;
        break; // stop if any update fails
      }
    }
  }

  if (error) {
    console.error("Error saving claims:", error.message);
  }
}

  
  
  async function handleSearch() {
    if (!searchType || !searchValue) return;

    // Query authtable
    const { data, error } = await supabase
      .from("authtable")
      .select("*")
      .eq(searchType, searchValue);

    if (error) {
      console.error(error);
      return;
    }

      if (!data || data.length === 0) {
    // ✅ Show "Record not found" modal
    setShowNotFound(true);
    return;
  }

    // For each row, enrich with amount lookup
    const enriched = [];
    for (const row of data) {
      let amountValue = "";

      // Step 1: Try services table first (match itemname)
      const { data: svc, error: svcError } = await supabase
        .from("services")
        .select("amount")
        .eq("itemname", row.services)
        .single();

      if (svc && !svcError) {
        amountValue = svc.amount;
      } else {
        // Step 2: Fallback to drugs table (match drugname)
        const { data: drug, error: drugError } = await supabase
          .from("drugs")
          .select("amount")
          .eq("drugname", row.services)
          .single();

        if (drug && !drugError) {
          amountValue = drug.amount;
        }
      }

      enriched.push({ ...row, amountValue });
    }

    setResults(enriched);
    setCurrentPage(0);
  }



  return (
    <div className="container-fluid mt-4">
      <h3>Claims Vetting</h3>

      {/* Dropdown + input */}
      <div className="mb-3 d-flex gap-2">
        <div className="dropdown">
          <button
            className="btn btn-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
          >
            {searchType ? `Vett by ${searchType}` : "Select Vett Option"}
          </button>
          <ul className="dropdown-menu">
            <li>
              <button className="dropdown-item" onClick={() => setSearchType("authcode")}>
                Vett by Auth Code
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => setSearchType("policyid")}>
                Vett by PolicyID
              </button>
            </li>
          </ul>
        </div>

        {searchType && (
          <input
            type="text"
            className="form-control"
            placeholder={`Enter ${searchType}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        )}
        <button className="btn btn-success" onClick={handleSearch}>
          Search
        </button>
      </div>

      {/* Prefilled form */}
   {currentForm && (
  <form className="card shadow-lg p-4 mx-auto hover-card" style={{ maxWidth: "80%" }}>
    <div className="row">
      {/* Left column: read-only claim details */}
      <div className="col-md-6 border-end">
        <h5 className="mb-3 text-primary">Claim Details</h5>

        <div className="mb-3">
          <label className="form-label">Date</label>
          <input className="form-control" value={currentForm.date} readOnly />
        </div>

         <div className="mb-3">
          <label className="form-label">Policyid</label>
          <input className="form-control" value={currentForm.policyid} readOnly />
        </div>
       
       
        <div className="mb-3">
          <label className="form-label">AuthCode</label>
          <input className="form-control" value={currentForm.authcode} readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">Provider</label>
          <input className="form-control" value={currentForm.provider} readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">Diagnosis</label>
          <input className="form-control" value={currentForm.diagnosis} readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">Services</label>
          <input className="form-control" value={currentForm.services} readOnly />
        </div>

 <div>
      {/* Amount (prefilled from query, editable per page) */}
      <div className="mb-3">
        <label className="form-label">Amount</label>
        <input
          className="form-control"
          value={pageVals.amount ?? currentForm?.amountValue ?? ""}
          onChange={(e) => updateField("amount", e.target.value)}
        />
      </div>
</div>
      </div>

      {/* Right column: editable vetting inputs */}
      <div className="col-md-6">
        <h5 className="mb-3 text-success">Vetting Inputs</h5>

   {/* Frequency */}
      <div className="mb-3">
        <label className="form-label">Frequency</label>
       <select
  className="form-select"
  value={pageVals.frequency || ""}
  onChange={(e) => updateField("frequency", e.target.value)}
  disabled={isFrozen} // ✅ freeze if vetted
>
  <option value="">Select...</option>
  <option value="OD">OD</option>
  <option value="BD">BD</option>
  <option value="TDS">TDS</option>
  <option value="QDS">QDS</option>
  <option value="FTD">FTD</option>
</select>

      </div>

   {/* Period */}
      <div className="mb-3">
        <label className="form-label">Period</label>
        <input
          className="form-control"
          value={pageVals.period || ""}
          onChange={(e) => updateField("period", e.target.value)}
           disabled={isFrozen} // ✅ freeze if vetted
        />
      </div>
   
   
    {/* Bill */}
      <div className="mb-3">
        <label className="form-label">Bill</label>
        <input
          className="form-control"
          value={pageVals.bill || ""}
          onChange={(e) => updateField("bill", e.target.value)}
           disabled={isFrozen} // ✅ freeze if vetted
        />
      </div>

   {/* Approved (auto-calculated) */}
      <div className="mb-3">
        <label className="form-label">Approved</label>
        <input
          className="form-control"
          value={pageVals.approved || ""}
          readOnly
        />
      </div>
      
    {/* Variance (auto-calculated) */}
      <div className="mb-3">
        <label className="form-label">Variance</label>
        <input
          className="form-control"
          value={pageVals.variance || ""}
          readOnly
        />
      </div>

 <div className="mb-3">
  <label className="form-label">Denial</label>
  <select
    className="form-select"
    value={formValues[currentPage]?.denial || ""}
    onChange={(e) => updateField("denial", e.target.value)}
     disabled={isFrozen} // ✅ freeze if vetted
  >
    <option value="">Select...</option>
    <option value="not applicable">not applicable</option>
    <option value="not covered">not covered</option>
    <option value="no auth code">no auth code</option>
    <option value="consumables">consumables</option>
    <option value="others">others</option>
  </select>
</div>
       
<div className="mb-3">
  <label className="form-label">Vett</label>
  <select
    className="form-select"
    value={formValues[currentPage]?.vett || ""}
    onChange={(e) => updateField("vett", e.target.value)}
     disabled={isFrozen} // ✅ freeze if vetted
  >
    <option value="">Select...</option>
    <option value="adjudicate">adjudicate</option>
    <option value="paid">refuse</option>
  </select>
</div>
      
      </div>
    </div>
  </form>
)}

{/* Single global pagination control */}
   {results.length > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
          >
            Previous
          </button>

          <span>
            Page {currentPage + 1} of {results.length}
          </span>

          <button
          className="btn btn-secondary"
          onClick={() =>
            setCurrentPage((p) => (p < results.length - 1 ? p + 1 : p))
          }
          disabled={currentPage === results.length - 1}
        >
          Next
        </button>
        </div>
      )}
   
      {/* Save button logic */}
    {(results.length === 1 || currentPage === results.length - 1) && (
        <div className="mt-3 text-center">
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
    )}
   
   
   <Modal show={showNotFound} onHide={() => setShowNotFound(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Record Not Found</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Error 452 : records not found.
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowNotFound(false)}>
      Close
    </Button>
  </Modal.Footer>
</Modal>

   
   
   
     {/* Warning Modal */}
      <Modal show={showWarning} onHide={() => setShowWarning(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Warning</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Error 451 : Duplacate claims detected
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWarning(false)}>
            OK
          </Button>
    


        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccess} onHide={() => setShowSuccess(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Success</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Claims saved successfully!
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setShowSuccess(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
   
   
    </div>
  );

}
