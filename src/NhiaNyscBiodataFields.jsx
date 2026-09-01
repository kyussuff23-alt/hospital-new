import React from "react";

export default function NhiaNyscBiodataFields({ biodata, setBiodata, hospitalName, hcpCode }) {
  const updateField = (e) => {
    setBiodata({ ...biodata, [e.target.name]: e.target.value });
  };

  return (
    <div className="mb-4">
      <h5 className="text-xs fw-black text-uppercase text-primary tracking-wider pb-2 border-b border-light d-flex align-items-center gap-2 mb-3">
        <i className="bi bi-person-lines-fill fs-6"></i> 1. Enrollee Demographics Profile
      </h5>
      
      <div className="row g-3">
        {/* Full Name Input */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">Full Name <span className="text-danger">*</span></label>
          <input
            name="enrolleename"
            type="text"
            required
            value={biodata.enrolleename}
            onChange={updateField}
            placeholder="Corps Member Name"
            className="form-control border p-2.5 text-sm"
          />
        </div>

        {/* Gender Selection Menu */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">Gender Option <span className="text-danger">*</span></label>
          <select
            name="gender"
            required
            value={biodata.gender}
            onChange={updateField}
            className="form-select border p-2.5 text-sm bg-white"
          >
            <option value="">-- Choose Option --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Mandatory NHIA ID string */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">NHIA Number <span className="text-danger">*</span></label>
          <input
            name="nhiaNumber"
            type="text"
            required
            value={biodata.nhiaNumber}
            placeholder="e.g. 12345678-0"
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9-]/g, "");
              setBiodata({ ...biodata, nhiaNumber: clean });
            }}
            className="form-control border p-2.5 text-sm font-monospace text-uppercase"
          />
        </div>

        {/* Call Up Code input string */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">Call-Up Code <span className="text-danger">*</span></label>
          <input
            name="callUpNumber"
            type="text"
            required
            value={biodata.callUpNumber}
            placeholder="NYSC/XYZ/2026/0192"
            onChange={(e) => {
              let inputVal = e.target.value.toUpperCase();
              if (!inputVal.startsWith("NYSC/")) {
                inputVal = "NYSC/" + inputVal.replace(/^NYSC\/?/i, "");
              }
              const clean = inputVal.replace(/[^A-Z0-9/]/g, "");
              setBiodata({ ...biodata, callUpNumber: clean });
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && e.target.value.length <= 5) {
                e.preventDefault();
              }
            }}
            className="form-control border p-2.5 text-sm font-monospace text-uppercase"
          />
        </div>

        {/* State Code identifier parameters */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">State Code <span className="text-danger">*</span></label>
          <input
            name="stateCode"
            type="text"
            required
            value={biodata.stateCode}
            placeholder="e.g. LA/26A/4081"
            onChange={(e) => {
              const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9/]/g, "");
              setBiodata({ ...biodata, stateCode: clean });
            }}
            className="form-control border p-2.5 text-sm font-monospace text-uppercase"
          />
        </div>

        {/* National NIN key entry */}
        <div className="col-12 col-md-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">NIN <span className="text-danger">*</span></label>
          <input
            name="nin"
            type="text"
            required
            maxLength={11}
            value={biodata.nin}
            placeholder="e.g. 11 DIGIT NUMBER"
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9]/g, "");
              setBiodata({ ...biodata, nin: clean });
            }}
            className="form-control border p-2.5 text-sm font-monospace text-uppercase"
          />
        </div>
        {/* Deployment Batch Selection choice */}
        <div className="col-12 col-sm-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">Service Batch <span className="text-danger">*</span></label>
          <select
            name="batch"
            required
            value={biodata.batch}
            onChange={updateField}
            className="form-select border p-2.5 text-sm bg-white"
          >
            <option value="">-- Choose Batch --</option>
            <option value="Batch A">Batch A</option>
            <option value="Batch B">Batch B</option>
            <option value="Batch C">Batch C</option>
            <option value="Batch D">Batch D</option>
            <option value="Batch E">Batch E</option>
          </select>
        </div>

        {/* Stream deployment layout options */}
        <div className="col-12 col-sm-6 mb-2">
          <label className="form-label text-xs fw-bold text-uppercase text-secondary mb-1">Stream Node Layer <span className="text-danger">*</span></label>
          <select
            name="stream"
            required
            value={biodata.stream}
            onChange={updateField}
            className="form-select border p-2.5 text-sm bg-white"
          >
            <option value="">-- Choose Stream --</option>
            <option value="Stream I">Stream 1</option>
            <option value="Stream II">Stream 2</option>
            <option value="Stream III">Stream 3</option>
            <option value="Stream IV">Stream 4</option>
          </select>
        </div>

        {/* Optional contact line phone details */}
        <div className="col-12 mb-2">
          <label className="form-label text-xs fw-bold text-secondary mb-1">Contact Line <span className="text-muted fw-normal">(Optional)</span></label>
          <input
            name="phoneNumber"
            type="tel"
            value={biodata.phoneNumber}
            onChange={updateField}
            placeholder="e.g. 0803XXXXXXX"
            className="form-control border p-2.5 text-sm"
          />
        </div>

        {/* Prefilled Locked Institutional Context Indicators */}
        <div className="col-12 col-sm-6 mb-2">
          <label className="form-label text-xs fw-bold text-muted text-uppercase mb-1">Provider Node</label>
          <input 
            type="text" 
            disabled 
            value={hospitalName || "Not Assigned"} 
            className="form-control bg-light border p-2.5 text-sm font-semibold text-uppercase text-truncate" 
          />
        </div>
        
        <div className="col-12 col-sm-6 mb-2">
          <label className="form-label text-xs fw-bold text-muted text-uppercase mb-1">Node HCP Identifier</label>
          <input 
            type="text" 
            disabled 
            value={hcpCode || "N/A"} 
            className="form-control bg-light border p-2.5 text-sm font-monospace text-uppercase text-truncate" 
          />
        </div>
      </div>
    </div>
  );
}
