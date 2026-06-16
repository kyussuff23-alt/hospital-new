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
  <table className="table table-striped table-bordered align-middle">
    
   <thead>
  <tr>
    <th style={{ whiteSpace: "nowrap" }}>SN</th>
    <th style={{ whiteSpace: "nowrap" }}>Date</th>
    <th style={{ whiteSpace: "nowrap", wordBreak: "break-word" }}>HCP Code</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word" }}>Hospital</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word" }}>Enrollee</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word" }}>Policy ID</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word" }}>Client</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px" }}>Diagnosis</th>
    <th style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "200px" }}>Treatment</th>
    <th style={{ whiteSpace: "nowrap" }}>Action</th>
  </tr>
</thead>
<tbody>
  {currentRows.map((req, i) => (
    <tr key={req.id}>
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
        <button
          className="btn btn-sm btn-primary"
          onClick={() => handleTreat(req)}
        >
          Treat
        </button>
      </td>
    </tr>
  ))}
</tbody>

  </table>

  {/* Pagination controls */}
  <div className="d-flex justify-content-between align-items-center mt-3">
    <button
      className="btn btn-secondary"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((prev) => prev - 1)}
    >
      Previous
    </button>
    <span>
      Page {currentPage} of {totalPages}
    </span>
    <button
      className="btn btn-secondary"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((prev) => prev + 1)}
    >
      Next
    </button>
  </div>
</div>

  );
}
