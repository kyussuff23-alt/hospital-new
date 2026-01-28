
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Registerhosp({ onClose, onRegistered }) {
  const [form, setForm] = useState({
    hcpcode: "",
    name: "",
    acctno: "",
    acctname: "",
    phone: "",
    location: "",
    contactperson: "",
    insurancetype: "",
    address: "",
    registerbank: "",
    band: "Band A",
    status:"active",
    
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  
// auto generating hcpcode
  function generateHcpCode(name, insuranceType) {
  if (!name || !insuranceType) return "";
  const firstTwo = name.substring(0, 2).toUpperCase();
  const randomSix = Math.floor(100000 + Math.random() * 900000); // ensures 6 digits
  return `${firstTwo}/${randomSix}/${insuranceType.toUpperCase()}`;
}


async function handleSubmit(e) {
  e.preventDefault();
  setError("");
  setSuccess("");

  // 🔎 Check if hospital with same name already exists
  const { data: existing, error: checkError } = await supabase
    .from("myhospitals")
    .select("id")
    .eq("name", form.name.toUpperCase()); // ensure case-insensitive consistency

  if (checkError) {
    setError("Error checking hospital name: " + checkError.message);
    return;
  }

  if (existing && existing.length > 0) {
    setError("❌ Hospital with this name already exists!");
    return;
  }

  // ✅ If no duplicate, proceed with insert
  const { error } = await supabase.from("myhospitals").insert([form]);

  if (error) {
    setError(error.message);
  } else {
    setSuccess("✅ Hospital registered successfully!");
    onRegistered(); // refresh table

    setTimeout(() => {
      onClose();
    }, 1500);
  }
}

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop fade show"></div>

      {/* Modal */}
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">Register Hospital</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Explicitly define each field */}
            <div className="mb-3">
          <label className="form-label">HCP CODE</label>
          <input
          type="text"
          className="form-control"
         value={form.hcpcode}
      readOnly
      />
       </div>



<div className="mb-3">
  <label className="form-label">NAME</label>
  <input
    type="text"
    className="form-control"
    value={form.name}
    onChange={(e) => {
      const updatedName = e.target.value.toUpperCase();
      const updatedForm = { ...form, name: updatedName };
      updatedForm.hcpcode = generateHcpCode(updatedName, updatedForm.insurancetype);
      setForm(updatedForm);
    }}
    required
  />
</div>

 
<div className="mb-3">
  <label className="form-label">Status</label>
  <select
    className="form-select"
    value={form.status}
    onChange={(e) => setForm({ ...form, status: e.target.value })}
    required
  >
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
</div>


<div className="mb-3">
  <label className="form-label">Band</label>
  <select
    className="form-select"
    value={form.band}
    onChange={(e) => setForm({ ...form, band: e.target.value })}
    required
  >
    <option value="Band A">Band A</option>
    <option value="Band B">Band B</option>
    <option value="Band C">Band C</option>
    <option value="Band D">Band D</option>
    <option value="Band E">Band E</option>
  </select>
</div>

 
 <div className="mb-3">
                  <label className="form-label">ACCOUNT NUMBER</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.acctno}
                    onChange={(e) => setForm({ ...form, acctno: e.target.value })}
                    required
                  />
                </div>

                {/* …repeat for acctname, phone, location, contactperson, address */}

                <div className="mb-3">
                  <label className="form-label">ACCOUNT NAME</label>
                  <input
                    type="TEXT"
                    className="form-control"
                    value={form.acctname}
                    onChange={(e) => setForm({ ...form, acctname: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
               
                <div className="mb-3">
                  <label className="form-label">PHONE</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
               

                <div className="mb-3">
                  <label className="form-label">LOCATION</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
               
                 <div className="mb-3">
                  <label className="form-label">CONTACT PERSON</label>
                  <input
                    type="TEXT"
                    className="form-control"
                    value={form.contactperson}
                    onChange={(e) => setForm({ ...form, contactperson: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                
                
              
            <div className="mb-3">
  <label className="form-label">INSURANCE TYPE</label>
  <select
    className="form-select"
    value={form.insurancetype}
    onChange={(e) => {
      const updatedInsurance = e.target.value;
      const updatedForm = { ...form, insurancetype: updatedInsurance };
      updatedForm.hcpcode = generateHcpCode(updatedForm.name, updatedInsurance);
      setForm(updatedForm);
    }}
    required
  >
    <option value="">Select Insurance Type</option>
    <option value="PHIS">PHIS</option>
    <option value="NHIA">NHIA</option>
    <option value="ALL">ALL</option>
  </select>
</div>

               
             <div className="mb-3">
  <label className="form-label">ADDRESS</label>
  <textarea
    className="form-control"
    value={form.address}
    onChange={(e) => setForm({ ...form, address: e.target.value.toLowerCase() })}
    rows={3}   // controls height (3 lines tall)
    required
  />
</div>

               
   <div className="mb-3">
                  <label className="form-label">REGISTER BANK</label>
                  <select
                    className="form-select"
                    value={form.registerbank}
                    onChange={(e) => setForm({ ...form, registerbank: e.target.value })}
                    required
                  >
                    <option value="">Select Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="Ecobank">Ecobank</option>
                    <option value="FCMB">First City Monument Bank</option>
                   
                   <option value="Fidelity">Fidelity Bank Plc</option>
                    <option value="First Bank">First Bank</option>
                    <option value="GTBank">GTBank</option>
                     <option value="Polaris Bank">Polaris Bank</option>
                      <option value="Providus Bank">Providus Bank</option>
                     <option value="Stanbic IBTC">Stanbic IBTC</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                      <option value="Suntrust Bank">Suntrust Bank</option>
                       <option value="Union Bank">Union Bank</option>
                    
                    <option value="UBA">UBA</option>
                    <option value="Unity Bank Plc">Unity Bank</option>
                      <option value="Wema Bank">Wema Bank</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    
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
                <button type="submit" className="btn btn-success">Register</button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
