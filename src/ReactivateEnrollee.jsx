import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function ReactivateEnrollee({ show, onClose, onSuccess }) {
  const [deletedList, setDeletedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); 
  const [message, setMessage] = useState({ text: "", type: "" });

  // Filter and Search States
  const [searchName, setSearchName] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  // Dropdown Option States
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    if (show) {
      fetchFilterDropdowns();
      setDeletedList([]); 
      setMessage({ text: "", type: "" });
      setSearchName("");
      setClientFilter("");
      setPlanFilter("");
    }
  }, [show]);

  async function fetchFilterDropdowns() {
    try {
      const { data, error } = await supabase.from("mydelete").select("client, plan");
      if (error) throw error;

      if (data) {
        const uniqueClients = [...new Set(data.map((item) => item.client?.trim()))].filter(Boolean);
        const uniquePlans = [...new Set(data.map((item) => item.plan?.trim()))].filter(Boolean);
        setClients(uniqueClients);
        setPlans(uniquePlans);
      }
    } catch (err) {
      console.error("Error fetching dropdown options:", err.message);
    }
  }

  async function handleSearch(e) {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      let query = supabase.from("mydelete").select("*");

      if (clientFilter) query = query.eq("client", clientFilter.trim());
      if (planFilter) query = query.eq("plan", planFilter.trim());
      if (searchName.trim()) query = query.ilike("enrolleename", `%${searchName.trim()}%`);

      query = query.order("created_at", { ascending: false }).limit(100); 

      const { data, error } = await query;
      if (error) throw error;

      setDeletedList(data || []);
      if (!data || data.length === 0) {
        setMessage({ text: "🔍 No matching archived records found.", type: "info" });
      }
    } catch (err) {
      console.error("Search error:", err.message);
      setMessage({ text: "Failed to query the deletion archive.", type: "danger" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreRow(record) {
    if (!record) return;
    
    try {
      setActionLoading(record.id);
      setMessage({ text: "", type: "" });

      const { data: existingRecords, error: checkError } = await supabase
        .from("myenrolment")
        .select("policyid, enrolleename")
        .or(`policyid.eq.${record.policyid},enrolleename.eq.${record.enrolleename}`);

      if (checkError) throw checkError;

      if (existingRecords && existingRecords.length > 0) {
        setMessage({ 
          text: "⚠️ Cannot restore! An enrollee with this Policy ID or Name is already active.", 
          type: "danger" 
        });
        setActionLoading(null);
        return;
      }

      const { id, created_at, ...cleanData } = record;

      const { error: insertError } = await supabase
        .from("myenrolment")
        .insert([cleanData]);

      if (insertError) throw insertError;

      await supabase.from("mydelete").delete().eq("id", record.id);

      setMessage({ text: "🎉 Enrollee restored successfully!", type: "success" });
      
      setDeletedList((prev) => prev.filter((item) => item.id !== record.id));
      
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err) {
      console.error("Restoration error:", err.message);
      setMessage({ text: `Failed to restore: ${err.message}`, type: "danger" });
    } finally {
      setActionLoading(null);
    }
  }

  if (!show) return null;
  return (
    <div className="modal d-block animate fadeIn" tabIndex="-1" style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "1rem" }}>
          
          <div className="modal-header border-0 pt-4 px-4 bg-white">
            <h5 className="modal-title fw-bold text-success d-flex align-items-center" style={{ letterSpacing: "-0.5px" }}>
              <i className="bi bi-arrow-counterclockwise me-2 fs-4"></i>
              Reactivate Enrollee Archive Search
            </h5>
            <button type="button" className="btn-close shadow-none" onClick={onClose} disabled={actionLoading !== null}></button>
          </div>

          <div className="modal-body px-4 pb-4 pt-2">
            
            {/* Elegant Filter Panel */}
            <form onSubmit={handleSearch} className="row g-3 mb-4 p-4 bg-white rounded-3 shadow-sm border align-items-end mx-0">
              <div className="col-md-4">
                <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>Enrollee Name</label>
                <div className="input-group input-group-sm border rounded-2 bg-light">
                  <span className="input-group-text bg-transparent border-0 text-muted"><i className="bi bi-person"></i></span>
                  <input
                    type="text"
                    className="form-control bg-transparent border-0 py-2 shadow-none"
                    placeholder="Type name keyword..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>Filter by Client</label>
                <select
                  className="form-select form-select-sm border rounded-2 py-2 shadow-none bg-light"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="">All Clients</option>
                  {clients.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>Filter by Plan</label>
                <select
                  className="form-select form-select-sm border rounded-2 py-2 shadow-none bg-light"
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                >
                  <option value="">All Plans</option>
                  {plans.map((p, i) => <option key={i} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-success btn-sm w-100 fw-semibold py-2 rounded-2 shadow-sm d-flex align-items-center justify-content-center gap-2 border-0" style={{ transition: "all 0.2s" }}>
                  <i className="bi bi-search"></i> Search Archive
                </button>
              </div>
            </form>

            {/* Notification Banner */}
            {message.text && (
              <div className={`alert alert-${message.type} border-0 shadow-sm rounded-3 fw-semibold text-center mb-3 small`} role="alert">
                {message.text}
              </div>
            )}

            {/* Data Table Area */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status" style={{ width: "2.5rem", height: "2.5rem" }}></div>
                <p className="text-muted mt-3 small fw-medium">Scanning archive layers...</p>
              </div>
            ) : deletedList.length === 0 ? (
              <div className="text-center text-muted py-5 border border-dashed rounded-3 bg-white">
                <i className="bi bi-search display-4 text-muted opacity-25"></i>
                <p className="mt-3 fw-medium text-secondary mb-0 small">Use the lookup controls above to match archived accounts.</p>
              </div>
            ) : (
              <div className="table-responsive border rounded-3 shadow-sm bg-white" style={{ maxHeight: "380px" }}>
                <table className="table table-hover table-borderless align-middle table-sm mb-0">
                  <thead className="table-light sticky-top border-bottom">
                    <tr className="text-muted small text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                      <th className="py-3 ps-3">Enrollee Name</th>
                      <th className="py-3">Client</th>
                      <th className="py-3">Policy ID</th>
                      <th className="py-3">Plan</th>
                      <th className="py-3">Deactivated Date</th>
                      <th className="py-3">Gender</th>
                      <th className="py-3 text-center pe-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedList.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td className="fw-bold text-dark py-3 ps-3" style={{ borderLeft: "4px solid #198754" }}>{row.enrolleename}</td>
                        <td className="text-secondary">{row.client || <span className="text-muted small">—</span>}</td>
                        <td><span className="badge bg-light text-secondary border font-monospace px-2 py-1 fs-7">{row.policyid}</span></td>
                        <td><span className="text-dark fw-medium">{row.plan}</span></td>
                        <td className="small text-muted">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 rounded-pill ${row.gender === 'Male' ? 'bg-info-subtle text-info' : row.gender === 'Female' ? 'bg-danger-subtle text-danger' : 'bg-light text-muted border'}`}>
                            {row.gender || "—"}
                          </span>
                        </td>
                        <td className="text-center pe-3">
                          <button
                            type="button"
                            className="btn btn-success btn-sm rounded-2 px-3 fw-medium d-inline-flex align-items-center gap-1 border-0 shadow-sm"
                            disabled={actionLoading !== null}
                            onClick={() => handleRestoreRow(row)}
                          >
                            {actionLoading === row.id ? (
                              <><span className="spinner-border spinner-border-sm" role="status"></span> Restoring...</>
                            ) : (
                              <><i className="bi bi-arrow-up-right-circle"></i> Restore</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Dynamic Summary Row Footer Count */}
                  <tfoot className="table-light sticky-bottom border-top fw-bold position-sticky" style={{ bottom: 0, zIndex: 1 }}>
                    <tr className="text-dark">
                      <td colSpan="2" className="py-2 ps-3 text-secondary small">Total Matching Rows found:</td>
                      <td colSpan="5" className="py-2 text-end pe-3 text-success fs-6 fw-bold">
                        {deletedList.length} {deletedList.length === 1 ? 'Record' : 'Records'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light border-0 py-3 rounded-bottom-4">
            <button type="button" className="btn btn-outline-secondary btn-sm px-4 rounded-2 border-0 fw-semibold" onClick={onClose} disabled={actionLoading !== null}>
              Close Window
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
