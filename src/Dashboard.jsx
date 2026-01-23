import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Provider from "./Provider";
import Batch from "./Batch";
import Account from "./Account";

import "bootstrap-icons/font/bootstrap-icons.css";
import logo from "./assets/nonsuch.jpg";
import { supabase } from "./supabaseClient"; // 👈 import Supabase client
import { useAuth } from "./AuthContext";



export default function Dashboard() {
  
  const { userRole, isAuthenticated, setIsAuthenticated } = useAuth();
  
  const navigate = useNavigate();
  
  console.log("the type of this role is " + userRole + typeof userRole);
  
  
  const [activePage, setActivePage] = useState(null);

  async function handleLogout() {
    // ✅ Supabase logout
    await supabase.auth.signOut();
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/");
  }

  return (
    <div className="container mt-5">
      <div className="text-center mb-4">
        {/* Logo inside H1 */}
        <h1>
          <img
            src={logo}
            alt="NONSUCH Logo"
            style={{ height: "120px", width: "300px", marginRight: "10px" }}
          />
          Operation  PORTAL
        </h1>
      </div>

      {/* Beautiful paragraph */}
    
      {/* Icon row */}
      <div className="row text-center g-4 mt-4">
        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm h-100 border-0 hover-effect ${
              activePage === "provider" ? "bg-light" : ""
            }`}
            onClick={() => setActivePage("provider")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column align-items-center">
              <i className="bi bi-people-fill display-4 text-primary mb-3"></i>
              <h5 className="card-title">Provider</h5>
              <p className="card-text">Manage providers and related data.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm h-100 border-0 hover-effect ${
              activePage === "batch" ? "bg-light" : ""
            }`}
            onClick={() => setActivePage("batch")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column align-items-center">
              <i className="bi bi-box-seam display-4 text-success mb-3"></i>
              <h5 className="card-title">Batch</h5>
              <p className="card-text">View and manage batch information.</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div
            className={`card shadow-sm h-100 border-0 hover-effect ${
              activePage === "account" ? "bg-light" : ""
            }`}
            onClick={() => setActivePage("account")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-body d-flex flex-column align-items-center">
              <i className="bi bi-person-circle display-4 text-warning mb-3"></i>
              <h5 className="card-title">Account</h5>
              <p className="card-text">Manage your account settings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic content below icons */}
      <div className="mt-5">
        {activePage === "provider" && <Provider />}
        {activePage === "batch" && <Batch />}
        {activePage === "account" && <Account />}
      </div>

      {/* Logout button */}
      <div className="text-center mt-5">
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
