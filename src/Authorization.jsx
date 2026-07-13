import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
//import './Table.css';


export default function Authorization( {
  id: initialId, // rename the prop to avoid conflict
  hcpCode,
  hospitalName,
  enrolleeName,
  policyId,
  plan,
  phonenumber,
  gender,
  client,
  diagFromRequest,
  treatFromRequest,
  drugsrequest,
  onDone
}) {
 
 
 const [reason, setReason] = useState("");
 // const [authycode, setAuthycode] = useState("");
 const [deniedAll, setDeniedAll] = useState(false);

  
   const [modalOpen, setModalOpen] = useState(false);       // controls modal visibility for denial reason
  const [activeDrugIndex, setActiveDrugIndex] = useState(null); 
 
 const [status, setStatus] = useState("approved"); // default
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [enrolments, setEnrolments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisOptions, setDiagnosisOptions] = useState([]);
  const [selectedDiag, setSelectedDiag] = useState("");

  const [servicesOptions, setServicesOptions] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [coverageStatus, setCoverageStatus] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);

  const [selectedDrug, setSelectedDrug] = useState("");


  const [selectedDrugs, setSelectedDrugs] = useState([]);// suposedly this for the new from hospital
const [drugsOptions, setDrugsOptions] = useState([]);

const [authCode, setAuthCode] = useState("");
const [showPasswordInput, setShowPasswordInput] = useState(false);
const [password, setPassword] = useState("");
const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
const [saving, setSaving] = useState(false);
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [showSuccessModall, setShowSuccessModall] = useState(false);

const [enrolleeId, setEnrolleeId] = useState(initialId);
  const [showRequestCard, setShowRequestCard] = useState(false);
  const [localDrugs, setLocalDrugs] = useState(drugsrequest || []);





function resetAuthorizationForm() {
  setSelectedServices([]);
  setSelectedDrugs([]);
  setAuthCode("");
  setSelectedResult(null);
  setSelectedDiag("");
}


// Keep local state in sync if parent props change
useEffect(() => {
  if (drugsrequest) {
    setLocalDrugs(drugsrequest);
  }
}, [drugsrequest]);

const handleSaveAuthorization = async (code) => {
  setSaving(true);

  const allItems = [
    ...selectedServices.map(s => s.name),
    ...selectedDrugs.map(d => d.name)
  ];

  const rows = allItems.map(item => ({
    date: new Date().toISOString(),
    authcode: code,   // ✅ use the code passed in
    provider: selectedResult?.provider,
    enrolleename: selectedResult?.enrolleename,  // this the normal authoriztion codes flow not from provider
    policyid: selectedResult?.policyid,
    plan: selectedResult?.plan,
    client: selectedResult?.client,
    gender: selectedResult?.gender,
    diagnosis: selectedDiag,
    services: item
  }));

  const { error } = await supabase.from("authtable").insert(rows);

  if (error) {
    console.error("Error saving authorization:", error.message);
  } else {
    setShowSuccessModal(true);    // the first modal for the normal authorization
    setAuthCode(generatedCode);
    resetAuthorizationForm();
  }

  setSaving(false);
};

// this is for form coming from updatrrequest 
const handleSendAuthorization = async () => {
  // Step 1: update the parent authrequest
  const { error: authError } = await supabase
    .from("authrequest")
    .update({
      status,             // "approved" or "denied"
      reason,             // denial reason if any
      authcode: authCode,
      updated_at: new Date(),
    })
    .eq("id", initialId);

  if (authError) {
    console.error("Error updating authrequest:", authError.message);
    return;
  }

  // Step 2: update each child drugsrequest row
  for (const drug of localDrugs) {
  const { error: drugError } = await supabase
    .from("drugsrequest")
    .update({
      qty: Number(drug.qty) || 0,
      period: Number(drug.period) || 0,
      total: Number(drug.total) || 0,
      denialreason: drug.denialreason || null, // match DB column name
    })
    .eq("id", drug.id); // id is unique, no need for authrequest_id filter

  if (drugError) {
    console.error(`Error updating drug ${drug.id}:`, drugError.message);
  }
}


  // Step 3: success flow
  setShowSuccessModall(true);
  setReason("");
  setAuthCode("");
  setStatus("approved");
  onDone();
};



