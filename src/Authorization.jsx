import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Authorization() {
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
const [selectedDrugs, setSelectedDrugs] = useState([]);
const [drugsOptions, setDrugsOptions] = useState([]);

const [authCode, setAuthCode] = useState("");
const [showPasswordInput, setShowPasswordInput] = useState(false);
const [password, setPassword] = useState("");
const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
const [saving, setSaving] = useState(false);
const [showSuccessModal, setShowSuccessModal] = useState(false);


function resetAuthorizationForm() {
  setSelectedServices([]);
  setSelectedDrugs([]);
  setAuthCode("");
  setSelectedResult(null);
  setSelectedDiag("");
}


const handleSaveAuthorization = async () => {
  setSaving(true);

  const allItems = [
    ...selectedServices.map(s => s.name),
    ...selectedDrugs.map(d => d.name)
  ];

  const rows = allItems.map(item => ({
    date: new Date().toISOString(),
    authcode: authCode,
    provider: selectedResult?.provider,
    enrolleename: selectedResult?.enrolleename,
    policyid: selectedResult?.policyid,
    plan: selectedResult?.plan,
    client: selectedResult?.client,
    gender: selectedResult?.gender,
    diagnosis: selectedDiag,
    services: item
  }));

  const { error } = await supabase
    .from("authtable")
    .insert(rows);

  if (error) {
    console.error("Error saving authorization:", error.message);
  } else {
    // ✅ Show success modal
    setShowSuccessModal(true);

    // ✅ Clear services, drugs, and card
   // ✅ Clear all fields
    resetAuthorizationForm();
  }

  setSaving(false);
};




const passwordMap = {
  "267789": "tolu",
  "468767": "damilola",
  "345625": "funmi"
};


const handleGenerateAuthClick = () => {
  setShowPasswordInput(true); // show password input box
};

const handleSubmitPassword = () => {
  if (passwordMap[password]) {
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    setAuthCode(`51/PHIS/${randomSix}/${passwordMap[password]}`);
    setShowPasswordInput(false);
    setPassword("");
  } else {
    setShowUnauthorizedModal(true); // show modal if password invalid
    setShowPasswordInput(false);
    setPassword("");
  }
};


<div className="mt-4 text-center">
  <button className="btn btn-primary" onClick={handleGenerateAuthClick}>
    Request Access
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
    <button className="btn btn-success" onClick={handleSubmitPassword}>
      Generate
    </button>
  </div>
)}



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

  // Fetch enrolments
  useEffect(() => {
    const fetchEnrolments = async () => {
      if (!selectedClient) return;
      const { data, error } = await supabase
        .from("myenrolment")
        .select("*")
        .eq("client", selectedClient);
      if (error) console.error("Error fetching enrolments:", error.message);
      else setEnrolments(data);
    };
    fetchEnrolments();
  }, [selectedClient]);

  // Live search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredResults([]);
      setSelectedResult(null);
      return;
    }
    const results = enrolments.filter(
      (e) =>
        e.policyid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.enrolleename.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredResults(results);
  }, [searchTerm, enrolments]);

  
  
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
    if (!selectedService || !selectedClient) {
      setCoverageStatus(null); // clear only if no service/client
      return;
    }

    const exists = servicesOptions.includes(selectedService);

    if (exists) {
      const clientColumn = selectedClient.toLowerCase(); // normalize column name

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
}, [selectedService, selectedClient]);

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
    <div className="card p-4 shadow-sm">
      <h5 className="mb-4">Authorization</h5>

      {/* Row 1: Client + Search */}
      <div className="row mb-4">
        <div className="col-md-6">
          <label className="form-label">Select Client</label>
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
                  filteredResults.find((r) => r.policyid === e.target.value)
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
        <div className="row justify-content-center mb-4">
          <div className="col-md-8">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-gradient bg-primary text-white">
                <h6 className="mb-0">
                  <i className="bi bi-person-badge me-2"></i> Enrollee Details
                </h6>
              </div>
              <div className="card-body bg-light">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-secondary">
                      Enrollee Name
                    </label>
                    <input
                      type="text"
                      className="form-control border-info"
                      value={selectedResult.enrolleename}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-secondary">
                      Policy ID
                    </label>
                    <input
                      type="text"
                      className="form-control border-info"
                      value={selectedResult.policyid}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-secondary">
                      Client
                    </label>
                    <input
                      type="text"
                      className="form-control border-info"
                      value={selectedResult.client}
                      readOnly
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-secondary">
                      Gender
                    </label>
                    <input
                      type="text"
                      className="form-control border-info"
                      value={selectedResult.gender}
                      readOnly
                    />
                  </div>
                </div>
                <hr />
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary">
                    Plan
                  </label>
                  <input
                    type="text"
                    className="form-control border-info"
                    value={selectedResult.plan}
                    readOnly
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary">
                    Provider
                  </label>
                  <input
                    type="text"
                    className="form-control border-info"
                    value={selectedResult.provider}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 4: Diagnosis */}
      {selectedResult && (
        <div className="row">
          <div className="col-12 mb-3 position-relative">
            <label className="form-label">Selected Diagnoses</label>
            <input
              type="text"
              className="form-control"
              placeholder="Selected diagnoses will appear here"
              value={selectedDiag}
              onChange={(e) => setSelectedDiag(e.target.value)}
            />
          </div>

         

           <div className="col-12 mb-3 position-relative">
            <label className="form-label">Search Diagnosis (ICD-10-CM)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Start typing diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />

            {diagnosisOptions.length > 0 && (
              <ul
                className="list-group position-absolute w-100"
                style={{ zIndex: 1000 }}
              >
                {diagnosisOptions.map((diag, idx) => (
                  <li
                    key={idx}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const newValue = selectedDiag
                        ? `${selectedDiag}, ${diag.name}`
                        : diag.name;
                      setSelectedDiag(newValue);
                      setDiagnosisOptions([]);
                      setDiagnosis("");
                    }}
                  >
                    {diag.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

     
{showSuccessModal && (
  <>
    {/* Backdrop */}
    <div className="modal-backdrop fade show"></div>

    {/* Modal */}
    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">Success</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowSuccessModal(false)}
            ></button>
          </div>
          <div className="modal-body">
            <p>Auth codes have been saved successfully.</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
)}






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


{coverageStatus && (
  <div className="mt-2">
    {coverageStatus === "yes" ? (
      <div>
        <span className="text-success me-2">✅ Covered</span>
        <button className="btn btn-success me-2" onClick={handleApprove}>Approve</button>
      </div>
    ) : (
      <div>
        <span className="text-danger me-2">❌ Not Covered</span>
        <button className="btn btn-warning me-2" onClick={handleWaive}>Waive</button>
        <button className="btn btn-danger" onClick={handleDeny}>Deny</button>
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
      <button className="btn btn-success me-2" onClick={handleApproveDrug}>Approve</button>
      <button className="btn btn-warning me-2" onClick={handleWaiveDrug}>Waive</button>
      <button className="btn btn-danger" onClick={handleDenyDrug}>Deny</button>
    </div>
  )}
</div>



{(selectedServices.length > 0 || selectedDrugs.length > 0) && (
  <div className="d-flex justify-content-center mt-4">
    <div className="card shadow-lg" style={{ width: "35rem" }}> {/* wider and prettier */}
      <div className="card-body">

        {/* Services Section */}
        {selectedServices.length > 0 && (
          <>
            <h5 className="mb-3 text-primary">Services</h5>
            {selectedServices.map((service, index) => (
              <div key={`service-${index}`} className="d-flex align-items-center mb-2">
                <input
                  type="text"
                  className="form-control me-2"
                  value={`${service.name} (${service.action})`}
                  readOnly
                />
                <button
                  className="btn-close"
                  onClick={() =>
                    setSelectedServices(prev =>
                      prev.filter((_, i) => i !== index)
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
              <div key={`drug-${index}`} className="d-flex align-items-center mb-2">
                <input
                  type="text"
                  className="form-control me-2"
                  value={`${drug.name} (${drug.action})`}
                  readOnly
                />
                <button
                  className="btn-close"
                  onClick={() =>
                    setSelectedDrugs(prev =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                ></button>
              </div>
            ))}
          </>
        )}

     <div className="mt-4 text-center">
  <button className="btn btn-primary" onClick={handleGenerateAuthClick}>
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
    <button className="btn btn-success" onClick={handleSubmitPassword}>
      Submit
    </button>
  </div>
)}


       
       {showUnauthorizedModal && (
  <div className="modal fade show d-block" tabIndex="-1" role="dialog">
    <div className="modal-dialog" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title text-danger">Unauthorized</h5>
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


       
       
        {/* Bootstrap Alert Box for Auth Code */}
      {authCode && (
  <div className="alert alert-info alert-dismissible fade show mt-3" role="alert">
    <strong>Auth Code:</strong> {authCode}
    <button
      type="button"
      className="btn-close"
      onClick={() => setAuthCode("")}
    ></button>
  </div>
)}

 <div className="mt-4 text-center">
  <button
    className="btn btn-success"
    onClick={handleSaveAuthorization}
    disabled={saving || !authCode}
  >
    {saving ? "Saving..." : "Save Authorization"}
  </button>
</div>

     
      </div>
    </div>
  </div>
)}




    </div>
  );
}
