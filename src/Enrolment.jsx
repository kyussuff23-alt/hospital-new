import { useState, useEffect,useRef,useMemo } from "react";
import { supabase } from "./supabaseClient";
import RegisterEnrollee from "./RegisterEnrollee";
import UpdateEnrollee from "./UpdateEnrollee";
import * as XLSX from "xlsx";
import EnrolleeRow from "./EnrolleeRow";

export default function Enrolment() {
  const [enrollees, setEnrollees] = useState([]);
  const [selectedEnrollee, setSelectedEnrollee] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
   const pageSize = 20;
                // records per page
const totalPages = Math.ceil(totalCount / pageSize);
const [jumpPage, setJumpPage] = useState(1); // input box value


  // Search state
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("policyid");
  const [searchInput, setSearchInput] = useState("");
  
  
  // Filters
  const [clientFilter, setClientFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  // Dropdown options
  const [clients, setClients] = useState([]);
  const [providers, setProviders] = useState([]);

  
   // 🔑 Ref for debounce timer
  const debounceRef = useRef(null);
  
  
  useEffect(() => {
  setJumpPage(page + 1);
}, [page]);

  
// ✅ Debounced effect for search/filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchEnrollees();
    }, 500); // wait 500ms after typing stops

    return () => clearTimeout(debounceRef.current);
  }, [clientFilter, providerFilter, search, searchMode, page]);

  useEffect(() => {
    fetchDropdowns();
  }, []);


 useEffect(() => {
    fetchDropdowns();
  }, []);

  async function handleDeactivate() {
  if (!search) {
    alert("Please enter a Policy ID to deactivate.");
    return;
  }

  const { data, error } = await supabase
    .from("myenrolment")
    .select("*")
    .eq("policyid", search)
    .single();

  if (error || !data) {
    alert("Policy ID not found in active enrolments.");
    return;
  }

  // Build object without id
  const { id, ...rowWithoutId } = data;

  const { error: insertError } = await supabase
    .from("mydelete")
    .insert([rowWithoutId]);

  if (insertError) {
    console.error("Insert into mydelete failed:", insertError.message);
    alert("Failed to move enrollee into mydelete.");
    return;
  }

  await supabase.from("myenrolment").delete().eq("policyid", search);
  fetchEnrollees();
}

