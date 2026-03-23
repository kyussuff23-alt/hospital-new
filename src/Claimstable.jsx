import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Updateclaims from "./Updateclaims";
import { Table, Button,Modal, ButtonGroup,DropdownButton,Dropdown, Form, Pagination } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logopay from "./logopay.jpeg"; // ✅ import your logo

export default function Claimstable() {
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

  
  // Utility: format numbers as Nigerian Naira currency
function formatMoney(value) {
  if (!value || isNaN(value)) return "N0";
  return "N" + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
  }).format(value);
}
  
  
  const itemsPerPage = 10;

  // ✅ Client PDF Export
 
 const exportToPDF = () => {
  // Restrict: must have date range or named provider
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

  // ✅ Add Logo (top-left corner)
  doc.addImage(logopay, "jpeg", 14, 10, 40, 30); // adjust size/position as needed

  // Title
  doc.setFontSize(18);
  doc.text("Payment Advice", 60, 20);

  // Provider & Date Range
  doc.setFontSize(12);
  doc.text(`Provider: ${providerFilter}`, 60, 30);
  doc.text(`Period: ${fromDate} to ${toDate}`, 60, 38);

  // ✅ Table with headers
  const tableData = dataToExport.map((c) => [
    c.date,
    c.authcode,
    c.services,
    formatMoney(Number(c.bill) || 0),
    formatMoney(Number(c.approved) || 0),
    formatMoney(Number(c.variance) || 0),
  ]);

  autoTable(doc, {
    head: [["Date", "Authcode", "Services", "Bill", "Approved", "Variance"]],
    body: tableData,
    startY: 50,
  });

  // ✅ Accurate Totals
  const totalBill = dataToExport.reduce((sum, c) => sum + (Number(c.bill) || 0), 0);
  const totalApproved = dataToExport.reduce((sum, c) => sum + (Number(c.approved) || 0), 0);
  const totalVariance = dataToExport.reduce((sum, c) => sum + (Number(c.variance) || 0), 0);

  const finalY = doc.lastAutoTable.finalY || 50;
  doc.setFontSize(12);
  doc.text(`Total Bill: ${formatMoney(totalBill)}`, 14, finalY + 10);
  doc.text(`Total Approved: ${formatMoney(totalApproved)}`, 14, finalY + 16);
  doc.text(`Total Variance: ${formatMoney(totalVariance)}`, 14, finalY + 22);

  // Footer
  doc.setFontSize(10);
  doc.text("Kindly contact your claims officer for further advice 08078392043.", 14, finalY + 40);

  doc.save("payment_advice.pdf");
};

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    const { data, error } = await supabase.from("claims").select("*");
    if (error) {
      console.error("Error fetching claims:", error.message);
    } else {
      setClaims(data);
    }
  }

  // 🔹 Providers list for dropdown
  const providers = [...new Set(claims.map((c) => c.provider))];

  // 🔹 Filter claims by search term, date range, and provider
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.authcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.provider?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider =
      !providerFilter || claim.provider === providerFilter;

    const matchesDate =
      (!fromDate || new Date(claim.date) >= new Date(fromDate)) &&
      (!toDate || new Date(claim.date) <= new Date(toDate));

    return matchesSearch && matchesProvider && matchesDate;
  });

  // 🔹 Pagination
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClaims = filteredClaims.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // ✅ Internal Excel Export
  const exportToExcel = () => {
    const dataToExport = filteredClaims.length > 0 ? filteredClaims : claims;
    if (!dataToExport || dataToExport.length === 0) {
      alert("No claims found for the selected filters.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claims");
    XLSX.writeFile(workbook, "payment_advice.xlsx");
  };

  // …rest of your component JSX here
 
 
 
 
 
  return (
   <div className="container-fluid">
  <h3 className="mb-3">Claims Table</h3>

  {/* Search bar */}
  <div className="row mb-2">
    <div className="col-12 col-md-6">
      <Form.Control
        type="text"
        placeholder="Search by Authcode or Provider"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />
    </div>
  </div>

  {/* Filters row */}
  <div className="row g-2 mb-3 align-items-center">
    <div className="col-6 col-md-3">
      <Form.Control
        type="date"
        size="sm"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      />
    </div>
    <div className="col-6 col-md-3">
      <Form.Control
        type="date"
        size="sm"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
      />
    </div>
    <div className="col-12 col-md-3">
      <Form.Select
        size="sm"
        value={providerFilter}
        onChange={(e) => setProviderFilter(e.target.value)}
      >
        <option value="">All Providers</option>
        {providers.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Form.Select>
    </div>
    <div className="col-12 col-md-3">


<DropdownButton
  id="paymentAdviceDropdown"
  title="Payment Advice"
  variant="primary"
  size="sm"
  className="w-50"
>
  <Dropdown.Item onClick={() => { setDownloadType("internal"); setShowConfirmModal(true); }}>
    Internal (Excel)
  </Dropdown.Item>
  <Dropdown.Item onClick={() => { setDownloadType("client"); setShowConfirmModal(true); }}>
    Client (PDF)
  </Dropdown.Item>
</DropdownButton>



    </div>
  </div>
<Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Confirm Download</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {downloadType === "internal"
      ? "Are you sure you want to download Payment Advice (Excel) based on the selected criteria?"
      : "Are you sure you want to generate a client Payment Advice (PDF)? Note: You must select a date range or a named provider — 'All Providers' is not allowed."}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>No</Button>
    <Button
      variant="primary"
      onClick={() => {
        setShowConfirmModal(false);
        if (downloadType === "internal") {
          exportToExcel();
        } else {
          exportToPDF();
        }
      }}
    >
      Yes
    </Button>
  </Modal.Footer>
</Modal>


  
  
  
  {/* Responsive table wrapper */}
  <div className="table-responsive">
    <Table striped bordered hover className="mb-3">
      <thead className="table-dark">
        <tr>
          <th>S/N</th>
          <th>Date</th>
          <th>Authcode</th>
          <th>Provider</th>
          <th>Diagnosis</th>
          <th>Bill</th>
          <th>Approved</th>
          <th>Variance</th>
          <th style={{ minWidth: "180px" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {currentClaims.map((claim, index) => (
          <tr key={claim.id}>
            <td>{startIndex + index + 1}</td>
            <td>{claim.date}</td>
            <td>{claim.authcode}</td>
            <td>{claim.provider}</td>
            <td>{claim.diagnosis}</td>
            <td>{formatNaira(claim.bill)}</td>
            <td>{formatNaira(claim.approved)}</td>
            <td>{formatNaira(claim.variance)}</td>
            <td>
            
<ButtonGroup className="w-100">
  <Button
    variant="warning"
    size="sm"
    className="w-50"
    onClick={() => {
      setSelectedClaim(claim);       // store the claim to update
      setShowUpdateModal(true);      // open the Updateclaims modal
    }}
  >
    Update
  </Button>
  <Button
    variant="danger"
    size="sm"
    className="w-50"
    onClick={() => handleDelete(claim.id)}
    disabled
  >
    Delete
  </Button>
</ButtonGroup>

{/* Update Modal Component */}
<Updateclaims
  claim={selectedClaim}
  show={showUpdateModal}
  onHide={() => setShowUpdateModal(false)}
  onSuccess={fetchClaims}
/>


            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>

  {/* Pagination */}
  <div className="d-flex justify-content-center">
    <Pagination>
      <Pagination.Prev
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((prev) => prev - 1)}
      />
      {[...Array(totalPages)].map((_, i) => (
        <Pagination.Item
          key={i + 1}
          active={i + 1 === currentPage}
          onClick={() => setCurrentPage(i + 1)}
        >
          {i + 1}
        </Pagination.Item>
      ))}
      <Pagination.Next
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage((prev) => prev + 1)}
      />
    </Pagination>
  </div>
</div>

  );
}

// 🔹 Currency formatter
const formatNaira = (value) => {
  if (!value) return "";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(value);
};
