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

    // Search
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
        <button
          className="btn btn-primary"
          onClick={() => setShowRegisterModal(true)}
        >
          ➕ Register Enrollee
        </button>

        <button
          className="btn btn-success"
          onClick={() => alert("Bulk upload feature coming soon!")}
          disabled
        >
          📂 Upload Bulk
        </button>
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
  <button className="btn btn-danger btn-sm" onClick={handleDeactivate}>
    Deactivate
  </button>
  <button className="btn btn-primary btn-sm" onClick={handleReactivate}>
    Reactivate
  </button>
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

      <div className="d-flex justify-content-between align-items-center mt-3">
  <button
    className="btn btn-secondary"
    onClick={() => setPage(0)}
    disabled={page === 0}
  >
    ⏮ First
  </button>

  <button
    className="btn btn-secondary"
    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
    disabled={page === 0}
  >
    ◀ Previous
  </button>

  <span>
    Page {page + 1} of {totalPages}
  </span>

  <button
    className="btn btn-secondary"
    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
    disabled={page >= totalPages - 1}
  >
    Next ▶
  </button>

  <button
    className="btn btn-secondary"
    onClick={() => setPage(totalPages - 1)}
    disabled={page >= totalPages - 1}
  >
    Last ⏭
  </button>

  {/* Jump to page input */}
<input
  type="number"
  min="1"
  max={totalPages}
  value={jumpPage}
  onChange={(e) => setJumpPage(e.target.value)}   // ✅ allow typing
  onBlur={() => {
    const targetPage = Number(jumpPage) - 1;
    if (targetPage >= 0 && targetPage < totalPages) {
      setPage(targetPage);
    } else {
      setJumpPage(page + 1);   // reset if invalid
    }
  }}
  className="form-control ms-2"
  style={{ width: "80px" }}
/>

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
