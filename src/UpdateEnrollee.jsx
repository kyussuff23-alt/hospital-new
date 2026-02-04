import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import AddDependant from "./AddDependant"; // import the new file

export default function UpdateEnrollee({ enrollee, show, onClose, onUpdated }) {
  const [clients, setClients] = useState([]);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const [familyStatusOptions, setFamilyStatusOptions] = useState([]);
  const [error, setError] = useState("");
  const [formDisabled, setFormDisabled] = useState(false);
  const [showDependantModal, setShowDependantModal] = useState(false);

  const [form, setForm] = useState(
    enrollee || {
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
      photopart: "",
      provider: "",
    },
  );

  const [photoFile, setPhotoFile] = useState(null);

  // ✅ Prefill form when enrollee changes
  useEffect(() => {
    if (enrollee) {
      setForm(enrollee);
      if (enrollee.client) {
        handleClientPrefill(enrollee.client);
      }
    }
  }, [enrollee]);

  // ✅ Fetch clients list
  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from("mygroup")
        .select("name, activate");
      if (!error && data) {
        setClients(data.map((d) => ({ name: d.name, activate: d.activate })));
      }
    }
    fetchClients();
  }, []);

  

 // handler when dependant is added successfully
  function handleDependantAdded() {
    setShowDependantModal(false);
    onUpdated(); // refresh enrollee list
  }

 


  // ✅ Handle client change
  async function handleClientChange(e) {
    const selected = e.target.value;
    setForm({ ...form, client: selected });
    await handleClientPrefill(selected);
  }

  async function handleClientPrefill(selected) {
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
      setHospitalOptions([]);
      setPlanOptions([]);
      setFamilyStatusOptions([]);
      return;
    }

    setError("");
    setFormDisabled(false);

    // ✅ Provider logic
    if (data?.bandallowed) {
      const bands = data.bandallowed.split(",").map((b) => b.trim());
      const { data: hospData, error: hospError } = await supabase
        .from("myhospitals")
        .select("name")
        .in("band", bands);

      if (!hospError && hospData) {
        setHospitalOptions(hospData.map((h) => h.name));
      } else {
        setHospitalOptions([]);
      }
    } else {
      setHospitalOptions([]);
    }

    // ✅ Plan logic
    if (data?.plan) {
      const plans = data.plan.split(",").map((p) => p.trim());
      setPlanOptions(plans);
    } else {
      setPlanOptions([]);
    }

    // ✅ Family Status logic
    if (data?.familystatus) {
      const statuses = data.familystatus.split(",").map((fs) => fs.trim());
      setFamilyStatusOptions(statuses);
    } else {
      setFamilyStatusOptions([]);
    }
  }

  // ✅ Name capitalization
  function handleNameChange(e) {
    const value = e.target.value
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    setForm({ ...form, enrolleename: value });
  }

  // ✅ Policy ID generation
  function generatePolicyId(client, plan) {
    if (!client || !plan) return "";
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const planPrefix = plan.slice(0, 2).toUpperCase();
    return `51/${client}/${randomSix}/0/${planPrefix}`;
  }

  function handlePlanChange(e) {
    const plan = e.target.value;
    const policyid = generatePolicyId(form.client, plan);
    setForm({ ...form, plan, policyid });
  }

  // ✅ Photo select
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
  // ✅ Save enrollee (update instead of insert)
  async function handleSave() {
    setError("");

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

    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", import.meta.env.VITE_UPLOAD_PRESET);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_NAME}/image/upload`,
          { method: "POST", body: formData },
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

    const { error: updateError } = await supabase
      .from("myenrolment")
      .update({ ...form, photopart: photoUrl })
      .eq("id", enrollee.id);

    if (updateError) {
      console.error("Error updating enrollee:", updateError);
      setError("Failed to update enrollee.");
    } else {
      setError("");
      onUpdated();
      onClose();
    }
  }

  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Update Enrollee</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Client */}
            <div className="mb-3">
              <label className="form-label">Client</label>
              <select
                name="client"
                value={form.client || ""}
                onChange={handleClientChange}
                className="form-select"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Enrollee Name */}
            <div className="mb-3">
              <label className="form-label">Enrollee Name</label>
              <input
                type="text"
                name="enrolleename"
                value={form.enrolleename || ""}
                onChange={handleNameChange}
                className="form-control"
              />
            </div>

            {/* Old Policy */}
            <div className="mb-3">
              <label className="form-label">Old Policy</label>
              <input
                type="text"
                name="oldpolicy"
                value={form.oldpolicy || ""}
                onChange={(e) =>
                  setForm({ ...form, oldpolicy: e.target.value })
                }
                className="form-control"
              />
            </div>

            {/* Policy ID */}
            <div className="mb-3">
              <label className="form-label">Policy ID</label>
              <input
                type="text"
                name="policyid"
                value={form.policyid || ""}
                readOnly
                className="form-control"
              />
            </div>

            {/* Family Status */}
            <div className="mb-3">
              <label className="form-label">Family Status</label>
              <select
                name="familystatus"
                value={form.familystatus || ""}
                onChange={(e) =>
                  setForm({ ...form, familystatus: e.target.value })
                }
                className="form-select"
                disabled={formDisabled}
              >
                <option value="">Select Family Status</option>
                {familyStatusOptions.map((fs) => (
                  <option key={fs} value={fs}>
                    {fs}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan */}
            <div className="mb-3">
              <label className="form-label">Plan</label>
              <select
                name="plan"
                value={form.plan || ""}
                onChange={handlePlanChange}
                className="form-select"
                disabled={formDisabled}
              >
                <option value="">Select Plan</option>
                {planOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider */}
            <div className="mb-3">
              <label className="form-label">Provider</label>
              <select
                name="provider"
                value={form.provider || ""}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="form-select"
                disabled={formDisabled}
              >
                <option value="">Select Provider</option>
                {hospitalOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div className="mb-3">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                value={form.gender || ""}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="form-select"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Marital Status */}
            <div className="mb-3">
              <label className="form-label">Marital Status</label>
              <select
                name="maritalstatus"
                value={form.maritalstatus || ""}
                onChange={(e) =>
                  setForm({ ...form, maritalstatus: e.target.value })
                }
                className="form-select"
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>

            {/* Phone Number */}
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phonenumber"
                value={form.phonenumber || ""}
                onChange={(e) =>
                  setForm({ ...form, phonenumber: e.target.value })
                }
                className="form-control"
              />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-control"
              />
            </div>

            {/* Address */}
            <div className="mb-3">
              <label className="form-label">Address</label>
              <textarea
                name="address"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="form-control"
              />
            </div>

            {/* Photo */}
            <div className="mb-3">
              <label className="form-label">Photo</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
              {(photoFile || form.photopart) && (
                <div className="mt-2 text-center">
                  <img
                    src={
                      photoFile
                        ? URL.createObjectURL(photoFile)
                        : form.photopart
                    }
                    alt="Preview"
                    style={{ maxWidth: "150px", borderRadius: "8px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
            {/* Only show Add Dependant if enrollee is principal */}{" "}
            {form.policyid && form.policyid.includes("/0") && (
              <button
                className="btn btn-info"
                onClick={() => setShowDependantModal(true)}
              >
                {" "}
                Add Dependant{" "}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Dependant Modal */}
      {showDependantModal && (
        <AddDependant
          principal={form} // pass principal enrollee info
          show={showDependantModal} // control visibility
          onClose={() => setShowDependantModal(false)}
          onAdded={handleDependantAdded} // callback after dependant is saved
        />
      )}
    </div>
  );
}
