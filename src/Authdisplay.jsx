import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Modal,
  Table,
  Badge,
  Spinner,
  Button,
  Card,
  Row,
  Col,
  Form,
  Accordion,
} from "react-bootstrap";

export default function Authdisplay({ show, onHide, claim, authCode }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enrolleeProfile, setEnrolleeProfile] = useState(null);

  // Date filters state initialized empty so nothing fetches on load
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const activeAuthCode = authCode || claim?.authcode;

  // Utility to format numbers as Nigerian Naira
  function formatMoney(value) {
    if (!value || isNaN(value)) return "₦0";
    return "₦" + new Intl.NumberFormat("en-NG", { minimumFractionDigits: 0 }).format(value);
  }

  // Helper validation logic to enforce maximum range constraint
  function isValidDateRange(start, end) {
    if (!start || !end) return true;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 31;
  }

  useEffect(() => {
    if (show && activeAuthCode) {
      // Guard: Do absolutely nothing until BOTH filters have values selected
      if (!fromDate || !toDate) {
        setSubmissions([]);
        setEnrolleeProfile(claim);
        return;
      }

      // Guard: Guard against long date selections
      if (!isValidDateRange(fromDate, toDate)) {
        alert("Please select a maximum date range of 31 days to look up authorization submissions.");
        setFromDate("");
        setToDate("");
        setSubmissions([]);
        return;
      }

      fetchAuthHistory();
    }
  }, [show, activeAuthCode, fromDate, toDate]);

  async function fetchAuthHistory() {
    setIsLoading(true);

    // Join hospitaldrugssubmit using foreign key hospitalsubmit_id
    let query = supabase
      .from("hospitalsubmit")
      .select(`
        *,
        hospitaldrugssubmit (
          id, hospitalsubmit_id, itemname, price, qty, period, total, denialreason, created_at
        )
      `)
      .eq("authcode", activeAuthCode)
      .order("created_at", { ascending: false });

    if (fromDate) {
      query = query.gte("created_at", `${fromDate}T00:00:00Z`);
    }
    if (toDate) {
      query = query.lte("created_at", `${toDate}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching hospital submission claims:", error.message);
    } else {
      setSubmissions(data || []);

      // Extract enrollee details from the primary record or fallback to claim prop
      if (data && data.length > 0) {
        setEnrolleeProfile(data[0]);
      } else {
        setEnrolleeProfile(claim);
      }
    }
    setIsLoading(false);
  }

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setSubmissions([]);
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return <Badge bg="primary" className="px-2 py-1">Submitted</Badge>;
      case "approved":
      case "processed":
        return <Badge bg="success" className="px-2 py-1">Approved</Badge>;
      case "pending":
        return <Badge bg="warning" text="dark" className="px-2 py-1">Pending</Badge>;
      case "recalled":
        return <Badge bg="info" className="px-2 py-1">Recalled</Badge>;
      case "rejected":
      case "denied":
        return <Badge bg="danger" className="px-2 py-1">Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">{status || "Unknown"}</Badge>;
    }
  };

  // Calculate total monetary value across all filtered hospital submissions
  const cumulativeTotal = submissions.reduce((sum, sub) => {
    const subTotal = sub.hospitaldrugssubmit?.reduce((dSum, item) => dSum + (Number(item.total) || 0), 0) || 0;
    return sum + subTotal;
  }, 0);
  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton className="bg-light border-bottom py-3">
        <Modal.Title className="fw-bold fs-5 text-dark d-flex align-items-center gap-2">
          <i className="bi bi-shield-check text-primary fs-4"></i>
          Authorization Details & Submitted Claims — <span className="font-monospace text-primary">{activeAuthCode || "N/A"}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 bg-light">
        {/* Enrollee & Submission Summary Card */}
        <Card className="border-0 shadow-sm mb-4 rounded-3">
          <Card.Body className="p-3">
            <h6 className="fw-bold text-uppercase text-secondary small tracking-wider mb-3">
              Enrollee & Policy Overview
            </h6>
            <Row className="g-3">
              <Col xs={12} sm={6} md={3}>
                <span className="text-muted small d-block">Enrollee Name</span>
                <strong className="text-dark fs-6">{enrolleeProfile?.enrolleename || claim?.enrolleename || "N/A"}</strong>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <span className="text-muted small d-block">Policy ID</span>
                <strong className="text-primary font-monospace">{enrolleeProfile?.policyid || claim?.policyid || "N/A"}</strong>
              </Col>
              <Col xs={6} sm={6} md={2}>
                <span className="text-muted small d-block">Gender</span>
                <strong className="text-dark">{enrolleeProfile?.gender || claim?.gender || "N/A"}</strong>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <span className="text-muted small d-block">Phone Number</span>
                <strong className="text-dark font-monospace">{enrolleeProfile?.phonenumber || claim?.phonenumber || "N/A"}</strong>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <span className="text-muted small d-block">Plan / Category</span>
                <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2.5 py-1 fw-semibold fs-6">
                  {enrolleeProfile?.plan || claim?.plan || "Standard Plan"}
                </Badge>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <span className="text-muted small d-block">Client / Corporate Sponsor</span>
                <strong className="text-dark">{enrolleeProfile?.clientname || enrolleeProfile?.client || claim?.clientname || claim?.client || "N/A"}</strong>
              </Col>
              <Col xs={6} sm={6} md={2}>
                <span className="text-muted small d-block">Records Found</span>
                <strong className="text-primary font-monospace fs-6">{submissions.length} Record(s)</strong>
              </Col>
              <Col xs={6} sm={6} md={3}>
                <span className="text-muted small d-block">Total Claims Value</span>
                <strong className="text-success font-monospace fs-6">{formatMoney(cumulativeTotal)}</strong>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Date Filter Card */}
        <Card className="border-0 shadow-sm mb-4 rounded-3">
          <Card.Body className="p-3 bg-white">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <Form.Label className="small fw-semibold text-secondary mb-1">
                  <i className="bi bi-calendar-event me-1"></i> From Date
                </Form.Label>
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="py-2 border-light-subtle shadow-none rounded-2"
                />
              </div>
              <div className="col-12 col-md-4">
                <Form.Label className="small fw-semibold text-secondary mb-1">
                  <i className="bi bi-calendar-event me-1"></i> To Date
                </Form.Label>
                <Form.Control
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="py-2 border-light-subtle shadow-none rounded-2"
                />
              </div>
              <div className="col-12 col-md-4 d-flex gap-2">
                {(fromDate || toDate) && (
                  <Button
                    variant="outline-secondary"
                    className="py-2 fw-semibold rounded-2 w-100"
                    onClick={handleClearFilters}
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Submissions Accordion & Item Breakdown */}
        {isLoading ? (
          <div className="text-center py-5 bg-white rounded-3 shadow-sm">
            <Spinner animation="border" variant="primary" size="sm" className="me-2" />
            <span className="text-muted fw-medium">Loading hospital submission history...</span>
          </div>
        ) : (!fromDate || !toDate) ? (
          <div className="text-center py-5 bg-white rounded-3 shadow-sm text-muted">
            <i className="bi bi-calendar-check fs-3 text-secondary d-block mb-2"></i>
            Please pick a date range to filter and load submission records.
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-3 shadow-sm text-muted">
            No history found for this authorization code within the selected date criteria.
          </div>
        ) : (
          <div className="bg-white p-3 rounded-3 shadow-sm">
            <Accordion alwaysOpen>
              {submissions.map((sub, idx) => {
                const itemTotal = sub.hospitaldrugssubmit?.reduce((sum, d) => sum + (Number(d.total) || 0), 0) || 0;
                return (
                  <Accordion.Item eventKey={String(idx)} key={sub.id} className="border-light-subtle mb-2 shadow-sm rounded-2 overflow-hidden">
                    <Accordion.Header>
                      <div className="d-flex flex-wrap w-100 align-items-center justify-content-between pe-3 gap-2">
                        <span className="font-monospace text-muted small">{sub.created_at ? new Date(sub.created_at).toISOString().split("T")[0] : "N/A"}</span>
                        <strong className="text-dark mx-2">{sub.hospname || "Unknown Provider"}</strong>
                        <span className="text-secondary small italic">{sub.diagnosis || "No Diagnosis"}</span>
                        <div className="ms-auto d-flex align-items-center gap-3">
                          {getStatusBadge(sub.status)}
                          <strong className="text-success font-monospace">{formatMoney(itemTotal)}</strong>
                        </div>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body className="bg-light-subtle p-3">
                      <p className="text-muted mb-2 small"><strong>Treatment details:</strong> {sub.treatment || "N/A"}</p>
                      {sub.hospitaldrugssubmit && sub.hospitaldrugssubmit.length > 0 ? (
                        <Table responsive size="sm" bordered hover className="bg-white m-0 rounded-2 overflow-hidden small">
                          <thead className="table-light">
                            <tr>
                              <th>Item Name</th>
                              <th className="text-center">Price</th>
                              <th className="text-center">Qty</th>
                              <th className="text-center">Period</th>
                              <th className="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sub.hospitaldrugssubmit.map((item) => (
                              <tr key={item.id}>
                                <td>{item.itemname || "N/A"}</td>
                                <td className="text-center font-monospace">{formatMoney(item.price)}</td>
                                <td className="text-center font-monospace">{item.qty}</td>
                                <td className="text-center">{item.period || "1"} day(s)</td>
                                <td className="text-end fw-bold font-monospace text-dark">{formatMoney(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <div className="text-muted small italic">No itemized line details submitted.</div>
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
