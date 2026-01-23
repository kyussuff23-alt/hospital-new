import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Register({ onSwitchToLogin, setIsAuthenticated, setUserRole }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e) {
    e.preventDefault();

    try {
      // ✅ Supabase handles password hashing internally
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setSuccess("");
      } else {
        const userId = data.user?.id;

        if (userId) {
          // Insert a default role (e.g., "claims") into your user_roles table
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert([{ user_id: userId, role: "claims" }]);

          if (roleError) {
            console.error("Error inserting role:", roleError.message);
            setError("User registered but role assignment failed.");
          } else {
            setSuccess("User registered successfully!");
            setUserRole("claims");          // ✅ update role immediately
            setIsAuthenticated(true);      // ✅ mark as logged in
          }
        }

        // Reset form fields
        setError("");
        setEmail("");
        setPassword("");

        // Switch back to login after success
        if (onSwitchToLogin) onSwitchToLogin();
      }
    } catch (err) {
      setError("Something went wrong during registration.");
      setSuccess("");
    }
  }

  return (
    <div className="login-page">
      <div className="container">
        <div className="container d-flex justify-content-center align-items-center min-vh-100">
          <div className="col-md-6 col-lg-4">
            <div className="login-card shadow-lg p-4">
              <h2 className="text-center mb-4">Register</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success w-100">
                  Register
                </button>
              </form>
              <p className="text-center mt-3">
                Already have an account?{" "}
                <button className="btn btn-link" onClick={onSwitchToLogin}>
                  Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
