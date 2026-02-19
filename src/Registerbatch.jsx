import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Registerbatch({ onClose, onRegistered }) {
  const [form, setForm] = useState({
    hospname: "",
    utilizationmonth: "",
    year: "",
    billamount: "",
    claimstype: "",
    hcpcode: "",
    batchnumber: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

function formatWithCommas(value) {
  if (!value) return "";
  // Split integer and decimal parts
  const parts = value.toString().split(".");
  // Format integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}




  // auto generate batchnumber

  function generateBatchNumber(claimstype, year) {
    if (!claimstype || !year) return "";
    const randomSix = Math.floor(100000 + Math.random() * 900000); // ensures 6 digits
    return `${claimstype}/${randomSix}/${year}`;
  }

  // 🔑 Debounced search effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm) {
        searchHospitals(searchTerm);
      } else {
        setSuggestions([]);
      }
    }, 300); // wait 300ms after typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  async function searchHospitals(query) {
    const { data, error } = await supabase
      .from("myhospitals")
      .select("name, hcpcode")
      .ilike("name", `%${query}%`);

    if (error) {
      console.error(error);
      setSuggestions([]);
    } else {
      setSuggestions(data);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { data: existing, error: checkError } = await supabase
      .from("mybatch")
      .select("id")
      .eq("batchnumber", form.batchnumber);

    if (checkError) {
      setError("Error checking batch number: " + checkError.message);
      return;
    }

    if (existing && existing.length > 0) {
      setError("❌ A claim with this batch number already exists!");
      return;
    }

    const { error } = await supabase.from("mybatch").insert([form]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("✅ Claim registered successfully!");
      onRegistered();

      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">Register Claims</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                ></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && (
                  <div className="alert alert-success">{success}</div>
                )}

                {/* Hospital Name with live search */}
                <div className="mb-3 position-relative">
                  <label className="form-label">HOSPITAL NAME</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.hospname}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setForm({ ...form, hospname: value });
                      setSearchTerm(value); // trigger debounced search
                    }}
                    required
                  />

                  {suggestions.length > 0 && (
                    <ul
                      className="list-group position-absolute w-100"
                      style={{ zIndex: 1000 }}
                    >
                      {suggestions.map((s, idx) => (
                        <li
                          key={idx}
                          className="list-group-item list-group-item-action"
                          onClick={() => {
                            setForm({
                              ...form,
                              hospname: s.name.toUpperCase(),
                              hcpcode: s.hcpcode,
                            });
                            setSuggestions([]);
                          }}
                        >
                          {s.name} ({s.hcpcode})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* HCP Code (auto-filled, read-only) */}
                <div className="mb-3">
                  <label className="form-label">HCP CODE</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.hcpcode}
                    readOnly
                  />
                </div>

                {/* Utilization Month */}
                <div className="mb-3">
                  <label className="form-label">UTILIZATION MONTH</label>
                  <select
                    className="form-select"
                    value={form.utilizationmonth}
                    onChange={(e) =>
                      setForm({ ...form, utilizationmonth: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Month</option>
                    {[
                      "JAN",
                      "FEB",
                      "MAR",
                      "APR",
                      "MAY",
                      "JUN",
                      "JUL",
                      "AUG",
                      "SEP",
                      "OCT",
                      "NOV",
                      "DEC",
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div className="mb-3">
                  {" "}
                  <label className="form-label">YEAR</label>{" "}
                  <select
                    className="form-select"
                    value={form.year}
                    onChange={(e) => {
                      const updatedYear = e.target.value;
                      const updatedForm = { ...form, year: updatedYear };
                      updatedForm.batchnumber = generateBatchNumber(
                        updatedForm.claimstype,
                        updatedYear
                      );
                      setForm(updatedForm);
                    }}
                    required
                  >
                    {" "}
                    <option value="">Select Year</option>{" "}
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}{" "}
                  </select>{" "}
                </div>

                {/* Bill Amount */}

<div className="mb-3">
  <label className="form-label">BILL AMOUNT</label>
  <div className="input-group">
    <span className="input-group-text">₦</span>
    <input
      type="text"
      className="form-control"
      value={form.billamount ? formatWithCommas(form.billamount) : ""}
      onChange={(e) => {
        // allow digits and dot
        let raw = e.target.value.replace(/[^0-9.]/g, "");
        // prevent multiple dots
        const parts = raw.split(".");
        if (parts.length > 2) {
          raw = parts[0] + "." + parts.slice(1).join("");
        }
        setForm({ ...form, billamount: raw });
      }}
      required
    />
  </div>
</div>


                {/* Claims Type */}
                <div className="mb-3">
                  {" "}
                  <label className="form-label">CLAIMS TYPE</label>{" "}
                  <select
                    className="form-select"
                    value={form.claimstype}
                    onChange={(e) => {
                      const updatedClaimstype = e.target.value;
                      const updatedForm = {
                        ...form,
                        claimstype: updatedClaimstype,
                      };
                      updatedForm.batchnumber = generateBatchNumber(
                        updatedClaimstype,
                        updatedForm.year
                      );
                      setForm(updatedForm);
                    }}
                    required
                  >
                    {" "}
                    <option value="">Select Claims Type</option>{" "}
                    <option value="PHIS">PHIS</option>{" "}
                    <option value="NHIA">NHIA</option>{" "}
                    <option value="NYSC">NYSC</option>{" "}
                    <option value="RETAIL">RETAIL</option>{" "}
                    <option value="SOCIAL">SOCIAL</option>{" "}
                    <option value="STATE">STATE</option>{" "}
                  </select>{" "}
                </div>

                {/* Batch Number */}
                <div className="mb-3">
                  {" "}
                  <label className="form-label">BATCH NUMBER</label>{" "}
                  <input
                    type="text"
                    className="form-control"
                    value={form.batchnumber}
                    readOnly
                  />{" "}
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-success">
                  Register
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