async function handleReactivate() {
  if (!search) {
    alert("Please enter a Policy ID to reactivate.");
    return;
  }

  const { data, error } = await supabase
    .from("mydelete")
    .select("*")
    .eq("policyid", search)
    .single();

  if (error || !data) {
    alert("⚠️ The enrollee you are trying to restore cannot be found.");
    return;
  }

  // Build object without id
  const { id, ...rowWithoutId } = data;

  const { error: insertError } = await supabase
    .from("myenrolment")
    .insert([rowWithoutId]);

  if (insertError) {
    console.error("Insert into myenrolment failed:", insertError.message);
    alert("Failed to restore enrollee.");
    return;
  }

  await supabase.from("mydelete").delete().eq("policyid", search);
  fetchEnrollees();
}

 async function fetchEnrollees() {
  try {
    let query = supabase
      .from("myenrolment")
      .select("*", { count: "exact" })   // ✅ get total count
      .order("id")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    // Filters
    if (clientFilter) query = query.eq("client", clientFilter.trim());
    if (providerFilter) query = query.eq("provider", providerFilter.trim());

    // Search  WHERE THE DATABASE IS QUERIED FOR RECOORD 
    
    if (search) {
      if (searchMode === "policyid") {
        query = query.ilike("policyid", `%${search}%`);
      } else if (searchMode === "enrolleename") {
        query = query.ilike("enrolleename", `%${search}%`);
      }
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("Error fetching enrolments:", error.message);
    } else {
      setEnrollees(data);
      setTotalCount(count || 0);   // ✅ store total count
    }
  } catch (err) {
    console.error("Unexpected error:", err.message);
  }
}


  async function fetchDropdowns() {
  // ✅ Fetch clients from mygroup instead of myenrolment
  const { data: clientData, error: clientError } = await supabase
    .from("mygroup")
    .select("name")
    .not("name", "is", null);

  if (!clientError && clientData) {
    const uniqueClients = [
      ...new Set(clientData.map((c) => c.name?.trim())),
    ].filter(Boolean);
    setClients(uniqueClients);
  }

  // ✅ Providers can still come from myenrolment (since hospitals/providers are tied to enrolments)
  const { data: providerData, error: providerError } = await supabase
    .from("myenrolment")
    .select("provider")
    .not("provider", "is", null);

  if (!providerError && providerData) {
    const uniqueProviders = [
      ...new Set(providerData.map((p) => p.provider?.trim())),
    ].filter(Boolean);
    setProviders(uniqueProviders);
  }
}


  // ✅ Handle opening update modal
  function handleUpdateClick(enrollee) {
    setSelectedEnrollee(enrollee);
    setShowUpdateModal(true);
  }

  // ✅ Export filtered data to Excel
  async function handleExport() {
    let query = supabase.from("myenrolment").select("*").order("id");

    if (clientFilter) {
      query = query.eq("client", clientFilter.trim());
    }
    if (providerFilter) {
      query = query.eq("provider", providerFilter.trim());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Export error:", error.message);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrolment");
    XLSX.writeFile(workbook, "enrolment_export.xlsx");
  }

 // ✅ Memoize filtered list to prevent stutter
  const filteredEnrollees = useMemo(() => {
    return enrollees.filter((e) => {
      if (searchMode === "policyid") {
        return (e.policyid || "").toLowerCase().includes(search.toLowerCase());
      } else if (searchMode === "enrolleename") {
        return (e.enrolleename || "").toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [enrollees, search, searchMode]);

  // ... keep handleDeactivate, handleReactivate, handleUpdateClick, handleExport


  return (
    <div className="container mt-4">
      {/* Action buttons */}
      <div className="d-flex justify-content-between mb-3">
       {/* ⚠️ CORRECTION: Transformed stock button layouts into clean, modern dashboard links */}
<div className="d-flex align-items-center gap-4">
  
  {/* Register Enrollee Link */}
  <span
    className="text-primary fw-semibold d-inline-flex align-items-center"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={() => setShowRegisterModal(true)}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Darker blue on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-person-plus-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
    Register Enrollee
  </span>

  {/* Upload Bulk Link (Disabled style matching your logic) */}
  <span 
    className="text-muted fw-semibold d-inline-flex align-items-center opacity-50" 
    style={{ cursor: "not-allowed" }}
    onClick={() => alert("Bulk upload feature coming soon!")}
  >
    <i className="bi bi-folder-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
    Upload Bulk
  </span>

</div>

      </div>
{/* Filters */}
<div className="row mb-3 align-items-end">
  <div className="col-md-4">
    <label className="form-label">Filter by Client</label>
    <select
      value={clientFilter}
      onChange={(e) => setClientFilter(e.target.value)}
      className="form-select form-select-sm"
    >
      <option value="">All Clients</option>
      {clients.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  </div>

  <div className="col-md-4">
    <label className="form-label">Filter by Provider</label>
    <select
      value={providerFilter}
      onChange={(e) => setProviderFilter(e.target.value)}
      className="form-select form-select-sm"
    >
      <option value="">All Providers</option>
      {providers.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  </div>

  
 {/* Right side: Dropdown + Search */}
{/* Right side: Dropdown + Search */}
<div className="col-md-4 d-flex justify-content-end align-items-end gap-2">
  {/* Options dropdown */}
  <div className="btn-group dropup">
    <button
      type="button"
      className="btn btn-success btn-sm dropdown-toggle"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      Options
    </button>
    <ul className="dropdown-menu dropdown-menu-end">
      <li>
        <button className="dropdown-item" onClick={handleExport}>
          ⬇️ Export to Excel
        </button>
      </li>
      <li>
        <button
          className="dropdown-item"
          onClick={() => setSearchMode("policyid")}
        >
          🔍 Search by Policy ID
        </button>
      </li>
      <li>
        <button
          className="dropdown-item"
          onClick={() => setSearchMode("enrolleename")}
        >
          🔍 Search by Enrollee Name
        </button>
      </li>
    </ul>
  </div>

  {/* Search input */}
 <input
  type="text"
  value={searchInput}
  onChange={(e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (val === "") {
      setSearch("");   // ✅ clear search when input is empty
    }
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      setSearch(searchInput);   // commit only on Enter
    }
  }}
/>
 {/* Deactivate / Reactivate buttons */}
{/* ⚠️ CORRECTION: Converted Deactivate and Reactivate buttons into clean action links */}
<div className="d-flex align-items-center gap-3">
  
  {/* Deactivate Link */}
  <span
    className="text-danger fw-medium d-inline-flex align-items-center small"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={handleDeactivate}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#a51d24")} // Darker red on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-dash-circle-fill me-1"></i> Deactivate
  </span>

  {/* Reactivate Link */}
  <span
    className="text-primary fw-medium d-inline-flex align-items-center small"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={handleReactivate}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Darker blue on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-arrow-counterclockwise me-1"></i> Reactivate
  </span>

</div>

</div>

    </div> {/* ✅ closes the row properly */}    
      
      {/* Enrollee table */}
      <table className="table table-bordered table-striped">
        
        <thead className="table-dark">
          <tr>
            <th>S/N</th>
            <th>Client</th>
            <th>Enrollee Name</th>
            <th>Policy ID</th>
            <th>Old Policy</th>
            <th>Family Status</th>
            <th>Plan</th>
            <th>Provider</th>
            <th>Gender</th>
            <th>Marital Status</th>
            <th>Actions</th>
          </tr>
        </thead>
      
       <tbody>
  {filteredEnrollees.map((e, i) => (
    <EnrolleeRow
      key={e.id}
      enrollee={e}
      index={i}
      onUpdateClick={handleUpdateClick}
    />
  ))}
  {filteredEnrollees.length === 0 && (
    <tr>
      <td colSpan="11" className="text-center">
        No enrollees found.
      </td>
    </tr>
  )}
</tbody>

      </table>

     {/* ⚠️ CORRECTION: Transformed complete stock multi-button pagination layout into centered, elegant action links */}
<div className="w-100 d-flex flex-column align-items-center gap-3 mt-4">
  
  <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
    
    {/* First Page Link */}
    <span
      className={`fw-medium small ${page === 0 ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: page === 0 ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => page > 0 && setPage(0)}
    >
      <i className="bi bi-chevron-bar-left me-1"></i> First
    </span>

    {/* Previous Page Link */}
    <span
      className={`fw-medium small ${page === 0 ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: page === 0 ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => page > 0 && setPage((prev) => Math.max(prev - 1, 0))}
    >
      <i className="bi bi-chevron-left me-1"></i> Previous
    </span>

    {/* Page Indicator Badge */}
    <span className="text-secondary bg-light px-3 py-1.5 rounded-pill border fw-semibold small">
      Page {page + 1} of {totalPages}
    </span>

    {/* Next Page Link */}
    <span
      className={`fw-medium small ${page >= totalPages - 1 ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => page < totalPages - 1 && setPage((prev) => Math.min(prev + 1, totalPages - 1))}
    >
      Next <i className="bi bi-chevron-right ms-1"></i>
    </span>

    {/* Last Page Link */}
    <span
      className={`fw-medium small ${page >= totalPages - 1 ? 'text-muted opacity-50' : 'text-primary'}`}
      style={{ cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", transition: "0.2s" }}
      onClick={() => page < totalPages - 1 && setPage(totalPages - 1)}
    >
      Last <i className="bi bi-chevron-bar-right ms-1"></i>
    </span>

    {/* Jump to page input wrapper */}
    <div className="d-flex align-items-center ms-2 gap-2">
      <span className="text-muted small">Go to:</span>
      <input
        type="number"
        min="1"
        max={totalPages}
        value={jumpPage}
        onChange={(e) => setJumpPage(e.target.value)}
        onBlur={() => {
          const targetPage = Number(jumpPage) - 1;
          if (targetPage >= 0 && targetPage < totalPages) {
            setPage(targetPage);
          } else {
            setJumpPage(page + 1);
          }
        }}
        className="form-control form-control-sm border-secondary-subtle text-center"
        style={{ width: "65px", borderRadius: "6px" }}
      />
    </div>

  </div>
</div>


 {/* ✅ Register Modal */}
      {showRegisterModal && (
        <RegisterEnrollee
          show={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchEnrollees}
        />
      )}

      {/* ✅ Update Modal */}
      {showUpdateModal && selectedEnrollee && (
        <UpdateEnrollee
          enrollee={selectedEnrollee}
          show={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchEnrollees}
        />
      )}
    </div>
  );
}
