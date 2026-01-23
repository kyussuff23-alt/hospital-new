import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Registerbatch from "./Registerbatch";
import Updatebatch from "./Updatebatch";
import * as XLSX from "xlsx";
import { useAuth } from "./AuthContext";


export default function Batch() {
  const { userRole, isAuthenticated, setIsAuthenticated } = useAuth();


  console.log("Batch received userRole:", userRole + typeof userRole);
  
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;


  function formatNaira(value) {
  if (value === null || value === undefined || value === "") return "";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}


  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    const { data, error } = await supabase
      .from("mybatch")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setBatches(data);
    }
  }

  function handleDownload() {
    const worksheet = XLSX.utils.json_to_sheet(batches);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Batches");
    XLSX.writeFile(workbook, "batches.xlsx");
  }

  async function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this claim?")) {
      const { error } = await supabase.from("mybatch").delete().eq("id", id);
      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setBatches((prev) => prev.filter((b) => b.id !== id));
      }
    }
  }

  function handleUpdate(batch) {
    setSelectedBatch(batch);
    setShowUpdateModal(true);
  }

  // 🔎 Search + Pagination
  const filteredBatches = batches.filter((b) =>
    (b.batchnumber || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.hospname || "").toLowerCase().includes(search.toLowerCase())
  );

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentBatches = filteredBatches.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowRegisterModal(true)}
        >
          ➕ Register Claims
        </button>

        <button className="btn btn-success ms-2" onClick={handleDownload}>
          ⬇️ Download Excel
        </button>

        <input
          type="text"
          className="form-control w-50"
          placeholder="Search by batch number or hospital name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-striped table-hover table-bordered">
          <thead className="table-dark">
            <tr>
              <th>S/N</th>
              <th>Batch Number</th>
              <th>Hospital Name</th>
              <th>Utilization Month</th>
              <th>Year</th>
              <th>Bill Amount</th>
              <th>Claims Type</th>
              <th>HCP Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBatches.map((b, index) => (
              <tr key={b.id}>
                <td>{indexOfFirstRow + index + 1}</td>
                <td>{b.batchnumber}</td>
                <td>{b.hospname}</td>
                <td>{b.utilizationmonth}</td>
                <td>{b.year}</td>
           <td>{formatNaira(b.billamount)}</td>

                <td>{b.claimstype}</td>
                <td>{b.hcpcode}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleUpdate(b)}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(b.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {currentBatches.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center">
                  No claims found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          Page {currentPage} of {Math.ceil(filteredBatches.length / rowsPerPage)}
        </span>

        <button
          className="btn btn-secondary"
          onClick={() =>
            setCurrentPage((prev) =>
              prev < Math.ceil(filteredBatches.length / rowsPerPage)
                ? prev + 1
                : prev
            )
          }
          disabled={currentPage === Math.ceil(filteredBatches.length / rowsPerPage)}
        >
          Next
        </button>
      </div>

      {showUpdateModal && (
        <Updatebatch
          batch={selectedBatch}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchBatches}
        />
      )}

      {showRegisterModal && (
        <Registerbatch
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchBatches}
        />
      )}
    </div>
  );
}
