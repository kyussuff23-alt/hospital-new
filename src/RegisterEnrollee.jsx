import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RegisterEnrollee({ onClose, onRegistered }) {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [familyStatuses, setFamilyStatuses] = useState([]);
  const [error, setError] = useState("");
  const [formDisabled, setFormDisabled] = useState(false);
 const [providers, setProviders] = useState([]);  // NEW state
 const [providerOptions, setProviderOptions] = useState([]);
const [bandOptions, setBandOptions] = useState([]);
const [hospitalOptions, setHospitalOptions] = useState([]);
const [planOptions, setPlanOptions] = useState([]);
const [familyStatusOptions, setFamilyStatusOptions] = useState([]);



  const [form, setForm] = useState({
    client: "",
    enrolleename: "",
    policyid: "",
    oldpolicy: "",
    familystatus: "",
    plan: "",
    gender: "",
    maritalstatus: "",
    phonenumber: "",
    email: "",
    address: "",
    photopart: "", // Cloudinary photo URL
    provider:"",
  });

 
 async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ Limit size to 1MB
  if (file.size > 1024 * 1024) {
    setError("File size must be less than 1MB.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.secure_url) {
      // ✅ Save Cloudinary URL into form state
      setForm({ ...form, photopart: data.secure_url });
      setError("");
    } else {
      setError("Failed to upload photo.");
    }
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    setError("Photo upload failed.");
  }
}

 
 
useEffect(() => {
  async function fetchDropdowns() {
    try {
      const { data, error } = await supabase
        .from("mygroup")
        .select("name, plan, familystatus, activate");

      if (error) {
        console.error("Error fetching dropdowns:", error);
        setError("Failed to load dropdown values.");
        return;
      }

      if (data) {
        // ✅ Clients list
        setClients(data.map(d => ({ name: d.name, activate: d.activate })));

        // ✅ Collect all plan values (split by commas if needed)
        const allPlans = data
          .flatMap(d => (d.plan ? d.plan.split(",").map(p => p.trim()) : []));
        setPlans([...new Set(allPlans)]);

        // ✅ Collect all family status values (split by commas if needed)
        const allStatuses = data
          .flatMap(d => (d.familystatus ? d.familystatus.split(",").map(fs => fs.trim()) : []));
        setFamilyStatuses([...new Set(allStatuses)]);
      }
    } catch (err) {
      console.error("Unexpected error fetching dropdowns:", err);
      setError("Something went wrong while loading dropdowns.");
    }
  }

  fetchDropdowns();
}, []);

  // Form validation
 
 function validateForm() {
  if (!form.familystatus) {
    setError("Family Status is required.");
    return false;
  }
  if (!form.plan) {
    setError("Plan is required.");
    return false;
  }
  if (!form.provider) {
    setError("Provider is required.");
    return false;
  }
  return true;
}




  useEffect(() => {
  async function fetchDropdowns() {
    const { data, error } = await supabase
      .from("mygroup")
      .select("name, plan, familystatus, activate, bandallowed");  // include bandallowed
    if (!error && data) {
      setClients(data.map(d => ({ name: d.name, activate: d.activate })));
      setPlans([...new Set(data.map(d => d.plan))]);
      setFamilyStatuses([...new Set(data.map(d => d.familystatus))]);
      setProviders([...new Set(data.map(d => d.bandallowed))]);   // unique provider values
    }
  }
  fetchDropdowns();
}, []);

 
 // Handle logic of hospital and client in enrolment form 


async function handleClientChange(e) {
  const selected = e.target.value;

  const { data, error } = await supabase
    .from("mygroup")
    .select("activate, bandallowed, plan, familystatus")
    .eq("name", selected)
    .single();

  if (error) {
    console.error("Error checking client status:", error);
    setError("Failed to validate client. Try again.");
    return;
  }

  const activateValue = data?.activate;
  const isActive =
    String(activateValue).toLowerCase() === "active" ||
    String(activateValue).toLowerCase() === "true" ||
    String(activateValue) === "1";

  if (!isActive) {
    setError("This client is inactive. Contact admin.");
    setFormDisabled(true);
    setForm({ ...form, client: selected, provider: "", plan: "", familystatus: "" });
    setHospitalOptions([]);
    setPlanOptions([]);
    setFamilyStatusOptions([]);
    return;
  }

  // ✅ Active client
  setError("");
  setFormDisabled(false);
  setForm({ ...form, client: selected });

  // ✅ Provider logic: bandallowed → hospitals (single query)
  if (data?.bandallowed) {
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
  } else {
    setHospitalOptions([]);
  }

  // ✅ Plan logic
  if (data?.plan) {
    const plans = data.plan.split(",").map(p => p.trim());
    setPlanOptions(plans);
  } else {
    setPlanOptions([]);
  }

  // ✅ Family Status logic
  if (data?.familystatus) {
    const statuses = data.familystatus.split(",").map(fs => fs.trim());
    setFamilyStatusOptions(statuses);
  } else {
    setFamilyStatusOptions([]);
  }
}



  // Handle enrollee name (capitalize each word)


  function handleNameChange(e) {
    const value = e.target.value
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    setForm({ ...form, enrolleename: value });
  }

  // Generate policy ID when client + plan chosen
  function generatePolicyId(client, plan) {
    if (!client || !plan) return "";
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const planPrefix = plan.slice(0, 2).toUpperCase();
    return `51/${client}/${randomSix}/0/${planPrefix}`;
  }


