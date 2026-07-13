import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Adjudicate from "./Adjudicate";
import { Table, Button, Modal, DropdownButton, Dropdown, Form, Pagination } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logopay from "./logopay.jpeg"; // ✅ import your logo

export default function HospitalClaims() {
  const [claims, setClaims] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [statusFilter, setStatusFilter] = useState("approved");

  // Utility: format numbers as Nigerian Naira currency
  function formatMoney(value) {
    if (!value || isNaN(value)) return "₦0";
    return "₦" + new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
    }).format(value);
  }
  
  const itemsPerPage = 2;
  // ✅ Client PDF Export
  const exportToPDF = () => {
    if (providerFilter === "All" || !providerFilter || !fromDate || !toDate) {
      alert("Client Payment Advice requires a named provider and a date range.");
      return;
    }

    const dataToExport = filteredClaims;
    if (!dataToExport || dataToExport.length === 0) {
      alert("No claims found for the selected filters.");
      return;
    }

    const doc = new jsPDF();
    doc.addImage(logopay, "jpeg", 14, 10, 40, 30);
    doc.setFontSize(18);
    doc.text("Payment Advice", 60, 20);
    doc.setFontSize(12);
    doc.text(`Provider: ${providerFilter}`, 60, 30);
    doc.text(`Period: ${fromDate} to ${toDate}`, 60, 38);

    const tableData = [];
    dataToExport.forEach((claim) => {
      claim.drugsrequest.forEach((drug) => {
        tableData.push([
          new Date(claim.created_at).toISOString().split("T")[0],
          claim.hospname,
          claim.hcpcode,
          formatMoney(Number(drug.total) || 0),
        ]);
      });
    });

    autoTable(doc, {
      head: [["Date", "Hospital", "HCP Code", "Total"]],
      body: tableData,
      startY: 50,
    });

    const totalAmount = dataToExport.reduce(
      (sum, claim) =>
        sum +
        claim.drugsrequest.reduce(
          (drugSum, drug) => drugSum + (Number(drug.total) || 0),
          0
        ),
      0
    );

    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.text(`Grand Total: ${formatMoney(totalAmount)}`, 14, finalY + 10);
    doc.setFontSize(10);
    doc.text("Kindly contact your claims officer for further advice 08078392043.", 14, finalY + 30);
    doc.save("hospital_claims.pdf");
  };
  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims(status = statusFilter) {
    const { data, error } = await supabase
      .from("authrequest")
      .select(`
        id,
        enrolleename,
        policyid,
        client,
        diagnosis,
        treatment,
        status,
        hcpcode,
        hospname,
        authcode,
        reason,
        created_at,
        clientname,
        gender,
        plan,
        phonenumber,
        drugsrequest (
          id,
          itemname,
          price,
          qty,
          period,
          total,
          denialreason,
          created_at
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching hospital claims:", error.message);
    } else {
      setClaims(data);
    }
  }

  const providers = [...new Set(claims.map((c) => c.hospname))];

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.hcpcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.hospname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.enrolleename?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider = !providerFilter || claim.hospname === providerFilter;

    const matchesDate =
      (!fromDate || new Date(claim.created_at) >= new Date(fromDate)) &&
      (!toDate || new Date(claim.created_at) <= new Date(toDate));

    return matchesSearch && matchesProvider && matchesDate;
  });

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClaims = filteredClaims.slice(startIndex, startIndex + itemsPerPage);

  const exportToExcel = () => {
    const dataToExport = filteredClaims.length > 0 ? filteredClaims : claims;
    if (!dataToExport || dataToExport.length === 0) {
      alert("No claims found for the selected filters.");
      return;
    }

    const flattened = dataToExport.flatMap((claim) =>
      claim.drugsrequest.map((drug) => ({
        id: claim.id,
        enrolleename: claim.enrolleename,
        policyid: claim.policyid,
        client: claim.client,
        diagnosis: claim.diagnosis,
        status: claim.status,
        hcpcode: claim.hcpcode,
        hospname: claim.hospname,
        authcode: claim.authcode,
        reason: claim.reason,
        created_at: claim.created_at,
        gender: claim.gender,
        plan: claim.plan,
        drug_id: drug.id,
        itemname: drug.itemname,
        price: drug.price,
        qty: drug.qty,
        period: drug.period,
        total: drug.total,
        denialreason: drug.denialreason,
        drug_created_at: drug.created_at,
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(flattened);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HospitalClaims");
    XLSX.writeFile(workbook, "hospital_claims.xlsx");
  };

  const formatNaira = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };
  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="card border-0 shadow-sm p-4 mb-4 rounded-3 bg-white">
        <div className="row g-3 align-items-center mb-3">
          <div className="col-12 col-md-4">
            <h4 className="fw-bold text-dark mb-0">Claims Management</h4>
            <p className="text-muted small mb-0">Adjudicate medical bills at encounter package level</p>
          </div>
          <div className="col-12 col-md-4 ms-auto">
            <Form.Control
              type="text"
              placeholder="🔍 Search Patient name, HCP code, Hospital..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="border-2 shadow-none py-2 px-3 rounded-2"
            />
          </div>
        </div>

        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-3">
            <Form.Label className="small fw-semibold text-secondary">Queue Status Filter</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
                fetchClaims(e.target.value);
              }}
              className="py-2 border-light-subtle shadow-none rounded-2 bg-light fw-medium text-dark"
            >
            <option value="approved">🔵 Approved Claims</option>

              <option value="processed">🔵 Processed Claims</option>
              <option value="recalled">🟡 Recalled Claims</option>
            </Form.Select>
          </div>

          <div className="col-6 col-md-2">
            <Form.Label className="small fw-semibold text-secondary">From Date</Form.Label>
            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="py-2 border-light-subtle shadow-none rounded-2" />
          </div>
          <div className="col-6 col-md-2">
            <Form.Label className="small fw-semibold text-secondary">To Date</Form.Label>
            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="py-2 border-light-subtle shadow-none rounded-2" />
          </div>

          <div className="col-12 col-md-3">
            <Form.Label className="small fw-semibold text-secondary">Healthcare Providers</Form.Label>
            <Form.Select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="py-2 border-light-subtle shadow-none rounded-2">
              <option value="">All Providers</option>
              {providers.map((p) => (<option key={p} value={p}>{p}</option>))}
            </Form.Select>
          </div>

          <div className="col-12 col-md-2 d-flex flex-column align-self-end">
            <DropdownButton id="paymentAdviceDropdown" title="📥 Export Advice" variant="dark" className="w-100">
              <Dropdown.Item onClick={() => { setDownloadType("internal"); setShowConfirmModal(true); }}>Microsoft Excel Summary (.xlsx)</Dropdown.Item>
              <Dropdown.Item onClick={() => { setDownloadType("client"); setShowConfirmModal(true); }}>HMO Client Advice PDF (.pdf)</Dropdown.Item>
            </DropdownButton>
          </div>
        </div>
      </div>

      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">Confirm Document Generation</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3 text-secondary">
          {downloadType === "internal" ? "Are you sure you want to download Payment Advice (Excel)?" : "Are you sure you want to generate a client Payment Advice (PDF)?"}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" className="fw-semibold px-4" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button variant="primary" className="fw-semibold px-4" onClick={() => { setShowConfirmModal(false); if (downloadType === "internal") { exportToExcel(); } else { exportToPDF(); } }}>Confirm</Button>
        </Modal.Footer>
      </Modal>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0 unbordered-table"> 
            <thead className="table-dark text-uppercase small tracking-wider"> 
              <tr> 
                <th className="py-3 px-4">S/N</th> 
                <th className="py-3">Claim ID</th> 
                <th className="py-3">Enrollee Name</th> 
                <th className="py-3">Date</th> 
                <th className="py-3">HCP Facility Provider</th> 
                <th className="py-3">Diagnosis</th> 
                <th className="py-3 text-center">Lines</th> 
                <th className="py-3 text-end pe-4">Grand Total Sum</th> 
                <th className="py-3 text-center" style={{ minWidth: "150px" }}>Actions</th> 
              </tr> 
            </thead> 
            <tbody>
              {currentClaims.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-muted py-5 fw-medium bg-white">No active encounter claims match your search criteria.</td></tr>
              ) : (
                currentClaims.map((claim, index) => {
                  const claimGrandTotal = claim.drugsrequest?.reduce((sum, drug) => sum + (Number(drug.total) || 0), 0) || 0;
                  const itemLinesCount = claim.drugsrequest?.length || 0;
                  return (
                    <tr key={claim.id} className="border-bottom border-light-subtle"> 
                      <td className="px-4 text-secondary small fw-bold">{startIndex + index + 1}</td> 
                      <td className="fw-semibold text-primary">#{claim.id}</td> 
                      <td className="fw-medium text-dark">{claim.enrolleename || "N/A"}</td>
                      <td className="small text-secondary">{new Date(claim.created_at).toISOString().split("T")[0]}</td> 
                      <td className="text-secondary small fw-medium">{claim.hospname}</td> 
                      <td style={{ minWidth: "160px", maxWidth: "220px", whiteSpace: "normal", wordBreak: "break-word" }} className="small text-dark">{claim.diagnosis}</td> 
                      <td className="text-center"><span className="badge bg-light text-dark border px-2 py-1 rounded small font-monospace fw-bold">{itemLinesCount}</span></td> 
                      <td className="text-end pe-4 fw-bold text-dark font-monospace">{formatMoney(claimGrandTotal)}</td> 
                      <td className="text-center"> 
                        <Button variant="outline-primary" size="sm" className="fw-bold px-3 py-1.5 rounded-2 d-inline-flex align-items-center small shadow-sm" onClick={() => { setSelectedClaim(claim); setShowUpdateModal(true); }}>
                          <i className="bi bi-shield-check me-1.5 fs-6"></i> Adjudicate All
                        </Button> 
                      </td> 
                    </tr>
                  );
                })
              )}
            </tbody> 
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">Showing page <b>{currentPage}</b> of {totalPages} pages</span>
            <Pagination className="mb-0 gap-1">
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)} />
              {[...Array(totalPages)].map((_, i) => (
                <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>
              ))}
              <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)} />
            </Pagination>
          </div>
        )}
      </div>
      {selectedClaim && (
        <Adjudicate claim={selectedClaim} show={showUpdateModal} onHide={() => { setShowUpdateModal(false); setSelectedClaim(null); }} onSuccess={fetchClaims} />
      )}
    </div>
  );
}
