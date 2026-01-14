import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Updatehosp({ hospital, onClose, onUpdated }) {
  const [form, setForm] = useState(hospital);

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase
      .from("myhospitals")
      .update(form)
      .eq("id", hospital.id);

    if (error) {
      console.error(error);
    } else {
      onUpdated();
      onClose();
    }
  }

  return (
    <div className="modal d-block" tabIndex="-1">
      <div className="modal-dialog" style={{ maxWidth: "600px" }}>
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Update Hospital</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">

              {/* HCP Code (read-only) */}
              <div className="mb-3">
                <label className="form-label">HCP CODE</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.hcpcode || ""}
                  readOnly
                />
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="form-label">NAME</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value.toUpperCase() })
                  }
                  required
                />
              </div>

              {/* Account Number */}
              <div className="mb-3">
                <label className="form-label">ACCOUNT NUMBER</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.acctno || ""}
                  onChange={(e) =>
                    setForm({ ...form, acctno: e.target.value })
                  }
                  required
                />
              </div>

              {/* Account Name */}
              <div className="mb-3">
                <label className="form-label">ACCOUNT NAME</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.acctname || ""}
                  onChange={(e) =>
                    setForm({ ...form, acctname: e.target.value.toUpperCase() })
                  }
                  required
                />
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="form-label">PHONE</label>
                <input
                  type="tel"
                  className="form-control"
                  value={form.phone || ""}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  required
                />
              </div>

              {/* Location */}
              <div className="mb-3">
                <label className="form-label">LOCATION</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.location || ""}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value.toUpperCase() })
                  }
                  required
                />
              </div>

              {/* Contact Person */}
              <div className="mb-3">
                <label className="form-label">CONTACT PERSON</label>
                <textarea
                  className="form-control"
                  value={form.contactperson || ""}
                  onChange={(e) =>
                    setForm({ ...form, contactperson: e.target.value.toUpperCase() })
                  }
                  rows={3}
                  required
                />
              </div>

              {/* Insurance Type Dropdown */}
              <div className="mb-3">
                <label className="form-label">INSURANCE TYPE</label>
                <select
                  className="form-select"
                  value={form.insurancetype || ""}
                  onChange={(e) =>
                    setForm({ ...form, insurancetype: e.target.value })
                  }
                  required
                >
                  <option value="">Select Insurance Type</option>
                  <option value="PHIS">PHIS</option>
                  <option value="NHIA">NHIA</option>
                  <option value="ALL">ALL</option>
                </select>
              </div>

              {/* Address */}
              <div className="mb-3">
                <label className="form-label">ADDRESS</label>
                <textarea
                  className="form-control"
                  value={form.address || ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value.toUpperCase() })
                  }
                  rows={3}
                  required
                />
              </div>

              {/* Register Bank Dropdown */}
              <div className="mb-3">
                <label className="form-label">REGISTER BANK</label>
                <select
                  className="form-select"
                  value={form.registerbank || ""}
                  onChange={(e) =>
                    setForm({ ...form, registerbank: e.target.value })
                  }
                  required
                >
                  <option value="">Select Bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="GTBank">GTBank</option>
                  <option value="UBA">UBA</option>
                  <option value="First Bank">First Bank</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Opay">Opay</option>
                  <option value="Moniepoint">Moniepoint</option>
                  <option value="PalmPay">PalmPay</option>
                  <option value="FairMoney MFB">FairMoney MFB</option>
                  <option value="Lapo Microfinance Bank">Lapo Microfinance Bank</option>
                </select>
              </div>

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