// When plan is chosen
function handlePlanChange(e) {
  const selectedPlan = e.target.value;
  const newPolicyId = generatePolicyId(form.client, selectedPlan);

  setForm({
    ...form,
    plan: selectedPlan,
    policyid: newPolicyId,
  });
}



  function handlePlanChange(e) {
    const plan = e.target.value;
    const policyid = generatePolicyId(form.client, plan);
    setForm({ ...form, plan, policyid });
  }

  // Handle photo upload to Cloudinary
 
 
 const [photoFile, setPhotoFile] = useState(null);

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    setError("File size must be less than 1MB.");
    return;
  }

  setPhotoFile(file); // ✅ only store file, don’t upload yet
  setError("");
}


  // Save enrollee
async function handleSave() {
  setError("");

  // Frontend validation
  if (!form.familystatus) {
    setError("Family Status is required.");
    return;
  }
  if (!form.plan) {
    setError("Plan is required.");
    return;
  }
  if (!form.provider) {
    setError("Provider is required.");
    return;
  }

  let photoUrl = form.photopart;

  // ✅ Upload photo only at save time
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

  // ✅ Insert into Supabase with photo URL
  const { error: insertError } = await supabase
    .from("myenrolment")
    .insert([{ ...form, photopart: photoUrl }]);

  if (insertError) {
    console.error("Error inserting enrollee:", insertError);
    setError("Failed to register enrollee.");
  } else {
    setError("");
    onRegistered();
    onClose();
  }
}

  return (
    <div className="modal d-block">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Register Enrollee</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            


{/* Photo Upload */}
<div className="mb-3">
  <label className="form-label">Photo</label>
  <input
    type="file"
    disabled={formDisabled}
    className="form-control"
    accept="image/*"
    onChange={handlePhotoSelect} // ✅ only select, don’t upload
  />
  {photoFile && (
    <div className="mt-2 text-center">
      <img
        src={URL.createObjectURL(photoFile)}
        alt="Preview"
        style={{ maxWidth: "150px", borderRadius: "8px" }}
      />
      <small className="text-info d-block">Photo ready to upload</small>
    </div>
  )}
</div>



            {/* Client dropdown */}
            <div className="mb-3">
              <label className="form-label">Client</label>
              <select className="form-select" value={form.client} onChange={handleClientChange}>
                <option value="">Select Client</option>
                {clients.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Enrollee Name */}
            <div className="mb-3">
              <label className="form-label">Enrollee Name</label>
              <input type="text" disabled = {formDisabled} className="form-control" value={form.enrolleename} onChange={handleNameChange} />
            </div>

            {/* Policy ID (auto-generated) */}
            <div className="mb-3">
              <label className="form-label">Policy ID</label>
              <input type="text" disabled = {formDisabled} className="form-control" value={form.policyid} readOnly />
            </div>

            {/* Old Policy */}
            <div className="mb-3">
              <label className="form-label">Old Policy</label>
              <input type="text" disabled = {formDisabled} className="form-control" value={form.oldpolicy} onChange={e => setForm({ ...form, oldpolicy: e.target.value })} />
            </div>

    {/* Family Status */}
{/* Family Status */}
<div className="mb-3">
  <label className="form-label">Family Status</label>
  <select
    className="form-select"
    value={form.familystatus}
    onChange={e => setForm({ ...form, familystatus: e.target.value })}
    disabled={formDisabled || familyStatusOptions.length === 0}
    required
  >
    <option value="">Select Family Status</option>
    {familyStatusOptions.map(fs => (
      <option key={fs} value={fs}>{fs}</option>
    ))}
  </select>
</div>



            {/* Plan */}
           {/* Plan */}
<select
  className="form-select"
  value={form.plan}
  onChange={handlePlanChange}
  disabled={formDisabled || planOptions.length === 0}
>
  <option value="">Select Plan</option>
  {planOptions.map(p => (
    <option key={p} value={p}>{p}</option>
  ))}
</select>



{/* Provider */}
<div className="mb-3">
  <label className="form-label">Provider</label>
  <select
    className="form-select"
    value={form.provider}
    onChange={e => setForm({ ...form, provider: e.target.value })}
    disabled={formDisabled || hospitalOptions.length === 0}
    required
  >
    <option value="">Select Provider</option>
    {hospitalOptions.map(h => (
      <option key={h} value={h}>{h}</option>
    ))}
  </select>
</div>


           
           
            {/* Gender */}
            <div className="mb-3">
              <label className="form-label">Gender</label>
              <select className="form-select" disabled = {formDisabled} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Marital Status */}
            <div className="mb-3">
              <label className="form-label">Marital Status</label>
              <select className="form-select" disabled = {formDisabled} value={form.maritalstatus} onChange={e => setForm({ ...form, maritalstatus: e.target.value })}>
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>

            {/* Phone Number */}
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <input type="number" disabled = {formDisabled} className="form-control" value={form.phonenumber} onChange={e => setForm({ ...form, phonenumber: e.target.value })} />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input type="email" disabled = {formDisabled} className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

                        {/* Address */}
            <div className="mb-3">
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                disabled = {formDisabled}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" disabled = {formDisabled} onClick={handleSave}>
              Save
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