const passwordMap = {
  "267789": "tolu",
  "468767": "damilola",
  "345625": "peace",
  "345622": "olayemi",
  "345623": "toyin"
};


const handleGenerateAuthClick = () => {
  setShowPasswordInput(true); // show password input box
};

const handleSubmitPassword = () => {
  if (passwordMap[password]) {
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const generatedCode = `51/PHIS/${randomSix}/${passwordMap[password]}`;
    setAuthCode(generatedCode);
    setShowPasswordInput(false);
    setPassword("");

    // ✅ Save immediately with the fresh code
    handleSaveAuthorization(generatedCode);
  } else {
    setShowUnauthorizedModal(true);
    setShowPasswordInput(false);
    setPassword("");
  }
};





const handleApprove = () => {
  setSelectedServices(prev => [...prev, { name: selectedService, action: "approve" }]);
};

const handleWaive = () => {
  setSelectedServices(prev => [...prev, { name: selectedService, action: "waive" }]);
};

const handleDeny = () => {
  setSelectedServices([]); // clear all services
  setCoverageStatus(null); // reset coverage
};

  
const handleApproveDrug = () => {
  if (selectedDrug) {
    setSelectedDrugs(prev => [...prev, { name: selectedDrug, action: "approve" }]);
  }
};

const handleWaiveDrug = () => {
  if (selectedDrug) {
    setSelectedDrugs(prev => [...prev, { name: selectedDrug, action: "waive" }]);
  }
};

const handleDenyDrug = () => {
  setSelectedDrug("");
  setSelectedDrugs([]);
};

  
  // Fetch ICD-10 diagnoses
  const fetchDiagnosis = async (query) => {
    if (!query) {
      setDiagnosisOptions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (Array.isArray(data[3])) {
        const options = data[3].map((item) => ({
          code: item[0],
          name: item[1],
          label: item[1],
        }));
        setDiagnosisOptions(options);
      }
    } catch (error) {
      console.error("Error fetching ICD-10-CM diagnoses:", error);
    }
  };

  // Debounce diagnosis search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDiagnosis(diagnosis);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [diagnosis]);

  // Fetch clients
  
  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from("mygroup").select("name");
      if (error) console.error("Error fetching clients:", error.message);
      else setClients(data.map((c) => c.name));
    };
    fetchClients();
  }, []);

  // Fetch enrolments  This is corrected 
 // Fetch enrolments
