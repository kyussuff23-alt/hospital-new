import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import RegisterEnrollee from "./RegisterEnrollee";
import UpdateEnrollee from "./UpdateEnrollee";
import * as XLSX from "xlsx";

export default function Enrolment() {
  const [enrollees, setEnrollees] = useState([]);
  const [selectedEnrollee, setSelectedEnrollee] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Search state
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("policyid");

  // Filters
  const [clientFilter, setClientFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  // Dropdown options
  const [clients, setClients] = useState([]);
  const [providers, setProviders] = useState([]);

  // ✅ Fetch enrollee list on mount and whenever filters change
  useEffect(() => {
    fetchEnrollees();
  }, [clientFilter, providerFilter]);

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
    let query = supabase.from("myenrolment").select("*").order("id");

    if (clientFilter) {
      query = query.eq("client", clientFilter.trim());
    }
    if (providerFilter) {
      query = query.eq("provider", providerFilter.trim());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching enrolments:", error);
    } else {
      setEnrollees(data);
    }
  }

  async function fetchDropdowns() {
    const { data: clientData } = await supabase
      .from("myenrolment")
      .select("client")
      .not("client", "is", null);

    if (clientData) {
      const uniqueClients = [
        ...new Set(clientData.map((c) => c.client?.trim())),
      ].filter(Boolean);
      setClients(uniqueClients);
    }

    const { data: providerData } = await supabase
      .from("myenrolment")
      .select("provider")
      .not("provider", "is", null);

    if (providerData) {
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

  // ✅ Filter logic for search
  const filteredEnrollees = enrollees.filter((e) => {
    if (searchMode === "policyid") {
      return (e.policyid || "").toLowerCase().includes(search.toLowerCase());
    } else if (searchMode === "enrolleename") {
      return (e.enrolleename || "").toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

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
    className="form-control form-control-sm"
    style={{ width: "160px" }}
    placeholder={`Search by ${searchMode}`}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
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
            <tr key={e.id}>
              <td>{i + 1}</td>
              <td>{e.client}</td>
              <td>{e.enrolleename}</td>
              <td>{e.policyid}</td>
              <td>{e.oldpolicy}</td>
              <td>{e.familystatus}</td>
              <td>{e.plan}</td>
              <td>{e.provider}</td>
              <td>{e.gender}</td>
              <td>{e.maritalstatus}</td>
              <td>
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => handleUpdateClick(e)}
                >
                  Update
                </button>
              </td>
            </tr>
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
