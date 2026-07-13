import { useState } from "react";
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
  const [isUploadingTariff, setIsUploadingTariff] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentHospitals = hospitals.slice(indexOfFirstRow, indexOfLastRow);

  // Fetch hospitals by search (limited)
  async function fetchHospitals(query) {
    if (!query) {
      setHospitals([]);
      return;
    }

    const { data, error } = await supabase
      .from("myhospitals")
      .select("id,hcpcode,name,acctno,acctname,phone,location,status,band,address,registerbank,contactperson,insurancetype")
      .or(`name.ilike.%${query}%,hcpcode.ilike.%${query}%,location.ilike.%${query}%`)
      .limit(50);

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setHospitals(data);
    }
  }

  // Fetch ALL hospitals for download
  async function fetchAllHospitals() {
    const { data, error } = await supabase
      .from("myhospitals")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
      return [];
    }
    return data;
  }

  // ✅ Download hospitals to Excel
  async function handleDownload() {
    const allHospitals = await fetchAllHospitals();
    if (!allHospitals.length) {
      alert("No hospitals found to download.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(allHospitals);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hospitals");
    XLSX.writeFile(workbook, "hospitals.xlsx");
  }

  // ✅ Existing Hospital Creation Bulk Upload Handler (FIXED SHEET INDEX)
  async function handleBulkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]]; // ✅ Fixed array selector
      const hospitalsData = XLSX.utils.sheet_to_json(sheet);

      const { error } = await supabase.from("myhospitals").insert(hospitalsData);
      if (error) {
        setError("Bulk upload failed: " + error.message);
      } else {
        alert("✅ Bulk upload successful!");
      }
    } catch (err) {
      setError("Error during bulk upload: " + err.message);
    }
  }

  // ✅ NEW: Multi-Table Automated Tariff Spreadsheet Importer (XLSX Integration - FIXED INDEX)
  async function handleTariffBulkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 🔒 Double confirmation safety lock to protect operational registries
    const confirmUpload = window.confirm(
      "Are you sure you want to execute bulk tariff provisioning? This will automatically map spreadsheet rows and insert matching configurations into both 'hospital_tariff' and 'service_hosp' tables simultaneously."
    );
    if (!confirmUpload) {
      e.target.value = null;
      return;
    }

    try {
      setIsUploadingTariff(true);
      setError("");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]]; // ✅ Fixed array selector
      const rawRows = XLSX.utils.sheet_to_json(sheet);

      if (!rawRows || rawRows.length === 0) {
        throw new Error("Target sheet contains zero readable pricing rows.");
      }

      // 📊 Structuring array payload for Table 1: hospital_tariff
      const tariffPayload = rawRows.map((row) => ({
        hcpcode: String(row.hcpcode || row.HcpCode || "").trim(),
        itemname: String(row.itemname || row.ItemName || "").trim(),
        price: parseFloat(row.price || row.Price) || 0,
        serviceid: row.serviceid || row.ServiceID || null,
        created_at: new Date()
      }));

      // 📊 Structuring array payload for Table 2: service_hosp
      const servicePayload = rawRows.map((row) => ({
        hcpcode: String(row.hcpcode || row.HcpCode || "").trim(),
        service_name: String(row.itemname || row.ItemName || "").trim(),
        tariff_price: parseFloat(row.price || row.Price) || 0
      }));

      // Relational validation check to lock database integrity bounds
      if (tariffPayload.some(r => !r.hcpcode || !r.itemname)) {
        throw new Error("One or more rows are missing mandatory 'hcpcode' or 'itemname' keys.");
      }

      // 🚀 Pipeline 1: Batch-insert pricing array inside ONE network connection call
      const { error: tariffErr } = await supabase
        .from("hospital_tariff")
        .insert(tariffPayload);
      if (tariffErr) throw tariffErr;

      // 🚀 Pipeline 2: Batch-insert linkage array inside ONE network connection call
      const { error: serviceErr } = await supabase
        .from("service_hosp")
        .insert(servicePayload);
      if (serviceErr) throw serviceErr;

      alert(`✅ Bulk tariff provisioning complete! Successfully mapped and injected ${rawRows.length} items across both schemas.`);
      if (search) fetchHospitals(search);
    } catch (err) {
      console.error("Bulk provisioning fault:", err.message);
      setError("Tariff Bulk Provisioning Failed: " + err.message);
    } finally {
      setIsUploadingTariff(false);
      e.target.value = null; // Clear input cache safely
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
        fetchHospitals(search);
      }
    }
  }
  return (
    <div className="row mb-3 g-2" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Left side: Register + Bulk Tariff Tools Link Ribbon */}
      <div className="col-md-8 d-flex gap-4 flex-wrap align-items-center">
        <div className="mb-0">
          <span
            className="text-primary fw-semibold d-inline-flex align-items-center"
            style={{ cursor: "pointer", transition: "color 0.2s ease" }}
            onClick={() => setShowRegisterModal(true)}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
          >
            <i className="bi bi-plus-circle-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
            Register Hospital
          </span>
        </div>

        {/* Dynamic Multi-Table Tariff Bulk Uploader Input Button Link */}
        <div className="mb-0">
          <label 
            className={`fw-semibold d-inline-flex align-items-center mb-0 transition-all ${isUploadingTariff ? "text-muted" : "text-success"}`}
            style={{ cursor: isUploadingTariff ? "not-allowed" : "pointer", transition: "color 0.2s ease" }}
            onMouseEnter={(e) => !isUploadingTariff && (e.currentTarget.style.color = "#146c43")}
            onMouseLeave={(e) => !isUploadingTariff && (e.currentTarget.style.color = "")}
          >
            <i className={`bi ${isUploadingTariff ? "spinner-border spinner-border-sm text-secondary" : "bi-file-earmark-spreadsheet-fill"} me-2`} style={{ fontSize: "1.1rem" }}></i> 
            {isUploadingTariff ? "Provisioning Tariffs..." : "Upload Tariff Matrix (.XLSX)"}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              disabled={isUploadingTariff}
              onChange={handleTariffBulkUpload}
            />
          </label>
        </div>
      </div>

      {/* Right side: Excel Context Group Actions Dropdown + Search input box */}
      <div className="col-md-4 d-flex gap-2 align-items-center">
        <div className="btn-group dropup flex-shrink-0">
          <button
            type="button"
            className="btn btn-sm btn-primary dropdown-toggle fw-bold"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Excel Options
          </button>
          <ul className="dropdown-menu shadow-lg border-light-subtle">
            <li>
              <button type="button" className="dropdown-item py-2 small font-medium" onClick={handleDownload}>
                ⬇️ Download Hospitals Matrix
              </button>
            </li>
            <li>
              <label className="dropdown-item py-2 small font-medium mb-0" style={{ cursor: "pointer" }}>
                📂 Bulk Upload Directory Rows
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
          className="form-control form-control-sm py-1.5 shadow-none border-light-subtle"
          placeholder="Search hospitals by name, code or location..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchHospitals(e.target.value);
          }}
        />
      </div>
      {/* Table Interface Matrix */}
      {error && <div className="alert alert-danger py-2 px-3 small border-0 border-start border-4 border-danger rounded-0 bg-danger-subtle text-danger fw-medium mt-3 mb-2">{error}</div>}
      
      <div className="table-responsive mt-3" style={{ overflowX: "auto" }}>
        <table className="table table-striped table-hover table-bordered align-middle small">
          <thead className="table-dark text-uppercase font-monospace text-xs">
            <tr>
              <th className="py-2.5">S/N</th>
              <th className="py-2.5">HCP Code</th>
              <th className="py-2.5">Name</th>
              <th className="py-2.5">Acct No</th>
              <th className="py-2.5">Acct Name</th>
              <th className="py-2.5">Phone</th>
              <th className="py-2.5">Location</th>
              <th className="py-2.5">Status</th>
              <th className="py-2.5">Band</th>
              <th className="py-2.5 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentHospitals.map((h, index) => (
              <tr key={h.id}>
                <td className="font-monospace text-secondary">{indexOfFirstRow + index + 1}</td>
                <td className="font-monospace fw-bold text-dark">{h.hcpcode}</td>
                <td className="fw-semibold text-dark">{h.name}</td>
                <td className="font-monospace text-secondary">{h.acctno || "-"}</td>
                <td className="text-truncate small text-muted" style={{ maxWidth: "140px" }}>{h.acctname || "-"}</td>
                <td className="font-monospace text-secondary">{h.phone || "-"}</td>
                <td>{h.location}</td>
                <td>
                  <span className={`badge px-2 py-1 rounded-pill ${h.status === "active" ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle"}`}>
                    {h.status}
                  </span>
                </td>
                <td className="font-monospace">{h.band || "-"}</td>
                <td>
                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <span
                      className="text-primary fw-semibold d-inline-flex align-items-center small"
                      style={{ cursor: "pointer", transition: "color 0.2s ease" }}
                      onClick={() => handleUpdate(h)}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                    >
                      <i className="bi bi-pencil-square me-1"></i> Update
                    </span>

                    <span
                      className="text-danger fw-semibold d-inline-flex align-items-center small"
                      style={{ cursor: "pointer", transition: "color 0.2s ease" }}
                      onClick={() => handleDeactivate(h.id)}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#a51d24")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                    >
                      <i className="bi bi-dash-circle-fill me-1"></i> Deactivate
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {currentHospitals.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center py-4 text-muted fw-medium font-monospace">
                  No hospital node registries matching the search parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {hospitals.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 bg-light p-2 rounded border border-light-subtle">
            <button
              type="button"
              className="btn btn-sm btn-secondary fw-bold px-3 shadow-none"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span className="small text-secondary fw-semibold font-monospace">
              Page {currentPage} of {Math.ceil(hospitals.length / rowsPerPage)}
            </span>

            <button
              type="button"
              className="btn btn-sm btn-secondary fw-bold px-3 shadow-none"
              onClick={() =>
                setCurrentPage((prev) =>
                  prev < Math.ceil(hospitals.length / rowsPerPage) ? prev + 1 : prev
                )
              }
              disabled={currentPage === Math.ceil(hospitals.length / rowsPerPage)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Update Modal Integration mounting view */}
      {showUpdateModal && (
        <Updatehosp
          hospital={selectedHospital}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={() => fetchHospitals(search)}
        />
      )}

      {/* Register Modal Integration mounting view */}
      {showRegisterModal && (
        <Registerhosp
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => fetchHospitals(search)}
        />
      )}
    </div>
  );
}
