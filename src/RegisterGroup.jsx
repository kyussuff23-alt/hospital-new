import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function RegisterGroup({ onClose, onRegistered }) {
  const [form, setForm] = useState({
    name: "",
    policystatus: "",
    plan: "",
    premiumstart: "",
    premiumend: "",
    effectivedate: "",
    agelimit: "",
    familystatus: "",
    bandallowed: "",
    activate: "Active",
    premium: "",
    dependantage: "", // new field
  });

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...form,
      agelimit: form.agelimit ? parseInt(form.agelimit, 10) : null,
      premium: form.premium ? parseFloat(form.premium) : null,
      dependantage: form.dependantage || null,
    };

    const { error } = await supabase.from("mygroup").insert([payload]);
    if (error) {
      console.error("Supabase insert error:", error);
    } else {
      onRegistered();
      onClose();
    }
  }

  return (
    <div className="modal d-block">
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Register Client</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control mb-2"
                placeholder="Enter client name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <input
                className="form-control mb-2"
                placeholder="Enter policy status (e.g. Active, Pending)"
                value={form.policystatus}
                onChange={(e) => setForm({ ...form, policystatus: e.target.value })}
              />

              <input
                className="form-control mb-2"
                placeholder="Enter plan(s) e.g. Standard, Silver, Gold"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              />

              <input
                type="date"
                className="form-control mb-2"
                value={form.premiumstart}
                onChange={(e) => setForm({ ...form, premiumstart: e.target.value })}
              />

              <input
                type="date"
                className="form-control mb-2"
                value={form.premiumend}
                onChange={(e) => setForm({ ...form, premiumend: e.target.value })}
              />

              <input
                type="date"
                className="form-control mb-2"
                value={form.effectivedate}
                onChange={(e) => setForm({ ...form, effectivedate: e.target.value })}
              />

              <input
                type="number"
                className="form-control mb-2"
                placeholder="Enter age limit"
                value={form.agelimit}
                onChange={(e) => setForm({ ...form, agelimit: e.target.value })}
              />

              <input
                className="form-control mb-2"
                placeholder="Enter family status (e.g. Single, Family)"
                value={form.familystatus}
                onChange={(e) => setForm({ ...form, familystatus: e.target.value })}
              />

              <input
                type="number"
                className="form-control mb-2"
                placeholder="Enter premium amount"
                value={form.premium}
                onChange={(e) => setForm({ ...form, premium: e.target.value })}
              />

              <input
                className="form-control mb-2"
                placeholder="Enter band(s) allowed (e.g. Band A, Band B)"
                value={form.bandallowed}
                onChange={(e) => setForm({ ...form, bandallowed: e.target.value })}
              />

              <input
                className="form-control mb-2"
                placeholder="Enter dependant age (e.g. 18, 21)"
                value={form.dependantage}
                onChange={(e) => setForm({ ...form, dependantage: e.target.value })}
              />

              <select
                className="form-select mb-2"
                value={form.activate}
                onChange={(e) => setForm({ ...form, activate: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
