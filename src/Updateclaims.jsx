import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { supabase } from "./supabaseClient";

// Helpers
function normalizeAmount(amountStr) {
  if (amountStr === null || amountStr === undefined) return 0;
  const cleaned = String(amountStr).replace(/,/g, "").trim();
  return parseFloat(cleaned) || 0;
}

function getFrequencyMultiplier(freq) {
  switch (freq) {
    case "OD": return 1; // Once Daily
    case "BD": return 2; // Twice Daily
    case "TDS": return 3; // Three Times Daily
    case "QDS": return 4; // Four Times Daily
    case "FTD": return 5; // Five Times Daily
    default: return 0;
  }
}

export default function Updateclaims({ claim, show, onHide, onSuccess }) {
  const [formData, setFormData] = useState({
    frequency: claim?.frequency || "",
    period: claim?.period || "",
    bill: claim?.bill || "",
    amount: claim?.amount || "",
    approved: claim?.approved || "",
    variance: claim?.variance || "",
    denial: claim?.denial || "",
    vett: claim?.vett || "",
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch amount from services or drugs table based on claim.services
  useEffect(() => {
    async function fetchAmount() {
      if (!claim?.services) return;

      // Try services table first
      let { data: serviceData } = await supabase
        .from("services")
        .select("amount")
        .eq("itemname", claim.services)
        .single();

      if (serviceData) {
        setFormData((prev) => ({ ...prev, amount: serviceData.amount }));
        return;
      }

      // If not found, try drugs table
      let { data: drugData } = await supabase
        .from("drugs")
        .select("amount")
        .eq("drugname", claim.services)
        .single();

      if (drugData) {
        setFormData((prev) => ({ ...prev, amount: drugData.amount }));
      }
    }

    fetchAmount();
  }, [claim]);

  const handleFormChange = (field, value) => {
    let updated = { ...formData, [field]: value };

    if (["frequency", "period", "bill", "amount"].includes(field)) {
      const freqMult = getFrequencyMultiplier(updated.frequency);
      const periodNum = parseInt(updated.period, 10) || 0;
      const billNum = normalizeAmount(updated.bill);
      const amountNum = normalizeAmount(updated.amount);

      const approvedNum = amountNum * freqMult * periodNum;
      updated.approved = approvedNum;
      updated.variance = billNum - approvedNum;
    }

    setFormData(updated);
  };

  const handleUpdateSubmit = async () => {
    if (!formData.frequency || !formData.period || !formData.bill || !formData.amount) {
      alert("Frequency, Period, Bill, and Amount are required!");
      return;
    }

    const { error } = await supabase
      .from("claims")
      .update({
        frequency: formData.frequency,
        period: formData.period,
        bill: formData.bill,
        amount: formData.amount,
        approved: formData.approved,
        variance: formData.variance,
        denial: formData.denial,
        vett: formData.vett,
      })
      .eq("id", claim.id);

    if (error) {
      console.error("Error updating claim:", error.message);
    } else {
      onHide();
      setShowSuccessModal(true);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <>
      {/* Update Modal */}
      <Modal
        show={show}
        onHide={onHide}
        centered
        size="lg"
        scrollable
        dialogClassName="update-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Update Claim</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Read-only fields */}
          <Form.Group className="mb-2">
            <Form.Label>Date</Form.Label>
            <Form.Control value={claim?.date} readOnly />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Authcode</Form.Label>
            <Form.Control value={claim?.authcode} readOnly />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Provider</Form.Label>
            <Form.Control value={claim?.provider} readOnly />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Services</Form.Label>
            <Form.Control value={claim?.services} readOnly />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Diagnosis</Form.Label>
            <Form.Control value={claim?.diagnosis} readOnly />
          </Form.Group>

          {/* Editable fields */}
          <Form.Group className="mb-2">
            <Form.Label>Frequency</Form.Label>
            <Form.Select
              value={formData.frequency}
              onChange={(e) => handleFormChange("frequency", e.target.value)}
              required
            >
              <option value="">Select...</option>
              <option value="OD">OD - Once Daily</option>
              <option value="BD">BD - Twice Daily</option>
              <option value="TDS">TDS - Three Times Daily</option>
              <option value="QDS">QDS - Four Times Daily</option>
              <option value="FTD">FTD - Five Times Daily</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Period</Form.Label>
            <Form.Control
              type="number"
              value={formData.period}
              onChange={(e) => handleFormChange("period", e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Bill</Form.Label>
            <Form.Control
              type="number"
              value={formData.bill}
              onChange={(e) => handleFormChange("bill", e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              value={formData.amount}
              onChange={(e) => handleFormChange("amount", e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Approved</Form.Label>
            <Form.Control type="number" value={formData.approved} readOnly />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Variance</Form.Label>
            <Form.Control type="number" value={formData.variance} readOnly />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Denial</Form.Label>
            <Form.Select
              value={formData.denial}
              onChange={(e) => handleFormChange("denial", e.target.value)}
            >
              <option value="">Select...</option>
              <option value="not applicable">not applicable</option>
              <option value="not covered">not covered</option>
              <option value="no auth code">no auth code</option>
              <option value="consumables">consumables</option>
              <option value="others">others</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Vett</Form.Label>
            <Form.Select
              value={formData.vett}
              onChange={(e) => handleFormChange("vett", e.target.value)}
            >
              <option value="">Select...</option>
              <option value="adjudicate">adjudicate</option>
              <option value="refuse">refuse</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateSubmit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Success</Modal.Title>
        </Modal.Header>
        <Modal.Body>Claim updated successfully!</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
