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


  // this is the same as total
  // hospitals from  the the DB shown in table 

const filteredHospitals = hospitals.filter((h) =>  
    (h.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.hcpcode || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.location || "").toLowerCase().includes(search.toLowerCase())
  );



// paagination logic
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10;
const indexOfLastRow = currentPage * rowsPerPage;
const indexOfFirstRow = indexOfLastRow - rowsPerPage;
const currentHospitals = filteredHospitals.slice(indexOfFirstRow, indexOfLastRow);



async function fetchHospitals() {
  const { data, error } = await supabase
    .from("myhospitals")
    .select("*")   // fetch ALL columns for debugging
    .order("id", { ascending: true });

  console.log("Fetched hospitals:", data, error); // 👀 check browser console

  if (error) {
    console.error(error);
    setError(error.message);
  } else {
    setHospitals(data);
  }
}

// downloading to excel
function handleDownload() {
  // Convert hospitals array to worksheet
  const worksheet = XLSX.utils.json_to_sheet(hospitals);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hospitals");

  // Trigger download
  XLSX.writeFile(workbook, "hospitals.xlsx");
}


  async function handleDeactivate(id) {
  if (window.confirm("Are you sure you want to deactivate this hospital?")) {
    const { error } = await supabase
      .from("myhospitals")
      .update({ status: "inactive" })   // ✅ update status instead of delete
      .eq("id", id);

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      // Refresh hospitals list
      fetchHospitals();
    }
  }
}


  function handleUpdate(hospital) {
    setSelectedHospital(hospital);
    setShowUpdateModal(true);
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

  {/* Right side: Download + Search */}
  <div className="col-md-4 d-flex gap-2">
    <button className="btn btn-success flex-shrink-0" onClick={handleDownload}>
      ⬇️ Download Excel
    </button>
    <input
      type="text"
      className="form-control"
      placeholder="Search hospitals..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>



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
    <th>Status</th>   {/* ✅ new column */}
    <th>Band</th>     {/* ✅ new column */}
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
      <td>{h.status}</td>   {/* ✅ show status */}
      <td>{h.band}</td>     {/* ✅ show band */}
      <td>
      <button
  className="btn btn-sm btn-warning me-2"
  style={{ minWidth: "100px" }}   // ✅ equal width
  onClick={() => handleUpdate(h)}
>
  Update
</button>
<button
  className="btn btn-sm btn-danger"
  style={{ minWidth: "100px" }}   // ✅ equal width
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
                  : prev,
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

      {showUpdateModal && (
        <Updatehosp
          hospital={selectedHospital}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchHospitals}
        />
      )}

      {showRegisterModal && (
        <Registerhosp
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchHospitals}
        />
      )}
    </div>
  );
}
