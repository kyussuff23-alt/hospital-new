import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function NhiaNyscItemsMatrix({ refId, hcpCode, selectedItems = [], setSelectedItems }) {
  const [itemQuery, setItemQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Debounced simultaneous search across procedure_nhia and drugs_nhia
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const normalizedQuery = itemQuery ? itemQuery.trim() : "";
      if (!normalizedQuery) {
        setSearchResults([]);
        return;
      }

      setLoading(true);

      try {
        const [procRes, drugRes] = await Promise.all([
          supabase.from("procedure_nhia")
            .select("*")
            .ilike("description", `%${normalizedQuery}%`),
          supabase.from("drugs_nhia")
            .select("*")
            .ilike("description", `%${normalizedQuery}%`)
        ]);

        if (procRes.error) console.error("Procedure query error:", procRes.error.message);
        if (drugRes.error) console.error("Drug query error:", drugRes.error.message);

        const procData = procRes.data?.map(p => ({ ...p, type: "procedure" })) || [];
        const drugData = drugRes.data?.map(d => ({ ...d, type: "drug" })) || [];

        setSearchResults([...procData, ...drugData]);
      } catch (err) {
        console.error("Search system error:", err.message);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [itemQuery]);

  const handleSelect = (item) => {
    if (!item) return;

    const baseDescription = item.description || item.itemname || "";
    
    // Conditionally collect extra attributes
    let extraMeta = [];
    if (item.strengths || item.strength) extraMeta.push(item.strengths || item.strength);
    if (item.presentation) extraMeta.push(item.presentation);
    if (item.dosage) extraMeta.push(item.dosage);
    
    const finalDescription = extraMeta.length > 0 
      ? `${baseDescription} (${extraMeta.join(" - ")})` 
      : baseDescription;

    setSelectedItems([
      ...selectedItems,
      {
        refid: refId,
        type: item.type,
        nhiacode: item.nhiacode || "",
        description: finalDescription, 
        dosage: item.dosage || "",
        strengths: item.strengths || item.strength || "",
        presentation: item.presentation || "",
        price: Number(item.price) || 0,
        quantity: 1,
        period: 1,
        total: Number(item.price) || 0,
        hospitalname: item.hospitalname || "",
        hcpcode: hcpCode
      }
    ]);
    setSearchResults([]);
    setItemQuery("");
  };

  const updateLine = (index, field, value) => {
    const updated = [...selectedItems];
    if (!updated[index]) return;
    
    updated[index] = { ...updated[index], [field]: value };

    const p = parseFloat(updated[index].price) || 0;
    const q = parseFloat(updated[index].quantity) || 0;
    const per = parseFloat(updated[index].period) || 1;

    updated[index].total = p * q * per;
    setSelectedItems(updated);
  };

  const removeLine = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-4 position-relative">
      <h6 className="text-xs fw-black text-uppercase text-primary tracking-wider pb-2 border-b border-light d-flex align-items-center gap-2 mb-3">
        <i className="bi bi-capsule fs-6"></i> 2. Treatment Procedures & Drugs Allocation
      </h6>

      {/* Search Input Layout */}
      <div className="mb-3 position-relative">
        <label className="form-label text-xs fw-bold text-secondary text-uppercase tracking-wide mb-1">
          Search Procedures & Drugs Catalogue
        </label>
        <div className="input-group">
          <span className="input-group-text bg-light text-muted border-end-0">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            placeholder="Type procedure or drug names..."
            className="form-control border-start-0 ps-0 text-sm shadow-none bg-light focus-bg-white"
          />
          {loading && (
            <span className="input-group-text bg-white border-start-0">
              <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
            </span>
          )}
        </div>

        {/* Floating Results Dropdown List */}
        {searchResults.length > 0 && (
          <ul className="list-group position-absolute w-100 z-3 shadow-lg mt-1 max-vh-50 overflow-y-auto divide-y">
            {searchResults.map((item) => {
              const baseName = item.description || item.itemname || "Item";
              const str = item.strengths || item.strength || "";
              const pres = item.presentation || "";
              const dose = item.dosage || "";
              const tooltipText = `Click to allocate:\n• Name: ${baseName}\n${str ? `• Strength: ${str}\n` : ""}${pres ? `• Pres: ${pres}\n` : ""}${dose ? `• Dosage: ${dose}\n` : ""}• Price: ₦${Number(item.price || 0).toLocaleString("en-NG")}`;

              return (
                <li key={item.id || item.nhiacode} className="list-group-item p-0 border-0">
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    title={tooltipText}
                    className="w-full text-start p-3 bg-white hover-bg-light border-0 text-xs fw-medium d-flex justify-content-between align-items-center transition-colors"
                  >
                    <span className="fw-bold text-dark text-truncate pe-2">
                      <i className="bi bi-plus-circle-fill text-success me-2"></i>
                      {baseName}
                      <span className="text-muted fw-normal ms-2 text-uppercase font-sans">({item.type})</span>
                    </span>
                    <span className="badge bg-light border text-secondary font-monospace fw-bold shrink-0">
                      ₦{Number(item.price).toLocaleString("en-NG")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Allocation Ledger Matrix Table Panel */}
      {selectedItems.length > 0 && (
        <div className="card border rounded shadow-sm overflow-hidden bg-white mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="table-dark">
                <tr className="text-uppercase" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>
                  <th className="p-3 ps-4">Item / Service</th>
                  <th className="p-3 text-end" style={{ width: "120px" }}>Price</th>
                  <th className="p-3 text-center" style={{ width: "90px" }}>Quantity</th>
                  <th className="p-3 text-center" style={{ width: "90px" }}>Period</th>
                  <th className="p-3 text-end" style={{ width: "140px" }}>Total</th>
                  <th className="p-3 text-center" style={{ width: "50px" }}></th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {selectedItems.map((service, index) => (
                  <tr key={index}>
                    <td className="p-3 ps-4 fw-bold text-dark text-wrap" style={{ maxWidth: "240px" }}>
                      {service.description}
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        readOnly
                        value={service.price} 
                        className="form-control form-control-sm bg-light text-muted font-monospace text-end border cursor-not-allowed outline-none" 
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        min="1"
                        value={service.quantity} 
                        onChange={(e) => updateLine(index, "quantity", e.target.value)}
                        className="form-control form-control-sm font-monospace text-center border fw-bold text-dark shadow-none" 
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        min="1"
                        value={service.period} 
                        onChange={(e) => updateLine(index, "period", e.target.value)}
                        className="form-control form-control-sm font-monospace text-center border fw-bold text-dark shadow-none" 
                      />
                    </td>
                    <td className="p-3 font-monospace fw-black text-end text-dark pe-3">
                      ₦{Number(service.total || 0).toLocaleString("en-NG")}
                    </td>
                    <td className="p-3 text-center pe-4">
                      <button 
                        type="button" 
                        onClick={() => removeLine(index)}
                        className="btn btn-link btn-sm text-secondary hover-text-danger p-0 border-0"
                        title="Remove allocated line item"
                      >
                        <i className="bi bi-trash-fill fs-6"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cumulative Ledger Financial Summary Indicator Block */}
          <div className="bg-light border-top p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <span className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>Allocated Coverage Volume</span>
              <span className="text-xs fw-bold text-secondary">{selectedItems.length} Element{selectedItems.length === 1 ? "" : "s"} Assigned</span>
            </div>
            <div className="text-end">
              <span className="text-muted fw-bold text-uppercase d-block" style={{ fontSize: "9px", letterSpacing: "0.5px" }}>Gross Transaction Injected Valuation</span>
              <span className="text-sm fw-black text-success font-monospace">
                ₦{selectedItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0).toLocaleString("en-NG")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