useEffect(() => {
  const fetchEnrolments = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("myenrolment")
      .select("*")
      .eq("client", selectedClient)
      .order("id");

    // ✅ Apply search directly in Supabase query
    if (searchTerm) {
      query = query.or(
        `policyid.ilike.%${searchTerm}%,enrolleename.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching enrolments:", error.message);
    } else {
      setEnrolments(data);
      setFilteredResults(data); // dropdown continues as before
    }
  };

  fetchEnrolments();
}, [selectedClient, searchTerm]);

  
  
  // Fetch all services (for dropdown)
// State

// Fetch all services once
useEffect(() => {
  const fetchServices = async () => {
    const { data, error } = await supabase.from("services").select("itemname");
    if (error) {
      console.error("Error fetching services:", error.message);
    } else {
      setServicesOptions(data.map((s) => s.itemname));
    }
  };
  fetchServices();
}, []);

// Check coverage when service changes

useEffect(() => {
  const checkCoverage = async () => {
   if (!selectedService || (!selectedClient && !client)) {
  setCoverageStatus(null); 
  return;
}


    const exists = servicesOptions.includes(selectedService);

    if (exists) {
// ✅ FIX: Use the state value, or fall back to the prop value if state is empty
const activeClient = selectedClient || client;
const clientColumn = activeClient.toLowerCase(); 

      const { data, error } = await supabase
        .from("services")
        .select(clientColumn)
        .eq("itemname", selectedService)
        .single();

      if (error || !data) {
        console.error("Error checking coverage:", error?.message);
        setCoverageStatus("no"); // fallback
      } else {
        let result = data[clientColumn];
        if (typeof result === "string") {
          result = result.trim(); // keep original casing
        } else if (typeof result === "boolean") {
          result = result ? "yes" : "no";
        }
        setCoverageStatus(result);
      }
    } else {
      // Manual entry → default to "yes"
      setCoverageStatus("yes");
    }
  };

  checkCoverage();
}, [selectedService, selectedClient,client]);

// drugs use effect
useEffect(() => {
  const fetchDrugs = async () => {
    const { data, error } = await supabase
      .from("drugs")
      .select("drugname");  // adjust column name if needed

    if (error) {
      console.error("Error fetching drugs:", error.message);
    } else {
      setDrugsOptions(data.map(d => d.drugname));
    }
  };

  fetchDrugs();
}, []);

 
 
 
  return (
     
    <div className="card p-4 border-0 shadow-sm rounded-3 bg-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="d-flex align-items-center gap-2 border-bottom pb-3 mb-4">
        <i className="bi bi-shield-lock-fill text-primary fs-4"></i>
        <h4 className="fw-bold text-dark m-0">Medical Authorization Control Desk</h4>
      </div>

      {/* Row 1: Client + Search */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label small fw-bold text-secondary">Select Client Group</label>
       <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setSearchTerm("");
              setFilteredResults([]);
              setSelectedResult(null);
            }}
          >
            <option value="">-- Choose Client --</option>
            {clients.map((client, idx) => (
              <option key={idx} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          {selectedClient && (
            <>
              <label className="form-label">
                Search by Policy ID or Enrollee Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter policy ID or enrollee name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Row 2: Matching Results */}
      {filteredResults.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <label className="form-label">Matching Results</label>
            <select
              className="form-select"
              value={selectedResult?.policyid || ""}
              onChange={(e) =>
                setSelectedResult(
                  filteredResults.find((r) => r.policyid === e.target.value),
                )
              }
            >
              <option value="">-- Choose Result --</option>
              {filteredResults.map((res, idx) => (
                <option key={idx} value={res.policyid}>
                  {res.policyid} - {res.enrolleename}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Row 3: Prefilled enrollee details */}
      {selectedResult && (
        <div className="card border-0 bg-light rounded-3 p-4 mb-4 border border-light-subtle">
          <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-person-badge-fill fs-5"></i> Verified Enrollee Directory Data
          </h6>
          <div className="row g-3">
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Patient Name</small>
              <input type="text" className="form-control bg-white small border-light-subtle text-dark fw-bold" value={selectedResult.enrolleename} readOnly />
            </div>
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Policy ID</small>
              <input type="text" className="form-control bg-white small border-light-subtle font-monospace text-secondary fw-bold" value={selectedResult.policyid} readOnly />
            </div>
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Corporate Client</small>
              <input type="text" className="form-control bg-white small border-light-subtle text-dark" value={selectedResult.client} readOnly />
            </div>
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Gender</small>
              <input type="text" className="form-control bg-white small border-light-subtle text-dark" value={selectedResult.gender} readOnly />
            </div>
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Plan Coverage</small>
              <input type="text" className="form-control bg-white small border-light-subtle text-primary fw-bold" value={selectedResult.plan} readOnly />
            </div>
            <div className="col-md-6 col-lg-4">
              <small className="text-muted d-block small fw-bold mb-1">Assigned Facility</small>
              <input type="text" className="form-control bg-white small border-light-subtle text-dark text-truncate" value={selectedResult.provider} readOnly />
            </div>
          </div>
        </div>
      )}

      {/* Row 4: Diagnosis */}
            {/* Row 4: Diagnosis */}
      {selectedResult && (
        <div className="bg-light p-3 rounded-3 mb-4 border border-light-subtle">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-bold text-secondary">Active Case Diagnosis Narrative</label>
              <input 
                type="text" 
                className="form-control bg-white border-light-subtle shadow-none fw-medium text-dark" 
                placeholder="Selected conditions will populate here..." 
                value={selectedDiag} 
                onChange={(e) => setSelectedDiag(e.target.value)} 
              />
            </div>
            <div className="col-12 position-relative">
              <label className="form-label small fw-bold text-secondary">ICD-10-CM Standardized Code Lookup</label>
              <input 
                type="text" 
                className="form-control bg-white border-light-subtle shadow-none" 
                placeholder="Start typing diagnosis descriptors..." 
                value={diagnosis} 
                onChange={(e) => setDiagnosis(e.target.value)} 
              />
              {diagnosisOptions.length > 0 && (
                <ul className="list-group position-absolute w-100 shadow mt-1 rounded-3" style={{ zIndex: 1060 }}>
                  {diagnosisOptions.map((diag, idx) => (
                    <li 
                      key={idx} 
                      className="list-group-item list-group-item-action small py-2.5 text-dark" 
                      style={{ cursor: "pointer" }} 
                      onClick={() => {
                        const newValue = selectedDiag ? `${selectedDiag}, ${diag.name}` : diag.name;
                        setSelectedDiag(newValue); 
                        setDiagnosisOptions([]); 
                        setDiagnosis("");
                      }}
                    >
                      <i className="bi bi-plus-circle text-success me-2"></i> {diag.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {/* Success Alert */}
      {showSuccessModal && (
        <div className="alert alert-success d-flex align-items-center justify-content-between p-3 border-success border-opacity-25 rounded-3 mb-4 mt-2 shadow-sm">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill fs-5 text-success"></i>
            <span className="small fw-semibold text-success-emphasis">
              Authorization saved successfully
              {authCode && <strong className="font-monospace ms-2 bg-white px-2 py-0.5 border rounded border-success border-opacity-25 text-success">Code: {authCode}</strong>}
            </span>
          </div>

          <div className="d-flex gap-2">
            {authCode && (
              <button
                className="btn btn-sm btn-outline-success font-monospace small px-2.5"
                onClick={() => navigator.clipboard.writeText(authCode)}
              >
                Copy
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-success px-3"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {(selectedResult || enrolleeId)  && (
        <div className="mb-3">
          <label className="form-label">Service</label>
          <input
            list="servicesList"
            className="form-control"
            placeholder="Search treatment, investigation and services"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
          />
          <datalist id="servicesList">
            {servicesOptions.map((service, idx) => (
              <option key={idx} value={service} />
            ))}
          </datalist>
        </div>
      )}

    {coverageStatus && (
  <div className="mt-2 d-flex align-items-center">
    {coverageStatus === "yes" ? (
      <div className="d-flex align-items-center">
        <span className="text-success me-2">✅ Covered</span>
        <button className="btn btn-success me-2" onClick={handleApprove}>
          Approve
        </button>
        {/* Close button to clear the alert status */}
        <button 
          type="button" 
          className="btn-close ms-2" 
          onClick={() => {
            setCoverageStatus(null);
            setSelectedService("");
          }}
        ></button>
      </div>
    ) : (
      <div className="d-flex align-items-center">
        <span className="text-danger me-2">❌ Not Covered</span>
        <button className="btn btn-warning me-2" onClick={handleWaive}>
          Waive
        </button>
        <button className="btn btn-danger me-2" onClick={handleDeny}>
          Deny
        </button>
        {/* Close button to clear the alert status */}
        <button 
          type="button" 
          className="btn-close ms-2" 
          onClick={() => {
            setCoverageStatus(null);
            setSelectedService("");
          }}
        ></button>
      </div>
    )}
  </div>
)}

      <div className="mt-3">
        <input
          type="text"
          className="form-control mt-3"
          placeholder="Search drugs"
          value={selectedDrug}
          readOnly={!selectedResult}
          onChange={(e) => setSelectedDrug(e.target.value)}
          list="drugsOptions"
        />

        <datalist id="drugsOptions">
          {drugsOptions.map((drug, index) => (
            <option key={index} value={drug} />
          ))}
        </datalist>

        {/* ✅ Buttons only show if a drug is selected/typed */}
        {selectedDrug && (
          <div className="mt-2">
            <button
              className="btn btn-success me-2"
              onClick={handleApproveDrug}
            >
              Approve
            </button>
            <button className="btn btn-warning me-2" onClick={handleWaiveDrug}>
              Waive
            </button>
            <button className="btn btn-danger" onClick={handleDenyDrug}>
              Deny
            </button>
          </div>
        )}
      </div>

      {(selectedServices.length > 0 || selectedDrugs.length > 0) && (
        <div className="d-flex justify-content-center mt-4">
          <div className="card shadow-lg" style={{ width: "35rem" }}>
            {" "}
            {/* wider and prettier */}
            <div className="card-body">
              {/* Services Section */}
              {selectedServices.length > 0 && (
                <>
                  <h5 className="mb-3 text-primary">Services</h5>
                  {selectedServices.map((service, index) => (
                    <div
                      key={`service-${index}`}
                      className="d-flex align-items-center mb-2"
                    >
                      <input
                        type="text"
                        className="form-control me-2"
                        value={`${service.name} (${service.action})`}
                        readOnly
                      />
                      <button
                        className="btn-close"
                        onClick={() =>
                          setSelectedServices((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      ></button>
                    </div>
                  ))}
                </>
              )}

              {/* Drugs Section */}
              {selectedDrugs.length > 0 && (
                <>
                  <h5 className="mt-4 mb-3 text-success">Drugs</h5>
                  {selectedDrugs.map((drug, index) => (
                    <div
                      key={`drug-${index}`}
                      className="d-flex align-items-center mb-2"
                    >
                      <input
                        type="text"
                        className="form-control me-2"
                        value={`${drug.name} (${drug.action})`}
                        readOnly
                      />
                      <button
                        className="btn-close"
                        onClick={() =>
                          setSelectedDrugs((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      ></button>
                    </div>
                  ))}
                </>
              )}

              <div className="mt-4 text-center">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateAuthClick}
                >
                  Generate Auth Code
                </button>
              </div>

              {showPasswordInput && (
                <div className="mt-3 d-flex justify-content-center">
                  <input
                    type="password"
                    className="form-control me-2"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "15rem" }}
                  />
                  <button
                    className="btn btn-success"
                    onClick={handleSubmitPassword}
                  >
                    Submit
                  </button>
                </div>
              )}

              {showUnauthorizedModal && (
                <div
                  className="modal fade show d-block"
                  tabIndex="-1"
                  role="dialog"
                >
                  <div className="modal-dialog" role="document">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title text-danger">
                          Unauthorized
                        </h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={() => setShowUnauthorizedModal(false)}
                        ></button>
                      </div>
                      <div className="modal-body">
                        <p>You are not authorised to generate an auth code.</p>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setShowUnauthorizedModal(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Only show the request form if id exists */}
            {/* ✅ Only show the request form if id exists */}
      {enrolleeId && !showSuccessModal && (
        <div className="card border-0 shadow rounded-3 overflow-hidden bg-light border mt-5" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center px-4 py-3 border-0">
            <h5 className="mb-0 fw-bold font-monospace fs-6">
              <i className="bi bi-clipboard2-pulse-fill text-warning me-2"></i> Authorization Request Audit Envelope #{initialId}
            </h5>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setEnrolleeId(null)}></button>
          </div>
          
          <div className="card-body p-4 bg-white">
            {/* BIODATA CONTAINER MATRIX GRID */}
            <div className="row g-3 mb-4 bg-light p-3 rounded-3 border border-light-subtle">
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold text-secondary mb-1">HCP Code</label>
                <input type="text" className="form-control bg-white shadow-none small font-monospace" value={hcpCode || ""} readOnly />
              </div>
              <div className="col-6 col-md-5">
                <label className="form-label small fw-bold text-secondary mb-1">Hospital Facility</label>
                <input type="text" className="form-control bg-white shadow-none small text-truncate" value={hospitalName || ""} readOnly />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Enrollee Name</label>
                <input type="text" className="form-control bg-white shadow-none small fw-bold" value={enrolleeName || ""} readOnly />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold text-secondary mb-1">Policy ID / Code</label>
                <input type="text" className="form-control bg-white shadow-none small font-monospace" value={policyId || ""} readOnly />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold text-secondary mb-1">Insurance Plan Level</label>
                <input type="text" className="form-control bg-white shadow-none small text-primary fw-bold" value={plan || ""} readOnly />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small fw-bold text-secondary mb-1">Gender</label>
                <input type="text" className="form-control bg-white shadow-none small text-center" value={gender || ""} readOnly />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Corporate Client Sponsor</label>
                <input type="text" className="form-control bg-white shadow-none small text-muted" value={client || ""} readOnly />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label small fw-bold text-secondary mb-1">Diagnosis (From Request Folder)</label>
                <textarea className="form-control bg-white shadow-none small text-dark-emphasis" rows="2" style={{ resize: "none" }} value={diagFromRequest || ""} readOnly />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-secondary mb-1">Verification Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted small"><i className="bi bi-telephone-fill"></i></span>
                  <input type="text" className="form-control bg-white border-start-0 shadow-none fw-bold tracking-wider fs-6 text-black" value={phonenumber || ""} readOnly />
                </div>
              </div>
            </div>

            {/* LEDGER DATA GRID LEDGER TABLE SECTION */}
            <h6 className="text-primary fw-bold border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-capsule"></i> Itemized Formulation Pricing Breakdown Matrix
            </h6>
            <div className="table-responsive border rounded-3 mb-4 bg-white shadow-sm">
              <table className="table table-hover align-middle mb-0 text-nowrap">
                <thead className="table-dark small text-uppercase">
                  <tr>
                    <th className="py-3 px-3" style={{ width: "260px" }}>Item Description Narrative</th>
                    <th className="py-3 text-end" style={{ width: "110px" }}>Base Price</th>
                    <th className="py-3 text-center" style={{ width: "90px" }}>Qty</th>
                    <th className="py-3 text-center" style={{ width: "90px" }}>Period</th>
                    <th className="py-3 text-end" style={{ width: "120px" }}>Aggregate Net</th>
                    <th className="py-3 text-center" style={{ width: "100px" }}>Exception</th>
                  </tr>
                </thead>

  <tbody>
    {localDrugs?.map((drug, index) => {
      const total = Number(drug.price || 0) * Number(drug.qty || 0) * Number(drug.period || 1);
      const rowTotalFormatted = Number(drug.total || total).toFixed(2);

      return (
        <tr key={drug.id || index}>
          <td style={{ backgroundColor: "#f0f8ff", width:"240px" }}>
            <textarea
              className="form-control fw-medium"
              rows="2"
              style={{
                resize: "none",
                whiteSpace: "normal",
                wordBreak: "break-word",
                minWidth: "220px",
                backgroundColor: "#e1f5fe",
                borderColor: "#90caf9",
                color: "#0d47a1"
              }}
              value={drug.itemname || ""}
              readOnly
            ></textarea>
          </td>

          <td style={{width:"240px"}}>
            <input type="number" className="form-control" value={drug.price || 0} readOnly />
          </td>
          <td style={{width:"240px"}}>
          <input
  type="number"
  className="form-control"
  value={drug.qty || ""}
  disabled={deniedAll}
onChange={(e) => {
  const val = e.target.value;
  const updated = [...localDrugs];
  
  // FIX: Create a fresh object reference for this specific index
  updated[index] = {
    ...updated[index],
    qty: val,
    total: Number(drug.price || 0) * Number(val || 0) * Number(drug.period || 1)
  };
  
  setLocalDrugs(updated);
}}

/>          </td>
          <td style={{width:"240px"}}>
<input
  type="number"
  className="form-control"
  value={drug.period || ""}
  disabled={deniedAll}
 onChange={(e) => {
  const val = e.target.value;
  const updated = [...localDrugs];
  
  // FIX: Create a fresh object reference for this specific index
  updated[index] = {
    ...updated[index],
    period: val,
    total: Number(drug.price || 0) * Number(drug.qty || 0) * Number(val || 1)
  };
  
  setLocalDrugs(updated);
}}

/>          </td>
          <td>
            <input
              type="text"
              className="form-control text-end bg-light"
              value={rowTotalFormatted}
              readOnly
            />
          </td>

          {/* New Denial Reason field */}
<td>
  <input
    type="text"
    className="form-control truncate"
    style={{ width: "60px" }} // compact field
    placeholder="Reason"
    value={drug.denialreason || ""}
    readOnly
    onClick={() => {
      setActiveDrugIndex(index);
      setModalOpen(true);
    }}
  />
</td>


{/* Modal */}

        </tr>
      );
    })}

                        {/* Grand Total Row */}
                        <tr className="table-light fw-bold">
                          <td colSpan="4" className="text-end py-3 px-3 uppercase text-xs tracking-wider text-secondary small">Aggregated Exposure Total:</td>
                          <td colSpan="2" className="text-end pe-4 text-primary fs-5 font-monospace">
                            {(() => {
                              const grandTotal = localDrugs?.reduce((sum, d) => sum + (Number(d.price || 0) * Number(d.qty || 0) * Number(d.period || 1)), 0) || 0;
                              return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(grandTotal);
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                {modalOpen && (
                  <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                      <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header bg-dark text-white border-0 py-2.5 px-3">
                          <h6 className="modal-title font-monospace small">Line Adjustment Explanation</h6>
                          <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setModalOpen(false)} />
                        </div>
                        <div className="modal-body p-3">
                          <textarea className="form-control shadow-none border-light-subtle small" rows={4} placeholder="State correction parameters..." value={localDrugs[activeDrugIndex]?.denialreason || ""} onChange={(e) => {
                            const updated = [...localDrugs]; updated[activeDrugIndex] = { ...updated[activeDrugIndex], denialreason: e.target.value }; setLocalDrugs(updated);
                          }} />
                        </div>
                        <div className="modal-footer border-0 pt-0"><button type="button" className="btn btn-sm btn-primary w-100 fw-bold" onClick={() => setModalOpen(false)}>Save Note</button></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="row g-3 border-top pt-4">
                  <div className="col-md-9">
                    <label className="form-label small fw-bold text-danger">Adjudication Discrepancy & Rejection Notes</label>
                    <textarea className="form-control border-light-subtle shadow-none small" rows={2} placeholder="State overarching reasons if rejecting files..." value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <button type="button" className="btn btn-outline-danger w-100 py-2.5 font-monospace fw-bold text-xs" disabled={!reason.trim()} onClick={() => {
                      if (window.confirm("Execute BULK OVERRIDE denial?")) {
                        setLocalDrugs(localDrugs.map(d => ({ ...d, qty: 0, period: 0, total: 0, denialreason: "Bulk Denied" })));
                        setDeniedAll(true); setStatus("denied");
                      }
                    }}>BULK REJECT</button>
                  </div>

                  <div className="col-md-6 mt-4">
                    <label className="form-label small fw-bold text-secondary">Insurance Clearance Token Auth Code</label>
                    <input type="text" className="form-control border-2 border-primary fw-bold text-primary font-monospace text-center py-1.5 shadow-none" placeholder="51/PHIS/XXXXXX/STAFF" value={authCode} onChange={(e) => setAuthCode(e.target.value)} />
                  </div>
                  <div className="col-md-6 mt-4">
                    <label className="form-label small fw-bold text-secondary">Operational Queue Action Verdict</label>
                    <select className="form-select border-2 fw-bold text-dark py-1.5 shadow-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <button className="btn btn-success btn-lg px-5 rounded-pill shadow-sm fw-bold border-0 bg-success bg-gradient" type="button" onClick={handleSendAuthorization} disabled={status === "approved" && !authCode.trim()}>
                    <i className="bi bi-send-check-fill me-2"></i> Send Authorization
                  </button>
                </div>
              </div>
            </div>
        
        
      )}

      {initialId && showSuccessModall && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 p-4 text-center rounded-3 shadow-lg">
              <div className="text-success display-4 mb-2"><i className="bi bi-check-circle-fill"></i></div>
              <h5 className="fw-bold text-dark">Adjudication Transferred</h5>
              <p className="text-muted small mb-0 px-1">The transaction state updates have been saved to Supabase completely. This entry is cleared from your active queue table lists.</p>
              <button className="btn btn-primary w-100 fw-bold mt-4 py-2" onClick={() => { setShowSuccessModall(false); if (onDone) onDone(); }}>Return to Ingest Queue Table</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

  

