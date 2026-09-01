import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import NhiaNyscItemsMatrix from "./NhiaNyscItemsMatrix"; // Reusing the identical shared matrix asset

export default function NhiaForm() {
  const navigate = useNavigate();
  const [refId, setRefId] = useState("");
  
  // Real-Time Autocomplete Search Engine Parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef(null);

  // Aligned identically with standard shared object mapping structures
  const [biodata, setBiodata] = useState({
    enrolleename: "", 
    gender: "", 
    nin: "", 
    nhiaNumber: "",
    diagnosis: "",
    hospitalname: "", // Injected dynamically upon lookup assignment
    hcpcode: ""       // Injected dynamically upon lookup assignment
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Close search results dropdown if user clicks anywhere outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Triggered dynamically as the operator types the hospital name
  const handleHospitalSearch = async (text) => {
    const uppercaseText = text.toUpperCase();
    setSearchQuery(uppercaseText);

    // Don't hit the database until they type at least 2 characters
    if (uppercaseText.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setSearching(true);
      // Query on-the-fly and limit strictly to 10 rows to preserve server space
      const { data, error } = await supabase
        .from("nhiahospital")
        .select("id, hospname, nhiacode")
        .ilike("hospname", `%${uppercaseText}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Autocomplete directory search error:", err.message);
    } finally {
      setSearching(false);
    }
  };

  // Called when an item from the autocomplete floating results box is clicked
  const handleSelectHospital = (hospital) => {
    setSearchQuery(hospital.hospname.toUpperCase());
    setShowDropdown(false);
    setBiodata(prev => ({
      ...prev,
      hospitalname: hospital.hospname,
      hcpcode: hospital.nhiacode
    }));
  };

  // Generate unique standard NHIA identification prefix
  useEffect(() => {
    setRefId("NHIA-REF-" + crypto.randomUUID().substring(0, 8).toUpperCase());
  }, []);

  // Handle automatic alert timeouts
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleClearForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setBiodata({ 
      enrolleename: "", 
      gender: "", 
      nin: "", 
      nhiaNumber: "", 
      diagnosis: "",
      hospitalname: "", 
      hcpcode: "" 
    });
    setSelectedItems([]);
    setRefId("NHIA-REF-" + crypto.randomUUID().substring(0, 8).toUpperCase());
    setAlert({ message: "Form workspace completely cleared and reset.", type: "success" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!biodata.hospitalname || !biodata.hcpcode) {
      setAlert({ message: "Please explicitly search and select a verified facility node using the autocomplete search bar.", type: "danger" });
      return;
    }

    const { enrolleename, gender, nin, nhiaNumber, diagnosis } = biodata;

    if (!enrolleename || !gender || !nhiaNumber || !diagnosis || selectedItems.length === 0) {
      setAlert({ message: "Please fill in all mandatory demographics fields and append at least one item before submission.", type: "danger" });
      return;
    }

    const nhiaRegex = /^\d+-\d$/;
    if (!nhiaRegex.test(nhiaNumber)) {
      setAlert({ message: "Invalid NHIA format. Tracking requirements require formatting layout like: 12345678-0", type: "danger" });
      return;
    }

    if (biodata.nin && biodata.nin.trim().length !== 11) {
      setAlert({ message: "National Identification Number (NIN) must be exactly 11 digits.", type: "danger" });
      return;
    }

    const trimmedDiagnosis = diagnosis ? diagnosis.trim() : "";
    if (trimmedDiagnosis.length < 10) {
      setAlert({ message: "Validation Error: Diagnosis description is too short. Please provide comprehensive clinical notes.", type: "danger" });
      return;
    }

    setSubmitting(true);

    try {
      const submissionPayload = {
        refId,
        biodata: {
          ...biodata,
          hospitalname: biodata.hospitalname,
          hcpcode: biodata.hcpcode
        },
        selectedItems,
        hospitalName: biodata.hospitalname,
        hcpCode: biodata.hcpcode
      };

      const { data, error } = await supabase.functions.invoke('nhianysclogic', {
        body: submissionPayload
      });

      if (error || (data && data.error)) {
        const errorMsg = error?.message || data?.error;
        console.error("Edge function execution error:", errorMsg);
        setAlert({ message: `Submission failed: ${errorMsg}`, type: "danger" });
        setSubmitting(false);
        return;
      }

      setAlert({ message: "Standard offline entry parsed and logged into target systems successfully!", type: "success" });

      setSearchQuery("");
      setBiodata({ 
        enrolleename: "", 
        gender: "", 
        nin: "", 
        nhiaNumber: "", 
        diagnosis: "",
        hospitalname: "",
        hcpcode: ""
      });
      setSelectedItems([]);

      setTimeout(() => {
        setSubmitting(false);
        navigate("/nhia-dashboard");
      }, 2000);

    } catch (err) {
      console.error("Network routing abstraction crash:", err.message);
      setAlert({ message: "Network connection broken or timeout exceeded.", type: "danger" });
      setSubmitting(false);
    }
  };


 return (
    <div className="container px-0" style={{ maxWidth: "720px" }}>
      {alert && (
        <div className={`alert d-flex align-items-center gap-2 p-3 rounded border mb-4 ${alert.type === "success" ? "alert-success" : "alert-danger"}`} role="alert">
          <i className={`bi ${alert.type === "success" ? "bi-check-circle-fill text-success" : "bi-exclamation-triangle-fill text-danger"}`}></i>
          <span className="fs-7 fw-semibold">{alert.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-4 p-sm-5 mb-4">
        <div className="bg-dark text-light p-3 rounded d-flex flex-wrap justify-between items-center gap-3 mb-4 border border-secondary">
          <div>
            <span className="d-block text-uppercase tracking-wider text-muted fw-bold" style={{ fontSize: "9px" }}>Relational Reference ID Token (Internal Proxy Entry)</span>
            <span className="font-monospace text-sm fw-black text-info">{refId || "Generating Key..."}</span>
          </div>
          <span className="badge bg-secondary font-monospace py-2 px-3 border border-dark text-uppercase" style={{ fontSize: "10px" }}>Standard NHIA Internal Gateway</span>
        </div>

        {/* 🏢 HIGH PERFORMANCE AUTOCOMPLETE LOOKUP SELECTION CONTAINER */}
        <div className="mb-4 position-relative" ref={dropdownRef}>
          <label className="form-label text-uppercase tracking-wide text-secondary fw-bold" style={{ fontSize: "11px" }}>
            Originating Healthcare Facility (Offline Sender)
          </label>
          <div className="position-relative">
            <input 
              type="text" 
              className="form-control bg-light border p-2.5 rounded fw-medium text-dark text-sm text-uppercase"
              placeholder="TYPE HOSPITAL NAME TO SEARCH..."
              value={searchQuery}
              onChange={(e) => handleHospitalSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
            />
            {searching && (
              <span className="position-absolute end-0 top-50 translate-middle-y me-3 text-xs font-mono text-muted">
                SEARCHING...
              </span>
            )}
          </div>

          {/* Floating Dropdown Result Portal Layer */}
          {showDropdown && searchResults.length > 0 && (
            <ul className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 p-0 overflow-auto z-3" style={{ maxHeight: "200px", listStyle: "none", left: 0, right: 0 }}>
              {searchResults.map((hospital) => (
                <li 
                  key={hospital.id}
                  onClick={() => handleSelectHospital(hospital)}
                  className="px-3 py-2 text-sm text-dark border-bottom hover:bg-light text-uppercase"
                  style={{ cursor: "pointer" }}
                >
                  <div className="fw-bold">{hospital.hospname}</div>
                  <div className="text-muted font-monospace" style={{ fontSize: "11px" }}>CODE: {hospital.nhiacode}</div>
                </li>
              ))}
            </ul>
          )}

          {/* Explicit Indicator if no records match */}
          {showDropdown && searchResults.length === 0 && searchQuery.trim().length >= 2 && !searching && (
            <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 p-3 text-xs font-semibold text-muted font-mono z-3" style={{ left: 0, right: 0 }}>
              NO REGISTERED HOSPITAL MATCHES THIS SEARCH KEY.
            </div>
          )}

          {/* Small Selected Badge Confirmation Anchor */}
          {biodata.hcpcode && (
            <div className="mt-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace px-2 py-1 uppercase">
                SELECTED NODE: {biodata.hcpcode}
              </span>
            </div>
          )}
        </div>
        {/* Modular Inline Demographics Definition Grid */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 d-flex flex-column gap-1">
            <label className="text-uppercase tracking-wider text-secondary fw-bold" style={{ fontSize: "11px" }}>Enrollee Full Name</label>
            <input 
              type="text" 
              placeholder="JOHN DOE" 
              value={biodata.enrolleename || ""} 
              onChange={(e) => setBiodata({ ...biodata, enrolleename: e.target.value.toUpperCase() })} 
              className="form-control border p-2.5 text-sm text-uppercase" 
            />
          </div>

          <div className="col-12 col-sm-6 d-flex flex-column gap-1">
            <label className="text-uppercase tracking-wider text-secondary fw-bold" style={{ fontSize: "11px" }}>
              NHIA National Number <span className="text-danger">*</span>
            </label>
            <input 
              type="text" 
              placeholder="e.g. 12345678-0" 
              value={biodata.nhiaNumber} 
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9-]/g, "");
                setBiodata({ ...biodata, nhiaNumber: clean });
              }} 
              className="form-control border p-2.5 text-sm font-monospace" 
            />
          </div>

          <div className="col-12 col-sm-6 d-flex flex-column gap-1">
            <label className="text-uppercase tracking-wider text-secondary fw-bold" style={{ fontSize: "11px" }}>
              National Identification Number (NIN) <span className="text-muted fw-normal">(Optional)</span>
            </label>
            <input 
              type="text" 
              maxLength={11}
              placeholder="E.G. 11 DIGIT NUMBER" 
              value={biodata.nin || ""} 
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, "");
                setBiodata({ ...biodata, nin: clean });
              }} 
              className="form-control border p-2.5 text-sm font-monospace text-uppercase" 
            />
          </div>

          <div className="col-12 col-sm-6 d-flex flex-column gap-1">
            <label className="text-uppercase tracking-wider text-secondary fw-bold" style={{ fontSize: "11px" }}>Gender Orientation</label>
            <select value={biodata.gender} onChange={(e) => setBiodata({ ...biodata, gender: e.target.value })} className="form-select border p-2.5 text-sm bg-white">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="col-12 d-flex flex-column gap-1">
            <div className="d-flex justify-content-between align-items-center">
              <label className="text-uppercase tracking-wider text-secondary fw-bold" style={{ fontSize: "11px" }}>
                Clinical Diagnosis & Clinical History Summary <span className="text-danger">*</span>
              </label>
              <span className={`font-monospace fw-bold text-xs ${(biodata.diagnosis?.length || 0) >= 450 ? 'text-danger' : 'text-muted'}`}>
                {(biodata.diagnosis?.length || 0)} / 500 Chars
              </span>
            </div>
            
            <textarea 
              name="diagnosis"
              required
              rows="3"
              maxLength={500}
              value={biodata.diagnosis}
              placeholder="State clear, comprehensive clinical diagnostic indicators..."
              onChange={(e) => {
                const clean = e.target.value.replace(/['"`<>;]/g, "");
                setBiodata({ ...biodata, diagnosis: clean });
              }}
              className="form-control bg-light border p-2.5 text-sm"
              style={{ resize: "y", minHeight: "80px" }}
            ></textarea>
          </div>
        </div>

        {/* Treatment Allocation subcomponent block integration */}
        <NhiaNyscItemsMatrix refId={refId} hcpCode={biodata.hcpcode} selectedItems={selectedItems} setSelectedItems={setSelectedItems} />

        <div className="pt-4 mt-4 border-t d-flex align-items-center justify-content-end gap-2">
          <button type="button" disabled={submitting} onClick={handleClearForm} className="btn btn-outline-secondary px-4 py-2 fw-bold text-uppercase tracking-wide" style={{ fontSize: "11px" }}>
            Reset Form
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary px-4 py-2 fw-bold text-uppercase tracking-wide d-flex align-items-center gap-2" style={{ fontSize: "11px" }}>
            {submitting ? "Processing Node Sync..." : "Inject Claims Log"}
          </button>
        </div>
      </form>
    </div>
  );
}
