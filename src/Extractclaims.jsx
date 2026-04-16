import { useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function Extractclaims({
  hcpcode, setHcpcode,
  ticket, setTicket,
  dateStart, setDateStart,
  dateEnd, setDateEnd,
  claims, setClaims
}) {
  const [error, setError] = useState("");

  async function handleSearch() {
    setError("");
    let query = supabase.from("providerclaims").select("*");

    if (hcpcode) query = query.eq("hcpcode", hcpcode);
    if (ticket) query = query.eq("ticket", ticket);
    if (dateStart) query = query.gte("date", dateStart);
    if (dateEnd)   query = query.lte("date", dateEnd);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching claims:", error.message);
      setError("Failed to fetch claims.");
    } else {
      setClaims(data || []);
    }
  }

  function handleExport() {
    if (claims.length === 0) {
      setError("No data to export.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(claims);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claims");
    XLSX.writeFile(workbook, "claims_export.xlsx");
  }

  return (
    <div className="p-4">
      <h3 className="mb-3 text-primary">Extract Claims</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="HCP Code"
            value={hcpcode}
            onChange={(e) => setHcpcode(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Ticket No"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={handleSearch}>
          Search
        </button>
        <button className="btn btn-success" onClick={handleExport}>
          Export to Excel
        </button>
      </div>

      {claims.length > 0 && (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>HCP Code</th>
              <th>Date</th>
              <th>Bill</th>
              <th>Enrollee Name</th>
              <th>Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id}>
                <td>{c.ticket}</td>
                <td>{c.hcpcode}</td>
                <td>{c.date}</td>
                <td>{c.bill}</td>
                <td>{c.enrolleename}</td>
                <td>{c.diagnosis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
