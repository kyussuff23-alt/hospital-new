import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login({ onSwitchToRegister, setIsAuthenticated, setUserRole }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    try {
      // ✅ Supabase handles authentication internally
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid email or password.");
        return;
      }

      setError("");
      if (setIsAuthenticated) setIsAuthenticated(true);

      const user = data.user;
      if (user) {
        // ✅ Fetch role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

console.log("Fetched roleData:", roleData);       // shows the full object
console.log("User role is:", roleData?.role);     // shows just the role string
console.log("Role error:", roleError);



          if (roleError) {
          console.error("Error fetching role:", roleError.message);
        } else if (roleData) {
          if (setUserRole) setUserRole(roleData.role); // ✅ update role immediately
        }
      }

      // ✅ Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="col-md-6 col-lg-4">
        <div className="card shadow-lg p-4">
          <h2 className="text-center mb-4">Login</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleLogin}>
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
            <button type="submit" className="btn btn-primary w-100">
              Login
            </button>
          </form>
          <p className="text-center mt-3">
            Don’t have an account?{" "}
            <button className="btn btn-link" onClick={onSwitchToRegister}>
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
