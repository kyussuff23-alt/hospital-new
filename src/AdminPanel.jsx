import { useState } from "react";
import { supabase } from "./supabaseClient";
import bcrypt from "bcryptjs";

export default function NhiaProviderSettings() {
  const [nhiacode, setNhiacode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Hash password in browser
      const hashedPassword = await bcrypt.hash(password, 10);

      // Upsert into nhia_auth table (insert or update if nhiacode exists)
      const { data, error } = await supabase
        .from("nhia_auth")
        .upsert(
          { nhiacode, password: hashedPassword },
          { onConflict: "nhiacode" } // ensures update if nhiacode already exists
        );

      if (error) {
        console.error("Error saving:", error.message);
        setError("Failed to save provider settings.");
      } else {
        setSuccess("Provider settings saved/updated successfully.");
        setNhiacode("");
        setPassword("");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Unexpected error occurred.");
    }
  }

  return (
    <div className="p-4">
      <h3 className="mb-3 text-primary">NHIA Provider Settings</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="NHIA Code"
              value={nhiacode}
              onChange={(e) => setNhiacode(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <button type="submit" className="btn btn-primary">
              Save / Update
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
