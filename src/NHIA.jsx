import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import Nhiasearch from "./Nhiasearch";
import Claimsnhia from "./Claimsnhia";
import NhiaAuthorization from "./NhiaAuthorization";
import NhiaApprovals from "./NhiaApprovals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ⚡ Initialize a reusable query tracker engine instance outside the component scope
const queryClient = new QueryClient();




//import "bootstrap/dist/css/bootstrap.min.css";

export default function NHIA() {
  const [activeSection, setActiveSection] = useState("overview");
  const [showProviderdetails, setShowProviderdetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
 const [showModal, setShowModal] = useState(false);  
  
  // App state for interactive tracking
  const [requestCount, setRequestCount] = useState(5);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("success");

  // Mock initial dataset for interactive claims processing
  const [claims, setClaims] = useState([
    { id: "CLM-2026-081", hospital: "City General Hospital", patient: "Abiodun Bello", diagnosis: "Malaria severe", amount: 45000, status: "Pending", date: "2026-08-10" },
    { id: "CLM-2026-082", hospital: "St. Mary Medical Center", patient: "Chidi Okafor", diagnosis: "Hypertension management", amount: 120000, status: "Pending", date: "2026-08-11" },
    { id: "CLM-2026-083", hospital: "Grace Clinic", patient: "Amina Yusuf", diagnosis: "Antenatal care batch", amount: 35000, status: "Approved", date: "2026-08-09" },
    { id: "CLM-2026-084", hospital: "City General Hospital", patient: "Tunde Bakare", diagnosis: "Appendectomy surgical", amount: 310000, status: "Pending", date: "2026-08-11" },
    { id: "CLM-2026-085", hospital: "Apex Diagnostics", patient: "Fatima Umar", diagnosis: "Lab panels scan", amount: 18500, status: "Denied", date: "2026-08-08" },
    { id: "CLM-2026-086", hospital: "Grand Care Specialist", patient: "Emeka Obi", diagnosis: "Type 2 Diabetes review", amount: 62000, status: "Pending", date: "2026-08-11" },
    { id: "CLM-2026-087", hospital: "Sacred Heart Infirmary", patient: "Yetunde Adebayo", diagnosis: "Acute Bronchitis treatment", amount: 27500, status: "Pending", date: "2026-08-10" }
  ]);

  // Mock registered providers data state
  const [hospitals, setHospitals] = useState([
    { id: "HSP-001", name: "City General Hospital", code: "NHIA-LAG-042", tier: "Primary & Secondary", claimsCount: 142, status: "Active" },
    { id: "HSP-002", name: "St. Mary Medical Center", code: "NHIA-LAG-109", tier: "Secondary Tertiary", claimsCount: 89, status: "Active" },
    { id: "HSP-003", name: "Grace Clinic", code: "NHIA-LAG-211", tier: "Primary Only", claimsCount: 54, status: "Active" }
  ]);

  // Form states for adding new provider profiles
  const [newHospital, setNewHospital] = useState({ hospname: "", nhiacode: "", tier: "Primary Only" });

  // Reconciliation audit state tracking
  const [reconciliationLog, setReconciliationLog] = useState([
    { batchId: "REC-AUG-01", expected: 1250000, actual: 1250000, discrepancy: 0, status: "Matched" },
    { batchId: "REC-AUG-02", expected: 840000, actual: 815000, discrepancy: 25000, status: "Flagged Mismatch" },
    { batchId: "REC-AUG-03", expected: 410000, actual: 410000, discrepancy: 0, status: "Matched" }
  ]);

  // Claims filtering state
  const [claimsFilter, setClaimsFilter] = useState("All");
   // Global Dynamic Database State Layer (Synchronized live with Supabase)
 // const [claims, setClaims] = useState([]);
 // const [isClaimsLoading, setIsClaimsLoading] = useState(true);



  
  // Interaction handlers
  const handleAdjudicate = (claimId, decision) => {
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        return { ...c, status: decision };   // spread update the object with status decision
      }
      return c;
    }));
    
    if (decision === "Approved" || decision === "Denied") {
      setRequestCount(prev => Math.max(0, prev - 1));
    }

    setAlertType(decision === "Approved" ? "success" : "danger");
    setAlertMessage(`Claim ${claimId} has been successfully ${decision.toLowerCase()}.`);
    
    // Automatically fade out notification banner after 4 seconds
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  const handleRegisterHospital = async (e) => {
  e.preventDefault();

  if (isSubmitting) return; // 👈 prevent double submit
  setIsSubmitting(true);

  if (!newHospital.hospname || !newHospital.nhiacode) {
    setAlertType("warning");
    setAlertMessage("Please provide a valid facility name and official provider registration code.");
      setIsSubmitting(false);
    return;
  }

  const { data, error } = await supabase.functions.invoke("registernhia", {
    body: {
      action: "register",
      hospname: newHospital.hospname,
      nhiacode: newHospital.nhiacode,
      tier: newHospital.tier,
    },
  });

  if (error) {
    setAlertType("danger");
    setAlertMessage("server error");
    setIsSubmitting(false);
  } else {
    setHospitals([...hospitals, newHospital]); // local update for immediate UI
    setNewHospital({ hospname: "", nhiacode: "", tier: "Primary Only" });
    setAlertType("success");
    setAlertMessage(`Medical Provider "${newHospital.hospname}" was successfully registered to the NHIA network.`);
     setIsSubmitting(false);
    setTimeout(() => setAlertMessage(null), 4000);
  }
};


  const handleClearDiscrepancy = (batchId) => {
    setReconciliationLog(prev => prev.map(log => {
      if (log.batchId === batchId) {
        return { ...log, actual: log.expected, discrepancy: 0, status: "Matched" };
      }
      return log;
    }));
    setAlertType("success");
    setAlertMessage(`Discrepancy for batch ledger ${batchId} cleared successfully via manual adjustments.`);
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  // Calculations for dynamic dashboard indicators
  const totalClaimsAmount = claims.reduce((sum, item) => sum + item.amount, 0);
  const pendingClaimsCount = claims.filter(c => c.status === "Pending").length;
  const approvedClaimsTotal = claims.filter(c => c.status === "Approved").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="container-fluid p-0 bg-light min-vh-100 font-sans" style={{ overflowX: "hidden" }}>
      <div className="row g-0">
        
        {/* Navigation Sidebar Component */}
        <div className="col-12 col-md-3 col-lg-2 bg-dark text-white p-3 d-flex flex-column min-vh-md-100 shadow-lg">
          <div className="d-flex align-items-center mb-4 px-2 py-3 border-bottom border-secondary">
            <div className="bg-primary rounded p-2 me-2 d-flex align-items-center justify-content-center">
              <span className="fw-bold text-white fs-4 lh-1">N</span>
            </div>
            <div>
              <h5 className="fw-bold m-0 tracking-tight text-white">NHIA Admin</h5>
            </div>
          </div>

          <p className="text-uppercase text-secondary fw-bold px-2 mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
            Core Operations
          </p>

          <nav className="nav flex-column nav-pills mb-auto">
            <button 
              className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded transition-all ${activeSection === "overview" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
              onClick={() => setActiveSection("overview")}
            >
              <span className="me-2">&#128187;</span> Dashboard Overview
            </button>
            <button 
              className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded position-relative transition-all ${activeSection === "claims" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
              onClick={() => setActiveSection("claims")}
            >
              <span className="me-2">&#128196;</span> Claims Management
         
            </button>
            
<button 
  className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded transition-all ${activeSection === "authorization" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
  onClick={() => setActiveSection("authorization")}
>
  <span className="me-2">🔐</span> Authorization Center
</button>

            
            <button 
              className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded transition-all ${activeSection === "approvals" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
              onClick={() => setActiveSection("approvals")}
            >
              <span className="me-2">&#9989;</span> Executive Approvals
            </button>

            <p className="text-uppercase text-secondary fw-bold px-2 mt-4 mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
              Providers & Fundings
            </p>

            <button 
              className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded transition-all ${activeSection === "register" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
              onClick={() => setActiveSection("register")}
            >
              <span className="me-2">&#127973;</span> Provider Directories
            </button>
           
           
           
           
            <button 
              className={`nav-link text-start mb-2 px-3 py-2 border-0 d-flex align-items-center rounded transition-all ${activeSection === "payments" ? "bg-primary text-white shadow" : "bg-transparent text-light opacity-75"}`}
              onClick={() => setActiveSection("payments")}
            >
              <span className="me-2">&#128179;</span> Disbursal Payments
            </button>
          </nav>

          <div className="mt-4 pt-3 border-top border-secondary px-2">
            <div className="d-flex align-items-center">
              <div className="rounded-circle bg-secondary p-2 me-2 text-center" style={{ width: "35px", height: "35px", lineHeight: "1" }}>
                🛡️
              </div>
              <div className="overflow-hidden">
                <p className="small mb-0 text-truncate fw-bold">Admin Officer</p>
                <span className="text-secondary d-block text-truncate" style={{ fontSize: "0.75rem" }}>adjudication@nhia.gov</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Main Workspace Container */}
        <div className="col-12 col-md-9 col-lg-10 p-4">
          
          {/* Top Operational Command Bar */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom pb-3 mb-4 gap-3">
            <div>
              <nav aria-label="breadcrumb" className="d-none d-sm-block">
                <ol className="breadcrumb mb-1 text-uppercase fw-semibold tracking-wider" style={{ fontSize: "0.75rem" }}>
                  <li className="breadcrumb-item text-muted">National Portal</li>
                  <li className="breadcrumb-item text-primary active">{activeSection}</li>
                </ol>
              </nav>
              <h3 className="fw-black text-dark m-0 d-flex align-items-center">
                NHIA Gateway Adjudication Desk
              </h3>
            </div>
            
            {/* Action quick toggle framework */}
            <div className="d-flex align-items-center gap-2">
              <label className="fw-bold text-muted small text-nowrap d-md-none">View Section:</label>
              <select 
                className="form-select w-auto d-md-none border-secondary shadow-sm" 
                value={activeSection} 
                onChange={(e) => setActiveSection(e.target.value)}
              >
                <option value="overview">Dashboard Overview</option>
                <option value="claims">Claims Management</option>
                <option value="reconciliation">Reconciliation Audit</option>
                <option value="register">Provider Directories</option>
                <option value="payments">Disbursal Payments</option>
                <option value="approvals">Executive Approvals</option>
              </select>
              
              <div className="bg-white px-3 py-2 rounded border shadow-sm text-end d-none d-sm-block">
                <small className="text-muted d-block fw-semibold" style={{ fontSize: "0.7rem" }}>ACTIVE AUDIT METRIC</small>
                <span className="badge bg-danger rounded-pill px-2.5 py-1.5 fw-bold">
                  {pendingClaimsCount} Actions Required
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Event Notification Banners */}
          {alertMessage && (
            <div className={`alert alert-${alertType} alert-dismissible shadow border-0 fade show mb-4 p-3 d-flex align-items-center`} role="alert">
              <strong className="me-2">💡 System Notification:</strong> {alertMessage}
              <button type="button" className="btn-close ms-auto p-3 bg-transparent border-0" onClick={() => setAlertMessage(null)} aria-label="Close"></button>
            </div>
          )}

          {/* Conditional Workflow Component Rendering Engine */}
          
          {/* VIEW: OVERVIEW METRIC COMPONENT */}
          {activeSection === "overview" && (
            <div>
              {/* Executive Analytic Cards Matrix */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 shadow-sm rounded p-3 bg-white h-100 border-start border-primary border-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Queue Backlog</span>
                        <h3 className="fw-black text-dark m-0">{pendingClaimsCount} Claims</h3>
                      </div>
                      <span className="fs-3 text-primary opacity-50">&#128195;</span>
                    </div>
                    <div className="mt-3 pt-2 border-top border-light">
                      <span className="text-warning small fw-semibold">⚠️ Requires fast-track review</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 shadow-sm rounded p-3 bg-white h-100 border-start border-success border-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Settled Disbursals</span>
                        <h3 className="fw-black text-dark m-0">₦{(approvedClaimsTotal).toLocaleString()}</h3>
                      </div>
                      <span className="fs-3 text-success opacity-50">&#128178;</span>
                    </div>
                    <div className="mt-3 pt-2 border-top border-light">
                      <span className="text-success small fw-semibold">✓ Ready for banking settlement</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 shadow-sm rounded p-3 bg-white h-100 border-start border-info border-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Network Providers</span>
                        <h3 className="fw-black text-dark m-0">{hospitals.length} Registered</h3>
                      </div>
                      <span className="fs-3 text-info opacity-50">&#127973;</span>
                    </div>
                    <div className="mt-3 pt-2 border-top border-light">
                      <span className="text-muted small fw-semibold">100% credential status validated</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 shadow-sm rounded p-3 bg-white h-100 border-start border-warning border-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Total Vault Pool</span>
                        <h3 className="fw-black text-dark m-0">₦{(totalClaimsAmount).toLocaleString()}</h3>
                      </div>
                      <span className="fs-3 text-warning opacity-50">&#128188;</span>
                    </div>
                    <div className="mt-3 pt-2 border-top border-light">
                      <span className="text-muted small fw-semibold">Aggregated network incoming logs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Information Panels */}
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm rounded p-4 bg-white mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h5 className="fw-bold text-dark m-0">Live Operational System Monitoring</h5>
                        <p className="text-muted small mb-0">System health, adjudication lines, and national health pool settlement metrics.</p>
                      </div>
                      <button className="btn btn-outline-primary btn-sm px-3 rounded fw-semibold" onClick={() => setActiveSection("claims")}>
                        Process Backlog
                      </button>
                    </div>

                    <div className="p-3 bg-light rounded border mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-dark">National Adjudication Pipeline Utilization</span>
                        <span className="small fw-bold text-primary">
                          {Math.round(((claims.filter(c => c.status !== "Pending").length) / claims.length) * 100)}% Complete
                        </span>
                      </div>
                      <div className="progress style-progress" style={{ height: "10px" }}>
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                          role="progressbar" 
                          style={{ width: `${((claims.filter(c => c.status !== "Pending").length) / claims.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 text-nowrap">
                        <thead className="table-light">
                          <tr style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                            <th>Claim ID</th>
                            <th>Medical Facility</th>
                            <th>Assigned Patient</th>
                            <th>Total Amount</th>
                            <th>System Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.slice(0, 4).map((claim) => (
                            <tr key={claim.id} style={{ fontSize: "0.9rem" }}>
                              <td className="fw-bold text-primary">{claim.id}</td>
                              <td className="fw-semibold text-dark">{claim.hospital}</td>
                              <td className="text-secondary">{claim.patient}</td>
                              <td className="fw-bold text-dark">₦{claim.amount.toLocaleString()}</td>
                              <td>
                                <span className={`badge px-2.5 py-1.5 rounded-pill ${
                                  claim.status === "Approved" ? "bg-success-subtle text-success border border-success" :
                                  claim.status === "Denied" ? "bg-danger-subtle text-danger border border-danger" :
                                  "bg-warning-subtle text-warning border border-warning"
                                }`}>
                                  {claim.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm rounded p-4 bg-white h-100">
                    <h5 className="fw-bold text-dark mb-1">Facility Network Split</h5>
                    <p className="text-muted small mb-4">Total monitored hospital distributions across tiers.</p>
                    
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-semibold text-secondary">Primary Medical Facilities</span>
                          <span className="fw-bold text-dark">65%</span>
                        </div>
                        <div className="progress" style={{ height: "6px" }}>
                          <div className="progress-bar bg-info" style={{ width: "65%" }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-semibold text-secondary">Secondary Referral Centers</span>
                          <span className="fw-bold text-dark">25%</span>
                        </div>
                        <div className="progress" style={{ height: "6px" }}>
                          <div className="progress-bar bg-primary" style={{ width: "25%" }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-semibold text-secondary">Tertiary Research Hospitals</span>
                          <span className="fw-bold text-dark">10%</span>
                        </div>
                        <div className="progress" style={{ height: "6px" }}>
                          <div className="progress-bar bg-dark" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-light rounded text-center border">
                      <span className="text-muted small d-block">Integrated Live Sync Agent</span>
                      <strong className="text-success small fw-bold">● Connected to Supabase Engine</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CLAIMS MANAGEMENT COMPONENT */}
       {/* VIEW: CLAIMS MANAGEMENT COMPONENT */}
{/* VIEW: CLAIMS MANAGEMENT COMPONENT */}
{/* VIEW: CLAIMS MANAGEMENT COMPONENT */}
{activeSection === "claims" && (
  <Claimsnhia 
    onRequestProcessed={() => setRequestCount(prev => Math.max(0, prev - 1))}
  />
)}

{/* VIEW: AUTHORIZATION CENTER COMPONENT */}
{activeSection === "authorization" && (
  <NhiaAuthorization 
    onRequestProcessed={() => setRequestCount(prev => Math.max(0, prev - 1))}
    onAlertTriggered={(message, type) => {
      setAlertType(type);
      setAlertMessage(message);
      setTimeout(() => setAlertMessage(null), 4000);
    }}
  />
)}
{/* VIEW: PROVIDER DIRECTORIES (REGISTER COMPONENT) */} 
{activeSection === "register" && ( 
  <div> 
    
    {/* VIEW 1: Full Width Onboard Form (Hidden if directory table is active) */} 
    {!showProviderdetails && ( 
      <div> 
        <div className="d-flex justify-content-between align-items-center mb-1"> 
          <h5 className="fw-bold text-dark mb-0">Onboard New Provider</h5> 
          
          {/* View Switching Button */} 
          <button 
            type="button" 
            className="btn btn-sm btn-outline-primary px-3 fw-bold rounded shadow-sm" 
            onClick={() => setShowProviderdetails(true)} 
          > 
            📋 Switch to Provider Directory 
          </button> 
        </div> 
       <div className="container mt-4">
      <div className="card p-4 shadow-sm">
        <h5 className="card-title mb-3">NHIA Insurance Pool Management</h5>
        
        {/* Trigger paragraph provided by your instruction */}
        <p className="text-muted small mb-4">
          Instate registered clinical networks to handle authorized NHIA insurance pools{" "}
          <span
            style={{ cursor: "pointer", color: "#0d6efd", textDecoration: "underline" }}
            onClick={() => setShowModal(true)}
          >
            Search Provider
          </span>
        </p> 
        
        {/* Child modal component receiving state variables as props */}
        <Nhiasearch show={showModal} onClose={() => setShowModal(false)} />
      </div>
    </div>
       <form
      onSubmit={handleRegisterHospital}
      style={{ maxWidth: "600px" }}
      className="mx-auto my-3"
    >
     

      {/* Hospital Name */}
      <div className="mb-3">
        <label className="form-label small fw-bold text-secondary">
          Facility Care Center Name
        </label>
        <input
          type="text"
          className="form-control border-secondary shadow-sm"
          placeholder="Lafia Hospital"
          value={newHospital.hospname}
          onChange={(e) =>
            setNewHospital({ ...newHospital, hospname: e.target.value })
          }
          required
        />
      </div>

      {/* NHIA Code */}
      <div className="mb-3">
        <label className="form-label small fw-bold text-secondary">
          Unique Provider NHIA Code
        </label>
        <input
          type="text"
          className="form-control border-secondary shadow-sm font-monospace"
          placeholder="NHIA-LAG-XXXX"
          value={newHospital.nhiacode}
          onChange={(e) =>
            setNewHospital({ ...newHospital, nhiacode: e.target.value })
          }
          required
        />
      </div>

      {/* Tier */}
      <div className="mb-4">
        <label className="form-label small fw-bold text-secondary">
          Institutional Care Tier
        </label>
        <select
          className="form-select border-secondary shadow-sm"
          value={newHospital.tier}
          onChange={(e) =>
            setNewHospital({ ...newHospital, tier: e.target.value })
          }
          required
        >
          <option value="Primary Only">Primary Only Tier</option>
          <option value="Primary & Secondary">Primary & Secondary Tier</option>
          <option value="Secondary Tertiary">Secondary & Tertiary Tier</option>
        </select>
      </div>

      <button
        type="submit"
        disabled = {isSubmitting}
        className="btn btn-primary w-100 fw-bold py-2 shadow border-0 rounded"
      >
    {isSubmitting ? "Registering..." : "Add Provider Portfolio"}     </button>
    
    </form>
      </div> 
    )} 

    {/* VIEW 2: Full Width Directory Table (Hidden if onboard form is active) */} 
    {showProviderdetails && ( 
      <div> 
        <div className="d-flex justify-content-between align-items-center mb-1"> 
          <h5 className="fw-bold text-dark mb-0">Monitored Institutional Network Accounts</h5> 
          
          {/* View Switching Button */} 
          <button 
            type="button" 
            className="btn btn-sm btn-outline-success px-3 fw-bold rounded shadow-sm" 
            onClick={() => setShowProviderdetails(false)} 
          > 
            ➕ Open Registration Form 
          </button> 
        </div> 
        <p className="text-muted small mb-4">Active and authenticated clinical centers licensed to capture citizen claims arrays.</p> 
        
        <div className="table-responsive"> 
          <table className="table table-hover align-middle mb-0 text-nowrap"> 
            <thead className="table-light"> 
              <tr style={{ fontSize: "0.8rem", textTransform: "uppercase" }}> 
                <th>ID Reference</th> <th>Hospital Center</th> <th>NHIA Network Code</th> <th>Operational Tier</th> <th>Aggregated Claims</th> <th>System Status</th> 
              </tr> 
            </thead> 
            <tbody> 
              {hospitals.map((hosp) => ( 
                <tr key={hosp.id} style={{ fontSize: "0.9rem" }}> 
                  <td className="text-muted font-monospace">{hosp.id}</td> 
                  <td className="fw-bold text-dark">{hosp.name}</td> 
                  <td><code className="text-primary font-monospace bg-light p-1 px-2 rounded border">{hosp.code}</code></td> 
                  <td><span className="small text-secondary fw-semibold">{hosp.tier}</span></td> 
                  <td className="fw-bold text-dark text-center">{hosp.claimsCount}</td> 
                  <td><span className="badge bg-success rounded-pill px-2.5 py-1">Active Sync</span></td> 
                </tr> 
              ))} 
            </tbody> 
          </table> 
        </div> 
      </div> 
    )} 

  </div> 
)}


          {/* VIEW: DISBURSAL PAYMENTS COMPONENT */}
          {activeSection === "payments" && (
            <div className="card border-0 shadow-sm rounded p-4 bg-white">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                  <h5 className="fw-bold text-dark m-0">Financial Settlement & Disbursal Logs</h5>
                  <p className="text-muted small mb-0">Track treasury settlement release cycles and bank clearance schedules.</p>
                </div>
                <button 
                  className="btn btn-dark btn-sm px-3 py-2 rounded fw-bold border-0 shadow-sm"
                  onClick={() => {
                    setAlertType("info");
                    setAlertMessage("Export pipeline compiled. CSV metadata dispatched to central bank treasury.");
                  }}
                >
                  📥 Export Disbursal Ledger
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>
                      <th>Reference Code</th>
                      <th>Target Institution</th>
                      <th>Authorized Settlement Amount</th>
                      <th>Valuation Window</th>
                      <th>Disbursal Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.filter(c => c.status === "Approved").length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted fw-semibold">
                          No approved claims are currently pending settlement clearance inside the active cycle pool.
                        </td>
                      </tr>
                    ) : (
                      claims.filter(c => c.status === "Approved").map((claim, index) => (
                        <tr key={index} style={{ fontSize: "0.9rem" }}>
                          <td className="font-monospace text-uppercase fw-bold text-secondary">TXN-0826-{index + 104}</td>
                          <td className="fw-semibold text-dark">{claim.hospital}</td>
                          <td className="fw-bold text-success">₦{claim.amount.toLocaleString()}</td>
                          <td className="text-muted">August 2026 Cycle</td>
                          <td>
                            <span className="badge bg-success-subtle text-success border border-success px-2.5 py-1.5 rounded">
                              Authorized / Cleared
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: EXECUTIVE APPROVALS COMPONENT */}
          {/* VIEW: EXECUTIVE APPROVALS COMPONENT */}
{activeSection === "approvals" && <NhiaApprovals />}

        </div>
      </div>
    </div>
  );
}
