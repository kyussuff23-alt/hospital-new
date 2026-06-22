import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Authorization from "./Authorization";

export default function UpdateRequest() {
  const [requests, setRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const rowsPerPage = 5;

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("authrequest")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) setRequests(data);
    if (error) console.error(error);

  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = requests.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(requests.length / rowsPerPage);

  const handleTreat = (req) => {
    setSelectedRequest(req);
  };

  if (selectedRequest) {
    return (
      <Authorization
        id={selectedRequest.id}
        hcpCode={selectedRequest.hcpcode}
        hospitalName={selectedRequest.hospname}
        enrolleeName={selectedRequest.enrolleename}
        policyId={selectedRequest.policyid}
        clientName={selectedRequest.clientname}
        diagFromRequest={selectedRequest.diagnosis}
        treatFromRequest={selectedRequest.treatment}
        onDone={() => {
          setSelectedRequest(null);
          fetchRequests(); // refresh list after finishing
        }}
      />
    );
  }

  return (
  <div className="container mt-4">
  <h3>Pending Authorization Requests</h3>
 {/* ⚠️ CORRECTION: Wrapped your active table in a responsive card box with a beautiful modern background and soft borders */}
{/* ⚠️ CORRECTION: Removed all grey elements, replacing them with a crisp white dashboard layout */}
{/* ⚠️ CORRECTION: Updated the table header row to use a crisp black background with white text */}
<div className="table-responsive border border-secondary-subtle rounded-3 shadow-sm bg-white p-2">
  <table className="table table-hover align-middle mb-0 bg-white">
    
    <thead>
      <tr className="bg-dark text-white" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
        <th style={{ whiteSpace: "nowrap", backgroundColor: "inherit", color: "inherit" }}>SN</th>
        <th style={{ whiteSpace: "nowrap", backgroundColor: "inherit", color: "inherit" }}>Date</th>
        <th style={{ whiteSpace: "nowrap", wordBreak: "break-word", backgroundColor: "inherit", color: "inherit" }}>HCP Code</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", backgroundColor: "inherit", color: "inherit" }}>Hospital</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", backgroundColor: "inherit", color: "inherit" }}>Enrollee</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", backgroundColor: "inherit", color: "inherit" }}>Policy ID</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", backgroundColor: "inherit", color: "inherit" }}>Client</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px", backgroundColor: "inherit", color: "inherit" }}>Diagnosis</th>
        <th style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px", backgroundColor: "inherit", color: "inherit" }}>Treatment</th>
        <th style={{ whiteSpace: "nowrap", backgroundColor: "inherit", color: "inherit" }}>Action</th>
      </tr>
    </thead>

    <tbody style={{ borderTop: "none" }}>
      {currentRows.map((req, i) => (
        <tr key={req.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
          <td style={{ whiteSpace: "nowrap" }}>
            {indexOfFirstRow + i + 1}
          </td>
          <td style={{ whiteSpace: "nowrap" }}>
            {new Date(req.created_at).toLocaleDateString()}
          </td>
          <td style={{ whiteSpace: "nowrap" }}>
            {req.hcpcode}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {req.hospname}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {req.enrolleename}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {req.policyid}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
            {req.clientname}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px" }}>
            {req.diagnosis}
          </td>
          <td style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px" }}>
            {req.treatment}
          </td>
          <td style={{ whiteSpace: "nowrap" }}>
            <span
              className="text-primary fw-medium d-inline-flex align-items-center small"
              style={{ cursor: "pointer", transition: "color 0.2s ease" }}
              onClick={() => handleTreat(req)}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            >
              <i className="bi bi-file-earmark-medical me-1"></i> Treat
            </span>
          </td>
        </tr>
      ))}
    </tbody>

  </table>
</div>



  {/* Pagination controls */}
  <div className="d-flex justify-content-between align-items-center mt-3">
   {/* ⚠️ CORRECTION: Transformed stock pagination buttons into centered, elegant action links */}
<div className="w-100 d-flex justify-content-center align-items-center mt-4">
  <div className="d-flex align-items-center gap-3">
    
    {/* Previous Page Link */}
    <span
      className={`fw-medium small ${currentPage === 1 ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
    >
      <i className="bi bi-chevron-left me-1"></i> Previous
    </span>

    {/* Page Indicator Badge */}
    <span className="text-secondary bg-light px-3 py-1.5 rounded-pill border fw-semibold small">
      Page {currentPage} of {totalPages}
    </span>

    {/* Next Page Link */}
    <span
      className={`fw-medium small ${currentPage === totalPages ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => currentPage < totalPages && setCurrentPage((prev) => prev + 1)}
    >
      Next <i className="bi bi-chevron-right ms-1"></i>
    </span>

  </div>
</div>

  </div>
</div>

  );
}
