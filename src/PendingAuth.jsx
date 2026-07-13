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
      .select(`
        id,
        created_at,
        hcpcode,
        hospname,
        enrolleename,
        policyid,
        phonenumber,
        client,
        plan,
        gender,
        diagnosis,
        drugsrequest (
          id,
          itemname,
          price,
          qty,
          period,
          total
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) {
      setRequests(data || []); 
    } else {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = requests.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(requests.length / rowsPerPage) || 1;

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
        client={selectedRequest.client}
        plan={selectedRequest.plan}
        phonenumber={selectedRequest.phonenumber}
        reason={selectedRequest.reason}
        gender={selectedRequest.gender}
        diagFromRequest={selectedRequest.diagnosis}
        treatFromRequest={selectedRequest.treatment}
        drugsrequest={selectedRequest.drugsrequest}   
        onDone={() => {
          setSelectedRequest(null);
          fetchRequests(); 
        }}
      />
    );
  }

  return (
    <div className="container-fluid py-3 px-0" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      
      {/* 📋 Header Banner Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
            <i className="bi bi-clock-history text-warning"></i> Pending Authorization Requests
          </h4>
          <p className="text-muted small mb-0">Incoming clinical claims waiting for adjudication action</p>
        </div>
        <span className="badge bg-warning text-dark border border-warning px-3 py-2 fw-bold font-monospace shadow-sm" style={{ fontSize: "0.9rem", letterSpacing: "0.5px" }}>
  ⚠️ {requests.length} Requests Pending
</span>
      </div>

      {/* 📑 Premium Claims Ledger Table Grid wrapper */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-4">
        <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
          <table 
            className="table table-hover align-middle mb-0 text-nowrap"
            style={{ minWidth: "1300px", width: "100%" }}
          >
            <thead className="table-dark small text-uppercase sticky-top">
              <tr>
                <th className="py-3 px-3 text-center" style={{ width: "60px" }}>SN</th>
                <th className="py-3" style={{ width: "120px" }}>Received Date</th>
                <th className="py-3" style={{ width: "110px" }}>HCP Code</th>
                <th className="py-3" style={{ width: "220px" }}>Hospital Facility</th>
                <th className="py-3" style={{ width: "200px" }}>Enrollee Patient</th>
                <th className="py-3 font-monospace" style={{ width: "130px" }}>Policy ID</th>
                <th className="py-3" style={{ width: "180px" }}>Corporate Client</th>
                <th className="py-3" style={{ width: "280px" }}>Diagnosis Narrative</th>
                <th className="py-3 text-center" style={{ width: "100px" }}>Operation</th>
              </tr>
            </thead>

            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted fw-medium">
                    <i className="bi bi-folder-x fs-3 d-block mb-2 text-secondary"></i>
                    No active pending encounter folders found in this queue.
                  </td>
                </tr>
              ) : (
                currentRows.map((req, i) => (
                  <tr key={req.id} className="border-bottom border-light-subtle">
                    <td className="text-center font-monospace text-secondary px-3">
                      {indexOfFirstRow + i + 1}
                    </td>
                    
                    {/* Safe Microsecond Truncator Layout Segment */}
                    <td className="fw-medium text-dark-emphasis">
                      {(() => {
                        if (!req.created_at) return "N/A";
                        const isoString = String(req.created_at)
                          .replace(" ", "T")
                          .replace(/\.(\d{3})\d+/, ".$1");
                        const parsed = new Date(isoString);
                        return isNaN(parsed.getTime()) ? "Format Error" : parsed.toLocaleDateString("en-NG");
                      })()}
                    </td>

                    <td>
                      <span className="badge bg-light text-secondary border font-monospace px-2.5 py-1">
                        {req.hcpcode || "N/A"}
                      </span>
                    </td>
                    
                    <td className="text-wrap fw-semibold text-dark" style={{ maxWidth: "220px" }}>{req.hospname}</td>
                    <td className="text-wrap text-dark-emphasis" style={{ maxWidth: "200px" }}>{req.enrolleename}</td>
                    <td className="font-monospace text-secondary fw-medium">{req.policyid}</td>
                    <td className="text-wrap text-muted small" style={{ maxWidth: "180px" }}>{req.client}</td>
                    <td className="text-wrap text-dark-emphasis small" style={{ maxWidth: "280px" }}>{req.diagnosis}</td>
                    
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-link text-decoration-none link-primary fw-bold p-0 d-inline-flex align-items-center gap-1"
                        onClick={() => handleTreat(req)}
                      >
                        <i className="bi bi-sliders fs-6"></i> Treat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🧭 Optimized Pagination Controller Segment */}
      {totalPages > 1 && (
        <div className="w-100 d-flex justify-content-center align-items-center mt-3">
          <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border border-light-subtle">
            <button
              disabled={currentPage === 1}
              className="btn btn-sm btn-link text-decoration-none link-primary fw-medium px-2 py-0 border-0"
              style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1 }}
              onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
            >
              <i className="bi bi-chevron-left me-1"></i> Prev
            </button>

            <span className="text-secondary font-monospace bg-light px-3 py-1 rounded-pill border small fw-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              className="btn btn-sm btn-link text-decoration-none link-primary fw-medium px-2 py-0 border-0"
              style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1 }}
              onClick={() => currentPage < totalPages && setCurrentPage((prev) => prev + 1)} // ✅ Fixed typo incrementation bug here
            >
              Next <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
