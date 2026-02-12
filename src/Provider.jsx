import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Updatehosp from "./Updatehosp";
import Registerhosp from "./Registerhosp";
import * as XLSX from "xlsx";

export default function Provider() {
  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHospitals();
  }, []);

  const filteredHospitals = hospitals.filter((h) =>
    (h.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.hcpcode || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.location || "").toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentHospitals = filteredHospitals.slice(indexOfFirstRow, indexOfLastRow);

  async function fetchHospitals() {
    const { data, error } = await supabase
      .from("myhospitals")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setHospitals(data);
    }
  }

  // ✅ Download hospitals to Excel
  function handleDownload() {
    const worksheet = XLSX.utils.json_to_sheet(hospitals);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hospitals");
    XLSX.writeFile(workbook, "hospitals.xlsx");
  }

  // ✅ Bulk upload hospitals from Excel
  async function handleBulkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const hospitalsData = XLSX.utils.sheet_to_json(sheet);

      const { error } = await supabase.from("myhospitals").insert(hospitalsData);
      if (error) {
        setError("Bulk upload failed: " + error.message);
      } else {
        fetchHospitals();
        alert("✅ Bulk upload successful!");
      }
    } catch (err) {
      setError("Error during bulk upload: " + err.message);
    }
  }

  function handleUpdate(hospital) {
    setSelectedHospital(hospital);
    setShowUpdateModal(true);
  }

  async function handleDeactivate(id) {
    if (window.confirm("Are you sure you want to deactivate this hospital?")) {
      const { error } = await supabase
        .from("myhospitals")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) {
        setError(error.message);
      } else {
        fetchHospitals();
      }
    }
  }

  return (
    <div className="row mb-3 g-2">
      {/* Left side: Register + Analytics */}
      <div className="col-md-8 d-flex gap-2 flex-wrap">
        <button
          className="btn btn-primary flex-fill"
          onClick={() => setShowRegisterModal(true)}
        >
          ➕ Register Hospital
        </button>

        <div className="btn btn-warning fw-bold flex-fill">
          🏥 Total: {hospitals.length}
        </div>
        <div className="btn btn-success fw-bold flex-fill">
          ✅ Active: {hospitals.filter(h => h.status === "active").length}
        </div>
        <div className="btn btn-danger fw-bold flex-fill">
          ❌ Inactive: {hospitals.filter(h => h.status === "inactive").length}
        </div>
      </div>

      {/* Right side: Dropdown + Search */}
      <div className="col-md-4 d-flex gap-2">
        <div className="btn-group dropup flex-shrink-0">
          <button
            type="button"
            className="btn btn-success dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Excel Options
          </button>
          <ul className="dropdown-menu">
            <li>
              <button className="dropdown-item" onClick={handleDownload}>
                ⬇️ Download Hospitals
              </button>
            </li>
            <li>
              <label className="dropdown-item mb-0">
                📂 Bulk Upload Hospitals
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkUpload}
                  style={{ display: "none" }}
                />
              </label>
            </li>
          </ul>
        </div>

        <input
          type="text"
          className="form-control"
          placeholder="Search hospitals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
            {/* Table */}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="table-responsive" style={{ overflowX: "auto" }}>
        <table className="table table-striped table-hover table-bordered">
          <thead className="table-dark">
            <tr>
              <th>S/N</th>
              <th>HCP Code</th>
              <th>Name</th>
              <th>Acct No</th>
              <th>Acct Name</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Status</th>
              <th>Band</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentHospitals.map((h, index) => (
              <tr key={h.id}>
                <td>{indexOfFirstRow + index + 1}</td>
                <td>{h.hcpcode}</td>
                <td>{h.name}</td>
                <td>{h.acctno}</td>
                <td>{h.acctname}</td>
                <td>{h.phone}</td>
                <td>{h.location}</td>
                <td>{h.status}</td>
                <td>{h.band}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    style={{ minWidth: "100px" }}
                    onClick={() => handleUpdate(h)}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ minWidth: "100px" }}
                    onClick={() => handleDeactivate(h.id)}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {currentHospitals.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center">
                  No hospitals found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of{" "}
            {Math.ceil(filteredHospitals.length / rowsPerPage)}
          </span>

          <button
            className="btn btn-secondary"
            onClick={() =>
              setCurrentPage((prev) =>
                prev < Math.ceil(filteredHospitals.length / rowsPerPage)
                  ? prev + 1
                  : prev
              )
            }
            disabled={
              currentPage === Math.ceil(filteredHospitals.length / rowsPerPage)
            }
          >
            Next
          </button>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <Updatehosp
          hospital={selectedHospital}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchHospitals}
        />
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <Registerhosp
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchHospitals}
        />
      )}
    </div>
  );
}
