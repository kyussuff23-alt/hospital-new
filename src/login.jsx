import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login({ onSwitchToRegister, setIsAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const isLoggingIn = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger the entry animation instantly on mount, then stay static
    setIsVisible(true);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    
    // 🛡️ CRITICAL GUARD: Instantly abort if a request cycle is running
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        setError("Invalid email or password.");
        isLoggingIn.current = false; // Reset lock to let user attempt correction
        return;
      }

      setError("");
      setIsAuthenticated?.(true);
      navigate("/dashboard");
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      isLoggingIn.current = false; // Reset lock on error fallback
    }
    // 🛡️ REMOVED THE finally BLOCK: The lock remains true on success to 
    // block double button taps while routing to the dashboard panel takes place.
  }

  return (
    <div className="container-fluid p-0 min-vh-screen overflow-hidden bg-white">
      <div className="row g-0 min-vh-screen">
        
        {/* LEFT PANEL: Visual Marketing & Lead Generation */}
        <div className="col-lg-5 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative" style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)" }}>
          <div className="position-absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(255, 255, 255, 0.12), transparent 60%)" }}></div>
          
          {/* Brand Logo Header */}
          <div className="d-flex align-items-center gap-3 position-relative z-1">
            <div className="d-flex align-items-center justify-content-center" style={{ width: "44px", height: "44px", background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "12px" }}>
              <i className="bi bi-shield-check text-info fs-4"></i>
            </div>
            <span className="h4 m-0 fw-bold tracking-tight">PROTON <span className="text-info fw-normal fs-5">Enterprise</span></span>
          </div>

          {/* Main Value Pitch Content */}
          <div className="my-auto position-relative z-1" style={{ maxWidth: "420px" }}>
            <span className="mb-4 d-inline-block" style={{ background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#e0f2fe", fontSize: "0.75rem", fontWeight: "600", padding: "6px 14px", borderRadius: "50px" }}>NEW: Corporate Solutions</span>
            <h1 
              className="display-6 fw-bold lh-sm mb-3"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out'
              }}
            >
              Simplify healthcare management for your workforce.
            </h1>
            <p className="text-light opacity-75 fs-5">
              Automated claims processing, Authorization, Enrolment, Real-time analytics, Actuarials, Mobile integration, Payments & lot more
            </p>
          </div>

          {/* Footer CTA */}
          <div className="border-top pt-4 position-relative z-1" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <button type="button" className="btn btn-light d-inline-flex align-items-center gap-2 fw-semibold" style={{ borderRadius: "12px", padding: "10px 20px", color: "#0369a1" }}>
              Get a Demo
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Authentication Form Section */}
        <div className="col-lg-7 d-flex flex-column justify-content-center px-4 py-5 position-relative">
          
          {/* Mobile Top Indicator Logo */}
          <div className="d-flex align-items-center gap-2 d-lg-none position-absolute top-0 start-0 m-4">
            <i className="bi bi-shield-check fs-3" style={{ color: "#0284c7" }}></i>
            <span className="fw-bold h5 mb-0 text-dark">PROTON</span>
          </div>

          {/* Centered Sign In Form Wrapper */}
          <div className="w-100 mx-auto" style={{ maxWidth: "420px", paddingTop: "2rem" }}>
            <div className="mb-4 pb-2">
              <h2 className="fw-bold text-dark tracking-tight mb-1">Welcome back</h2>
              <p className="text-secondary small">Please sign in to access your dashboard.</p>
            </div>

            {/* Error Message Feedback */}
            {error && <div className="alert alert-danger rounded-3 py-2 px-3 small mb-4">{error}</div>}

            <form onSubmit={handleLogin}>
              {/* Email / ID Field */}
              <div className="mb-4">
                <label className="form-label mb-2" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Corporate Email or Member ID</label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary fs-5"></i>
                  <input 
                    type="email" 
                    required 
                    className="form-control" 
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 16px 12px 45px", borderRadius: "12px" }} 
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label m-0" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                  <a href="#" className="small text-decoration-none fw-medium" style={{ color: "#0284c7" }}>Forgot password?</a>
                </div>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary fs-5"></i>
                  <input 
                    type="password" 
                    required 
                    autoComplete="current-password"
                    className="form-control" 
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 16px 12px 45px", borderRadius: "12px" }} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Remember Me Utility */}
              <div className="mb-4 d-flex align-items-center">
                <input type="checkbox" id="rememberDevice" className="form-check-input m-0 me-2" style={{ cursor: "pointer" }} />
                <label htmlFor="rememberDevice" className="form-check-label small text-secondary" style={{ cursor: "pointer" }}>Keep me logged in on this device</label>
              </div>

              {/* Login Submission Button */}
              <button type="submit" className="btn w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold text-white shadow-sm" style={{ backgroundColor: "#0284c7", padding: "14px", borderRadius: "12px" }}>
                Sign In to Portal
              </button>
            </form>

            {/* Registration Redirection Route */}
            <div className="mt-5 pt-4 border-top border-light text-center">
              <p className="small text-secondary m-0">
                Don’t have an account? 
                <button 
                  type="button" 
                  className="btn btn-link p-0 ms-1 fw-semibold text-decoration-none shadow-none" 
                  onClick={onSwitchToRegister} 
                  style={{ color: "#0284c7", fontSize: "0.875rem", verticalAlign: "baseline" }}
                >
                  Register
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
