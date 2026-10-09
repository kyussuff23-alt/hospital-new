import { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Card,Alert } from "react-bootstrap";
import { supabase } from "./supabaseClient";

export default function Adjudicate({ claim, show, onHide, onSuccess }) {
  const [status, setStatus] = useState("approved");
  const [drugs, setDrugs] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // "checking" | "submitted" | "notSubmitted" | "noAuthCode" | "error"
const [submissionState, setSubmissionState] = useState("checking");

  // ✅ Synchronizes whole bundle package structure on lifecycle state trigger checks
  useEffect(() => {
    if (claim) {
      setStatus(claim.status || "approved");
      setDrugs(claim.drugsrequest || []); 
    }
  }, [claim, show]);


  // Verify the hospital has submitted this claim before vetting is allowed
useEffect(() => {
  if (!show || !claim) return;

  let cancelled = false;

  const verifySubmission = async () => {
    if (!claim.authcode) {
      setSubmissionState("noAuthCode");
      return;
    }

    setSubmissionState("checking");

    try {
      const { count, error } = await supabase
        .from("hospitalsubmit")
        .select("id", { count: "exact", head: true })
        .eq("authcode", claim.authcode)
        .eq("hcpcode", claim.hcpcode);

      if (error) throw error;
      if (!cancelled) setSubmissionState(count > 0 ? "submitted" : "notSubmitted");
    } catch (err) {
      console.error("Submission verification failed:", err.message);
      if (!cancelled) setSubmissionState("error"); // fail closed: keep Save locked
    }
  };

  verifySubmission();

  // Ignore a late response if another claim was opened meanwhile
  return () => {
    cancelled = true;
  };
}, [claim, show]);

const canSave = submissionState === "submitted";

  const handleDrugChange = (index, field, value) => {
    const updated = [...drugs];
    const parsedValue = (field === "qty" || field === "period") ? (Number(value) || 0) : value;
    
    updated[index] = { ...updated[index], [field]: parsedValue };

    // Running background engine arithmetic adjustments in real-time
    // ✅ Running background engine arithmetic adjustments in real-time (FIXED)
    if (field === "qty" || field === "period") {
      const currentPrice = Number(updated[index].price) || 0;
      
      // Pull dynamic values accurately regardless of which specific field was edited
      const currentQty = field === "qty" ? parsedValue : (Number(updated[index].qty) || 0);
      const currentPeriod = field === "period" ? parsedValue : (Number(updated[index].period) || 1);
      
      // Compute the true mathematical extended net aggregate row total
      updated[index].total = currentPrice * currentQty * (currentPeriod || 1);
    }

    setDrugs(updated);
  };
  
  const handleSave = async () => {
      if (!canSave) return; // safety net in case the button is bypassed
    
    try {
      // 1. Update the master claim authorization envelope state
      const { error: authError } = await supabase
        .from("authrequest")
        .update({ status, updated_at: new Date() })
        .eq("id", claim.id);

      if (authError) throw authError;

      // ✅ 2. Transform items state array into a single payload structural batch list
      const upsertPayload = drugs.map((drug) => {
        const isRecalled = status === "recalled";

        return {
          id: drug.id, // Primary database row key to instruct Supabase to execute updates rather than inserts
          qty: isRecalled ? 0 : (Number(drug.qty) || 0),
          period: isRecalled ? 0 : (Number(drug.period) || 0),
          total: isRecalled ? 0 : (Number(drug.total) || 0), 
          denialreason: isRecalled ? "recalled" : (drug.denialreason || null),
        };
      });

      // ✅ 3. Commit the complete matrix block to Supabase inside ONE single network pipe request
      const { error: bundleError } = await supabase
        .from("drugsrequest")
        .upsert(upsertPayload);

      if (bundleError) throw bundleError;

      setShowSuccessModal(true);
      onHide();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error adjudicating full profile:", err.message);
      alert("Failed to save claim changes completely.");
    }
  };

  const formatNaira = (value) => {
    if (!value) return "₦0";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const runningGrandTotal = drugs.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
   return (
    <>
      <Modal show={show} onHide={onHide} centered size="xl" scrollable className="adjudicate-modal shadow">
        <Modal.Header closeButton className="bg-dark text-white border-0 py-3">
          <Modal.Title className="fw-bold font-monospace fs-5">
            🛠️ Adjudication Control Panel — Encounter Folder #{claim?.id}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="bg-light p-4">

          {/* SUBMISSION STATUS BANNER */}
          {submissionState === "checking" && (
            <Alert variant="secondary" className="d-flex align-items-center gap-2 border-0 shadow-sm mb-4">
              <span className="spinner-border spinner-border-sm" role="status"></span>
              Checking whether the hospital has submitted this claim...
            </Alert>
          )}

          {submissionState === "submitted" && (
            <Alert variant="success" className="d-flex align-items-start gap-2 border-0 shadow-sm mb-4">
              <i className="bi bi-check-circle-fill mt-1"></i>
              <div>
                <strong>Claim submitted by the hospital.</strong> You can continue with vetting.
              </div>
            </Alert>
          )}

          {submissionState === "notSubmitted" && (
            <Alert variant="warning" className="d-flex align-items-start gap-2 border-0 shadow-sm mb-4">
              <i className="bi bi-lock-fill mt-1"></i>
              <div>
                <strong>Vetting locked.</strong> The hospital has not yet submitted a claim for auth code{" "}
                <span className="font-monospace fw-bold">{claim?.authcode}</span>. The claim must be
                submitted before it can be vetted.
              </div>
            </Alert>
          )}

          {submissionState === "noAuthCode" && (
            <Alert variant="warning" className="d-flex align-items-start gap-2 border-0 shadow-sm mb-4">
              <i className="bi bi-exclamation-triangle-fill mt-1"></i>
              <div>
                <strong>Vetting locked.</strong> This folder has no auth code, so there is no submitted
                claim to match against.
              </div>
            </Alert>
          )}

          {submissionState === "error" && (
            <Alert variant="danger" className="d-flex align-items-start gap-2 border-0 shadow-sm mb-4">
              <i className="bi bi-x-octagon-fill mt-1"></i>
              <div>
                <strong>Could not verify submission status.</strong> Saving is locked until the check
                succeeds. Close this panel and open it again to retry.
              </div>
            </Alert>
          )}

          {/* BIODATA ENVELOPE CARD */}
          <Card className="border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="fw-bold text-primary mb-0 d-flex align-items-center">
                <i className="bi bi-person-lines-fill me-2 fs-5"></i> Patient Biodata &amp; Coverage Summary
              </h6>
            </Card.Header>
            <Card.Body className="bg-white pt-0 px-4 pb-4">
              <div className="row g-3">
                <div className="col-6 col-md-2">
                  <Form.Label className="small fw-semibold text-secondary">Folder ID</Form.Label>
                  <Form.Control value={claim?.id || ""} readOnly disabled className="bg-light border-0 font-monospace fw-bold text-dark shadow-none" />
                </div>
                <div className="col-6 col-md-3">
                  <Form.Label className="small fw-semibold text-secondary">Received Date</Form.Label>
                  <Form.Control value={claim?.created_at ? new Date(claim.created_at).toLocaleString("en-NG") : ""} readOnly disabled className="bg-light border-0 small shadow-none" />
                </div>
                <div className="col-12 col-md-4">
                  <Form.Label className="small fw-semibold text-secondary">Enrollee Full Name</Form.Label>
                  <Form.Control value={claim?.enrolleename || ""} readOnly disabled className="bg-light border-0 fw-medium shadow-none" />
                </div>
                <div className="col-12 col-md-3">
                  <Form.Label className="small fw-semibold text-secondary">Policy Number / ID</Form.Label>
                  <Form.Control value={claim?.policyid || ""} readOnly disabled className="bg-light border-0 font-monospace fw-bold text-secondary shadow-none" />
                </div>

                <div className="col-6 col-md-4">
                  <Form.Label className="small fw-semibold text-secondary">Corporate Client / Organization</Form.Label>
                  <Form.Control value={claim?.client || ""} readOnly disabled className="bg-light border-0 shadow-none text-dark fw-medium" />
                </div>
                <div className="col-6 col-md-3">
                  <Form.Label className="small fw-semibold text-secondary">HCP Provider Code</Form.Label>
                  <Form.Control value={claim?.hcpcode || ""} readOnly disabled className="bg-light border-0 font-monospace text-center shadow-none" />
                </div>
                <div className="col-12 col-md-5">
                  <Form.Label className="small fw-semibold text-secondary">Hospital Facility Source</Form.Label>
                  <Form.Control value={claim?.hospname || ""} readOnly disabled className="bg-light border-0 text-truncate shadow-none" />
                </div>
                <div className="col-12 col-md-4">
                  <Form.Label className="small fw-semibold text-secondary">Diagnosis Narrative</Form.Label>
                  <Form.Control as="textarea" rows={1} value={claim?.diagnosis || ""} readOnly disabled className="bg-light border-0 small shadow-none text-dark" style={{ resize: "none" }} />
                </div>
                <div className="col-6 col-md-4">
                  <Form.Label className="small fw-semibold text-secondary">Authorization Insurance Token</Form.Label>
                  <Form.Control value={claim?.authcode || "No Auth Code Requested"} readOnly disabled className="bg-light border-0 font-monospace fw-medium text-center shadow-none" />
                </div>
                <div className="col-6 col-md-4">
                  <Form.Label className="small fw-semibold text-primary-emphasis">Batch Folder Verdict Action</Form.Label>
                  <Form.Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!canSave}
                    className="border-2 border-primary fw-bold text-primary shadow-none py-2"
                  >
                    <option value="approved">Approved</option>
                    <option value="processed">Processed</option>
                    <option value="recalled">Recalled</option>
                  </Form.Select>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* ITEM BILL DATA GRID SECTION */}
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                <i className="bi bi-capsule me-2 text-primary fs-5"></i> Itemized Clinical Line Modification Ledger
              </h6>
            </Card.Header>

            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                <thead className="table-dark small text-uppercase">
                  <tr>
                    <th className="py-2 px-3">Item Description Details</th>
                    <th className="py-2 text-end">Base Price</th>
                    <th className="py-2 text-center" style={{ width: "95px" }}>Quantity</th>
                    <th className="py-2 text-center" style={{ width: "95px" }}>Days/Period</th>
                    <th className="py-2 text-end">Extended Total</th>
                    <th className="py-2 px-3">Adjudication Notes / Denial Reason</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {drugs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4 fw-medium bg-white">
                        No service item records linked to this claim bundle profile.
                      </td>
                    </tr>
                  ) : (
                    drugs.map((drug, index) => (
                      <tr key={drug.id || index} className="border-bottom border-light-subtle">
                        <td className="px-3 fw-medium text-dark text-wrap" style={{ maxWidth: "250px" }}>{drug.itemname}</td>
                        <td className="text-end font-monospace text-secondary">{formatNaira(drug.price)}</td>

                        {/* Quantity Field Override */}
                        <td className="px-2">
                          <Form.Control
                            type="number"
                            size="sm"
                            value={status === "recalled" ? 0 : (drug.qty ?? "")}
                            disabled={status === "recalled" || !canSave}
                            onChange={(e) => handleDrugChange(index, "qty", e.target.value)}
                            className="text-center border-light-subtle font-monospace shadow-none rounded"
                          />
                        </td>

                        {/* Period/Days Field Override */}
                        <td className="px-2">
                          <Form.Control
                            type="number"
                            size="sm"
                            value={status === "recalled" ? 0 : (drug.period ?? "")}
                            disabled={status === "recalled" || !canSave}
                            onChange={(e) => handleDrugChange(index, "period", e.target.value)}
                            className="text-center border-light-subtle font-monospace shadow-none rounded"
                          />
                        </td>

                        {/* Total Matrix Calculation Override */}
                        <td className="text-end fw-bold font-monospace text-success px-2">
                          {formatNaira(status === "recalled" ? 0 : drug.total)}
                        </td>

                        {/* Denial Reason Audit Note Override */}
                        <td className="px-3">
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Add rejection or pricing constraint comment..."
                            value={status === "recalled" ? "recalled" : (drug.denialreason || "")}
                            disabled={status === "recalled" || !canSave}
                            onChange={(e) => handleDrugChange(index, "denialreason", e.target.value)}
                            className="border-light-subtle small shadow-none rounded"
                          />
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Grand Total Row Calculation Override */}
                  <tr className="table-secondary border-0">
                    <td colSpan="4" className="text-end fw-bold text-dark py-3">Running Adjudicated Grand Total:</td>
                    <td className="text-end fw-bold text-primary font-monospace py-3 border-start border-end fs-6 bg-primary-subtle border-primary-subtle">
                      {formatNaira(status === "recalled" ? 0 : runningGrandTotal)}
                    </td>
                    <td className="bg-white border-0"></td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card>
        </Modal.Body>

        <Modal.Footer className="bg-white border-top border-light-subtle py-3">
          <Button variant="outline-secondary" className="px-4 fw-medium" onClick={onHide}>
            Dismiss Canvas
          </Button>
          <Button
            variant="success"
            className="px-5 fw-bold shadow-sm"
            onClick={handleSave}
            disabled={!canSave}
            title={canSave ? "" : "Locked until the hospital submits this claim"}
          >
            {submissionState === "checking"
              ? "Verifying..."
              : canSave
              ? "💾 Save Complete Package Batch"
              : "🔒 Locked: Awaiting Hospital Submission"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered size="sm">
        <Modal.Body className="text-center py-4 bg-white rounded-3 shadow-lg">
          <div className="text-success mb-2 fs-1"><i className="bi bi-check-circle-fill"></i></div>
          <h5 className="fw-bold text-dark mb-1">Batch Completed</h5>
          <p className="text-muted small px-2">The operational state of this master folder was synchronized securely.</p>
          <Button variant="primary" size="sm" className="px-4 fw-bold mt-2" onClick={() => setShowSuccessModal(false)}>
            Dismiss
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}