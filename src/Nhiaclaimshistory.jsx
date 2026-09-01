import React, { useMemo } from "react"; // Added useMemo for calculation cashing
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

export default function Nhiaclaimshistory({ nhianumber, onClose }) {
  // 1. Database Query
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["enrolleeFlatClaimsHistory", nhianumber],
    queryFn: async () => {
      if (!nhianumber) return null;

      const { data: biodata, error: bioError } = await supabase
        .from("nhia_claims_biodata")
        .select("refid, enrolleename,hospitalname, diagnosis, authcode, created_at")
        .eq("nhianumber", nhianumber)
        .order("created_at", { ascending: false });

      if (bioError) throw bioError;
      if (!biodata || biodata.length === 0) return null;

      const refIds = biodata.map((b) => b.refid).filter(Boolean);
      if (refIds.length === 0) return { biodata, drugs: [] };

      const { data: drugs, error: drugError } = await supabase
        .from("nhia_claims_drugs")
        .select("refid, description, price, quantity, period, total")
        .in("refid", refIds);

      if (drugError) throw drugError;

      return { biodata, drugs: drugs || [] };
    },
    enabled: !!nhianumber,
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes to avoid redundant network requests
  });

  // 2. ⚡ PERFORMANCE GUARD: Memoize the flattening loop logic
  // This ensures the processing loop runs EXACTLY ONCE when data drops from Supabase,
  // instead of running on every tiny mouse hover or parent component re-render.
  // 2. ⚡ PERFORMANCE GUARD: Memoize the flattening loop logic safely
  const flatHistoryRows = useMemo(() => {
    // Return an empty array early if rawData is missing completely
    if (!rawData || !rawData.biodata) return [];
    
    const { biodata, drugs = [] } = rawData;
    const flattened = [];
    
    // Using optional chaining ensures it safely ignores execution if empty
    biodata?.forEach((bio) => {
      // Direct array safety fallback filter
      const matchedDrugs = Array.isArray(drugs) ? drugs.filter((d) => d.refid === bio.refid) : [];
      
      if (matchedDrugs.length === 0) {
        flattened.push({
          ...bio,
          description: "— No items recorded —",
          price: 0,
          quantity: 0,
          period: 0,
          total: 0
        });
      } else {
        matchedDrugs.forEach((drug) => {
          flattened.push({
            ...bio,
            description: drug.description || "— No Description —",
            price: drug.price,
            quantity: drug.quantity,
            period: drug.period,
            total: drug.total
          });
        });
      }
    });
    
    return flattened;
  }, [rawData]);

  if (!nhianumber) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1100 }} tabIndex="-1">
      <div className="modal-dialog modal-fullscreen-xl-down modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '95vw' }}>
        <div className="modal-content shadow-2xl border-0 rounded-4">
          
          {/* Header */}
          <div className="modal-header bg-dark text-white rounded-top-4 py-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5">📊</span>
              <div>
                <h6 className="modal-title fw-bold m-0">Historical Flat Timeline Spreadsheet</h6>
                <small className="text-light opacity-75 font-monospace">ID Number: {nhianumber}</small>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Table Container Body Area */}
          <div className="modal-body p-0 bg-white" style={{ maxHeight: "78vh" }}>
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted small fw-medium">Compiling dynamic tracking rows across claim segments...</p>
              </div>
            ) : flatHistoryRows.length === 0 ? (
              <div className="text-center py-5 bg-light m-3 rounded border">
                <span className="fs-2">📁</span>
                <p className="text-muted mt-2 m-0 small fw-semibold">No historical claim records found for this enrollee code.</p>
              </div>
            ) : (
              <div className="table-responsive w-100 m-0" style={{ maxHeight: "78vh" }}>
                <table className="table table-bordered table-striped table-hover text-nowrap m-0 align-middle" style={{ fontSize: "0.82rem" }}>
                  <thead className="table-dark sticky-top" style={{ zIndex: 5 }}>
                    <tr>
                      <th className="ps-3">Date Filed</th>
                      <th>Reference ID</th>
                      <th>Enrollee Full Name</th>
                       <th>Hospital Name</th>
                      <th>Clinical Diagnosis</th>
                      <th>Authorization Code</th>
                      <th>Item Description / Service</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-center">Qty</th>
                      <th className="text-center">Period</th>
                      <th className="text-end pe-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatHistoryRows.map((row, index) => (
                      <tr 
                        key={index}
                        // ⚡ PERFORMANCE GUARD: "content-visibility: auto" tells Chrome/Edge/Firefox
                        // to only render layout paint rules for rows currently within view.
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 40px' }}
                      >
                        <td className="ps-3 font-monospace text-secondary">
                          {new Date(row.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: '2-digit', day: '2-digit'
                          })}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary border font-monospace">
                            {row.refid}
                          </span>
                        </td>
                        <td className="fw-medium text-dark">{row.enrolleename || "—"}</td>
                        <td className="fw-medium text-dark">{row.hospitalname || "—"}</td>

                        
                        <td className="text-wrap max-w-xs text-danger fw-semibold" style={{ minWidth: "180px" }}>
                          {row.diagnosis || "—"}
                        </td>
                        <td className="font-monospace fw-bold small text-success">
                          {row.authcode ? `🔐 ${row.authcode}` : <span className="text-muted opacity-50">N/A</span>}
                        </td>
                        <td className="text-wrap fw-medium text-secondary" style={{ minWidth: "220px" }}>
                          {row.description}
                        </td>
                        <td className="text-end font-monospace">₦{(Number(row.price) || 0).toLocaleString()}</td>
                        <td className="text-center font-monospace">{row.quantity || 0}</td>
                        <td className="text-center text-muted">{row.period ? `${row.period}d` : "0d"}</td>
                        <td className="text-end pe-3 font-monospace fw-bold text-dark bg-light-subtle">
                          ₦{(Number(row.total) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="modal-footer bg-light border-top py-2">
            <span className="me-auto text-muted small fw-medium ps-2">
              📋 Total historical matches found: <strong>{flatHistoryRows.length}</strong>
            </span>
            <button type="button" className="btn btn-secondary btn-sm rounded-3 px-3 shadow-sm" onClick={onClose}>
              Close Sheet
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
