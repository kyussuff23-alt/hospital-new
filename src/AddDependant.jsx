
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AddDependant({ principal, show, onClose, onAdded }) {
  const [form, setForm] = useState({
    enrolleename: "",
    gender: "",
   photopart: "",
    policyid: "",
    oldpolicy: "",
    provider: "",
    maritalstatus: "",
    // hidden inherited fields
    client: "",
    plan: "",
    familystatus: "",
    phonenumber: "",
    email: "",
    address: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [hospitalOptions, setHospitalOptions] = useState([]);


  // ✅ Prefill from principal
 useEffect(() => {
  if (principal) {
    // Prefill hidden inherited fields
    setForm({
      enrolleename: "",               // no name inherited
      gender: "",                     // user chooses
      photopart: "",                  // no photo inherited
      policyid: generateDependantPolicyId(principal.policyid),
      oldpolicy: principal.oldpolicy,
      provider: "",                   // let dependant choose
      maritalstatus: principal.maritalstatus,
      client: principal.client,
      plan: principal.plan,
      familystatus: principal.familystatus,
      phonenumber: principal.phonenumber,
      email: principal.email,
      address: principal.address,
    });

    // ✅ Fetch allowed providers for this client
    async function fetchProviders() {
      const { data, error } = await supabase
        .from("mygroup")
        .select("bandallowed")
        .eq("name", principal.client)
        .single();

      if (!error && data?.bandallowed) {
        const bands = data.bandallowed.split(",").map(b => b.trim());
        const { data: hospData, error: hospError } = await supabase
          .from("myhospitals")
          .select("name")
          .in("band", bands);

        if (!hospError && hospData) {
          setHospitalOptions(hospData.map(h => h.name));
        } else {
          setHospitalOptions([]);
        }
      }
    }

    fetchProviders();
  }
}, [principal]);
  // ✅ Generate dependant policy ID
  function generateDependantPolicyId(principalPolicyId) {
    if (!principalPolicyId) return "";
    // Replace /0 with /1 (or next number)
    return principalPolicyId.replace("/0", "/1");
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError("File size must be less than 1MB.");
      return;
    }
    setPhotoFile(file);
    setError("");
  }
  async function handleSave() {
    setError("");

    let photoUrl = form.photopart;

    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", import.meta.env.VITE_UPLOAD_PRESET);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_NAME}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        if (data.secure_url) {
          photoUrl = data.secure_url;
        } else {
          setError("Failed to upload photo.");
          return;
        }
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        setError("Photo upload failed.");
        return;
      }
    }

    const { error: insertError } = await supabase
      .from("myenrolment")
      .insert([{ ...form, photopart: photoUrl }]);

    if (insertError) {
      console.error("Error adding dependant:", insertError);
      setError("Failed to add dependant.");
    } else {
      setError("");
      onAdded();
      onClose();
    }
  }

  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Dependant</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Editable fields only */}
            <div className="mb-3">
              <label className="form-label">Dependant Name</label>
              <input
                type="text"
                name="enrolleename"
                value={form.enrolleename || ""}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Depenadant name"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                value={form.gender || ""}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Policy ID</label>
              <input
                type="text"
                name="policyid"
                value={form.policyid || ""}
                onChange={handleChange}
                className="form-control"
                readOnly
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Old Policy</label>
              <input
                type="text"
                name="oldpolicy"
                value={form.oldpolicy || ""}
                onChange={handleChange}
                className="form-control"
              />
            </div>

      <div className="mb-3">
  <label className="form-label">Provider</label>
  <select
    name="provider"
    value={form.provider || ""}
    onChange={handleChange}
    className="form-select"
  >
    <option value="">Select Provider</option>
    {hospitalOptions.map(h => (
      <option key={h} value={h}>
        {h}
      </option>
    ))}
  </select>
</div>


            <div className="mb-3">
              <label className="form-label">Marital Status</label>
              <select
                name="maritalstatus"
                value={form.maritalstatus || ""}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Photo</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
              {photoFile && (
                <div className="mt-2 text-center">
                  {" "}
                  <img
                    src={URL.createObjectURL(photoFile)}
                    alt="Preview"
                    style={{ maxWidth: "150px", borderRadius: "8px" }}
                  />{" "}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Dependant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
