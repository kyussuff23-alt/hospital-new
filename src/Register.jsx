import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Register({ setIsAuthenticated, setUserRole }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      const result = await supabase.auth.signUp({ email, password });
      console.log("SignUp result:", result);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      const user = result.data?.user || result.data?.session?.user;
      if (!user) {
        setError("Registration succeeded but no user object returned.");
        return;
      }

      // Insert default role if setUserRole exists
      if (typeof setUserRole === "function") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: user.id, role: "claims" }]);

        if (roleError) {
          console.error("Error inserting role:", roleError.message);
          setError("User registered but role assignment failed.");
          return;
        }

        setUserRole("claims");
      }

      // Auto-login and go to Dashboard
      setIsAuthenticated(true);
      navigate("/dashboard");
    } catch (err) {
      console.error("Catch block error:", err);
      setError("Unexpected error during registration.");
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="col-md-6 col-lg-4">
        <div className="login-card shadow-lg p-4">
          <h2 className="text-center mb-4">Register</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-success w-100">
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
