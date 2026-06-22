import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Registerbatch from "./Registerbatch";
import Updatebatch from "./Updatebatch";
import * as XLSX from "xlsx";
import { useAuth } from "./AuthContext";


export default function Batch() {
  const { userRole, isAuthenticated, setIsAuthenticated } = useAuth();


 // console.log("Batch received userRole:", userRole + typeof userRole);
  
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

 useEffect(() => {
  const fetchBatches = async () => {
    let query = supabase
      .from("mybatch") // ✅ correct table
      .select("*")
      .order("id", { ascending: true });

    // ✅ Apply search directly in Supabase query
    if (search) {
      query = query.or(
        `batchnumber.ilike.%${search}%,hospname.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching batches:", error.message);
      setError(error.message);
    } else {
      setBatches(data);
    }
  };

  fetchBatches();
}, [search]);

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
       {/* ⚠️ CORRECTION: Swapped buttons for clean, interactive dashboard action links */}
<div className="d-flex align-items-center gap-4">
  
  {/* Register Claims Link */}
  <span
    className="text-primary fw-semibold d-inline-flex align-items-center"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={() => setShowRegisterModal(true)}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Darker blue on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-plus-circle-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
    Register Claims
  </span>

  {/* Download Excel Link */}
  <span 
    className="text-success fw-semibold d-inline-flex align-items-center" 
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={handleDownload}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#146c43")} // Darker green on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-file-earmark-arrow-down-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
    Download Excel
  </span>

</div>


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
    <th>Date</th> {/* ✅ New column */}
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
      <td>
        {b.created_at
          ? new Date(b.created_at).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : ""}
      </td>
      <td>{b.batchnumber}</td>
      <td>{b.hospname}</td>
      <td>{b.utilizationmonth}</td>
      <td>{b.year}</td>
      <td>{formatNaira(b.billamount)}</td>
      <td>{b.claimstype}</td>
      <td>{b.hcpcode}</td>
      <td>
       {/* ⚠️ CORRECTION: Swapped chunky block buttons for elegant inline text action links */}
<span 
  className="text-primary fw-medium me-3" 
  style={{ cursor: "pointer" }}
  onClick={() => handleUpdate(b)}
>
  <i className="bi bi-pencil-square me-1"></i> Update
</span>

<span 
  className="text-danger fw-medium" 
  style={{ cursor: "pointer" }}
  onClick={() => handleDelete(b.id)}
>
  <i className="bi bi-trash me-1"></i> Delete
</span>

      </td>
    </tr>
  ))}
</tbody>

        </table>
      </div>

          {/* Pagination Container */}
      {/* ⚠️ CORRECTION: Changed layout container to completely center its contents instead of splitting edges */}
      <div className="w-100 d-flex justify-content-center align-items-center mt-4">
        <div className="d-flex align-items-center gap-3">
          
          {/* Previous Page Link */}
          <span
            className={`fw-medium ${currentPage === 1 ? 'text-muted opacity-50' : 'text-primary'}`}
            style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer", transition: "0.2s" }}
            onClick={() => currentPage > 1 && setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            <i className="bi bi-chevron-left me-1"></i> Previous
          </span>

          {/* Page Indicator Badge */}
          <span className="text-secondary bg-light px-3 py-2 rounded-pill border fw-semibold small">
            Page {currentPage} of {Math.ceil(filteredBatches.length / rowsPerPage)}
          </span>

          {/* Next Page Link */}
          <span
            className={`fw-medium ${currentPage === Math.ceil(filteredBatches.length / rowsPerPage) ? 'text-muted opacity-50' : 'text-primary'}`}
            style={{ 
              cursor: currentPage === Math.ceil(filteredBatches.length / rowsPerPage) ? "not-allowed" : "pointer", 
              transition: "0.2s" 
            }}
            onClick={() => 
              currentPage < Math.ceil(filteredBatches.length / rowsPerPage) && 
              setCurrentPage((prev) => prev + 1)
            }
          >
            Next <i className="bi bi-chevron-right ms-1"></i>
          </span>

        </div>
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
