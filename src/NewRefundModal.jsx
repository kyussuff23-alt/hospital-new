import React, { useState } from "react";
import { supabase } from "./supabaseClient";

// Password object for auth code generation
const passwordMap = {
  "267789": "tolu",
  "468767": "damilola",
  "345625": "peace",
  "567844": "rukayat",
  "345623": "toyin"
};

// Allowed keys to unlock the approved amount input field
const approvalUnlockCodes = ["678897", "345765", "356908"];

export default function NewRefundModal({ isOpen, onClose, fetchData }) {
  // Main Form States
  const [formData, setFormData] = useState({
    policyid: "",
    enrolleename: "",
    plan: "",
    client: "",
    gender: "",
    diagnosis: "",
    provider: "",
    reason: "",
    authcode: "",
    requestamount: "",
    approvedamount: "0.00",
    encounter_date: ""
  });

  // UI Processing States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Nested Auth Code Password Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [authModalError, setAuthModalError] = useState("");

  // Nested Approved Amount Unlock Modal States
  const [isAmountUnlocked, setIsAmountUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockModalError, setUnlockModalError] = useState("");

  if (!isOpen) return null;

  // Handle generic input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "provider" ? value.toUpperCase() : value
    }));
  };
  // Verify/Search Policy ID from myenrolment table
  const handleVerifyPolicy = async () => {
    if (!formData.policyid.trim()) {
      setFormError("Please enter a Policy ID to verify.");
      return;
    }

    setIsVerifying(true);
    setFormError("");
    setFormSuccess("");

    try {
      const { data, error } = await supabase
        .from("myenrolment")
        .select("enrolleename, plan, client, gender")
        .eq("policyid", formData.policyid.trim())
        .single();

      if (error) throw error;

      if (data) {
        setFormData((prev) => ({
          ...prev,
          enrolleename: data.enrolleename || "",
          plan: data.plan || "",
          client: data.client || "",
          gender: data.gender || ""
        }));
        setFormSuccess("Policy profile linked successfully!");
      } else {
        setFormError("No enrolment profile found for this Policy ID.");
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to fetch policy record.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Triggered when typing or interacting with the Auth Code field
  const handlegenerateauth = () => {
    setAuthModalError("");
    setInputPassword("");
    setShowAuthModal(true);
  };

  // Verify digital password and compute generated code
  const handleVerifyPasswordAndGenerate = (e) => {
    e.preventDefault();
    const digitalPassword = inputPassword.trim();

    if (passwordMap[digitalPassword]) {
      const randomSix = Math.floor(100000 + Math.random() * 900000);
      const generatedCode = `51/PHIS/${randomSix}/${passwordMap[digitalPassword]}`;
      
      setFormData((prev) => ({ ...prev, authcode: generatedCode }));
      setShowAuthModal(false);
      setAuthModalError("");
    } else {
      setAuthModalError("Invalid digital authorization password key.");
    }
  };

  // Triggered when clicking the locked Approved Amount field
  const handleRequestUnlockAmount = () => {
    if (isAmountUnlocked) return;
    setUnlockModalError("");
    setUnlockPassword("");
    setShowUnlockModal(true);
  };

  // Verify the key code to allow access to Approved Amount field modifications
  const handleVerifyUnlockAmount = (e) => {
    e.preventDefault();
    if (approvalUnlockCodes.includes(unlockPassword.trim())) {
      setIsAmountUnlocked(true);
      setShowUnlockModal(false);
      setUnlockModalError("");
    } else {
      setUnlockModalError("Unauthorized entry password code.");
    }
  };

  // Submit to refunds table
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.policyid || !formData.enrolleename || !formData.requestamount) {
      setFormError("Please verify Policy ID and fill in all mandatory fields.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const { error } = await supabase.from("refunds").insert([
        {
          policyid: formData.policyid,
          enrolleename: formData.enrolleename,
          plan: formData.plan || null,
          client: formData.client || null,
          gender: formData.gender || null,
          diagnosis: formData.diagnosis || null,
          provider: formData.provider || null,
          reason: formData.reason || null,
          authcode: formData.authcode || null,
          requestamount: parseFloat(formData.requestamount),
          approvedamount: formData.approvedamount ? parseFloat(formData.approvedamount) : 0.00,
          encounter_date: formData.encounter_date || null
        }
      ]);

      if (error) throw error;

      if (fetchData) await fetchData();
      onClose();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "An error occurred while saving the profile entry.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {/* Main Refund Request Modal */}
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content text-dark" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-primary">
                <i className="bi bi-file-earmark-plus me-2"></i>New Refund Form
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={isSubmitting}></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger small py-2">{formError}</div>}
                {formSuccess && <div className="alert alert-success small py-2">{formSuccess}</div>}

                {/* Section: Fetch Profile */}
                <div className="row g-3 mb-3 align-items-end">
                  <div className="col-md-8">
                    <label className="form-label small fw-semibold">Policy ID *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="policyid"
                      value={formData.policyid}
                      onChange={handleInputChange}
                      placeholder="Enter policy ID to link profile"
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="button"
                      className="btn btn-dark btn-sm w-100"
                      onClick={handleVerifyPolicy}
                      disabled={isVerifying}
                    >
                      {isVerifying ? "Verifying..." : "Verify / Search"}
                    </button>
                  </div>
                </div>

                {/* Section: Auto-filled Fields */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Enrollee Name </label>
                    <input type="text"  className="form-control form-control-sm bg-light" value={formData.enrolleename} readOnly required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Plan </label>
                    <input type="text" required className="form-control form-control-sm bg-light" value={formData.plan} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Client</label>
                    <input type="text" required className="form-control form-control-sm bg-light" value={formData.client} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Gender</label>
                    <input type="text" required className="form-control form-control-sm bg-light" value={formData.gender} readOnly />
                  </div>
                </div>

                <hr />

                {/* Section: Writable Fields */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Provider</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="provider"
                      required
                      value={formData.provider}
                      onChange={handleInputChange}
                      placeholder="HOSPITAL NAME"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Encounter Date</label>
                    <input
                      type="date"
                      required
                      className="form-control form-control-sm"
                      name="encounter_date"
                      value={formData.encounter_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Diagnosis</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="diagnosis"
                      value={formData.diagnosis}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Reason for Refund Request</label>
                    <textarea
                      className="form-control form-control-sm"
                      name="reason"
                      required
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows="2"
                    ></textarea>
                  </div>
                </div>

                {/* Section: Money & Auth */}
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Request Amount *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="form-control form-control-sm"
                      name="requestamount"
                      value={formData.requestamount}
                      onChange={handleInputChange}
                    
                    />
                  </div>
                  
                  {/* Secure Approved Payout Amount Field Input */}
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Approved Amount {!isAmountUnlocked && <i className="bi bi-lock-fill text-danger small ms-1"></i>}
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className={`form-control form-control-sm ${!isAmountUnlocked ? "border-danger bg-light text-muted cursor-pointer" : "border-success fw-bold"}`}
                      name="approvedamount"
                      value={formData.approvedamount}
                      onChange={handleInputChange}
                      onClick={handleRequestUnlockAmount}
                      readOnly={!isAmountUnlocked}
                      placeholder={!isAmountUnlocked ? "Click to unlock field" : "0.00"}
                      title={!isAmountUnlocked ? "Authorized audit override verification required to modify this field" : ""}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Auth Code</label>
                    <input
                      type="text"
                      className="form-control form-control-sm border-primary bg-light-subtle"
                      name="authcode"
                      value={formData.authcode}
                      onChange={handlegenerateauth}
                      onClick={handlegenerateauth}
                      placeholder="Click/type to generate code"
                      readOnly
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Refund Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* Nested Password Verification Modal (Auth Code Generation) */}
      {showAuthModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-primary shadow">
              <div className="modal-header bg-primary text-white py-2">
                <h6 className="modal-title fw-bold m-0">Authorization Key</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAuthModal(false)}></button>
              </div>
              <form onSubmit={handleVerifyPasswordAndGenerate}>
                <div className="modal-body py-3">
                  {authModalError && <div className="alert alert-danger small p-1 mb-2 text-center">{authModalError}</div>}
                  <label className="form-label small fw-semibold">Digital Password Profile</label>
                  <input
                    type="password"
                    className="form-control form-control-sm text-center"
                    placeholder="******"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="modal-footer bg-light py-2 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary btn-xs py-1" onClick={() => setShowAuthModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary btn-xs py-1">
                    Confirm Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Nested Password Verification Modal (Approved Amount Unlocking) */}
      {showUnlockModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-danger shadow">
              <div className="modal-header bg-danger text-white py-2">
                <h6 className="modal-title fw-bold m-0"><i className="bi bi-shield-lock-fill me-1"></i>Unlock Payout Input</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowUnlockModal(false)}></button>
              </div>
              <form onSubmit={handleVerifyUnlockAmount}>
                <div className="modal-body py-3">
                  {unlockModalError && <div className="alert alert-danger small p-1 mb-2 text-center">{unlockModalError}</div>}
                  <label className="form-label small fw-semibold text-danger">Override Audit Key</label>
                  <input
                    type="password"
                    className="form-control form-control-sm text-center border-danger"
                    placeholder="******"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="modal-footer bg-light py-2 d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary btn-xs py-1" onClick={() => setShowUnlockModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger btn-xs py-1">
                    Verify Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
