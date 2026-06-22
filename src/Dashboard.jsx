import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Provider from "./Provider";
import Batch from "./Batch";
import Account from "./Account";
import Claims from "./Claims";
import Claimstable from "./Claimstable";
import Extractclaims from "./Extractclaims";
import "bootstrap-icons/font/bootstrap-icons.css";
import logo from "./assets/nonsuch.jpg";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import Utilization from "./Utilization";
import GroupEnrolment from "./GroupEnrolment";
import Enrolment from "./Enrolment";
import Authorization from "./Authorization";
import PendingAuth from "./PendingAuth";

import { Bar } from "react-chartjs-2";


import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { user, userRole, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("provider");
  const [showMenu, setShowMenu] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);


  // Extractclaims state lifted up
  const [hcpcode, setHcpcode] = useState("");
  const [ticket, setTicket] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [claims, setClaims] = useState([]);

 
 useEffect(() => {
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("authrequest")
      .select("id")
      .eq("status", "pending");

    if (!error && data) {
      setPendingCount(data.length);
    }
  };

  fetchPending();

  const channel = supabase
    .channel("authrequest-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "authrequest" },
      () => {
        fetchPending(); // refresh count whenever table changes
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

 
 
  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate("/");
  }

  const handleProfileClick = () => setShowMenu(!showMenu);

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        label: "Claims Processed",
        data: [30, 45, 60, 40], // ✅ Restored the array numbers here
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };



   return (
    // Master Viewport Layout Wrapper
    <div className="d-flex w-100 vh-100 overflow-hidden bg-light">
      
      {/* 1. LEFT SIDEBAR (Completely isolated scrolling) */}
      <div
        className="bg-dark text-white d-flex flex-column justify-content-between p-3"
        style={{
          width: "220px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          overflowY: "auto",
          zIndex: 1000,
          flexShrink: 0
        }}
      >
        <div>
          <div className="text-start mb-4">
            <img
              src={logo}
              alt="NONSUCH Logo"
              style={{ height: "40px", width: "120px" }}
            />
            <h6 className="mt-2">Nonsuch Portal</h6>
          </div>
          <ul className="nav flex-column">
            {[
              { key: "provider", icon: "bi-people-fill", label: "Provider" },
              { key: "batch", icon: "bi-box-seam", label: "Batch" },
              { key: "account", icon: "bi-person-circle", label: "Account" },
              { key: "claims", icon: "bi-file-earmark-medical", label: "Claims" },
              { key: "claimstable", icon: "bi-table", label: "Claimstable" },
              { key: "extractclaims", icon: "bi-search", label: "Extract Claims" },
              { key: "underwriting", icon: "bi-shield-check", label: "Underwriting" },
              { key: "groupEnrolment", icon: "bi-people", label: "Group Enrolment" },
              { key: "enrolment", icon: "bi-pencil-square", label: "Enrolment" },
              { key: "authorization", icon: "bi-check2-circle", label: "Authorization" },
            ].map((item) => (
              <li
                key={item.key}
                className="nav-item mb-2 p-2 rounded text-white"
                style={{ cursor: "pointer", transition: "0.3s" }}
                onClick={() => setActivePage(item.key)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d6efd")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                <i className={`${item.icon} me-2`}></i> {item.label}
              </li>
            ))}
         
            <li
              key="pendingauth"
              className="nav-item mb-2 p-2 rounded text-white"
              style={{ cursor: "pointer", transition: "0.3s" }}
              onClick={() => setActivePage("pendingauth")}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d6efd")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              <i className="bi-check2-circle me-2"></i> PendingAuth
              {pendingCount > 0 && (
                <span className="badge bg-danger ms-2">{pendingCount}</span>
              )}
            </li>
          </ul>
        </div>

        {/* Profile at bottom of sidebar */}
        <div className="text-center mt-4">
          <img
            alt="Profile"
            className="rounded-circle border border-primary mb-2"
            style={{ width: "60px", height: "60px", cursor: "pointer" }}
            onClick={handleProfileClick}
          />
          {showMenu && (
            <div className="mt-2">
              <button
                className="btn btn-sm btn-danger w-100"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT HAND PARENT LAYOUT PANEL */}
           {/* 2. RIGHT HAND PARENT LAYOUT PANEL */}
      {/* ⚠️ CORRECTION: Added minWidth: 0 to force this parent column box to stay bounded by the screen real estate */}
      <div 
        className="flex-grow-1 d-flex flex-column" 
        style={{ marginLeft: "220px", height: "100vh", minWidth: 0 }}
      >
        
        {/* BOX A: STATIC HEADER AND ANALYTICS ZONE */}
        <div className="p-4 bg-white border-bottom flex-shrink-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-capitalize m-0 fw-bold text-dark">{activePage}</h2>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <div className="card text-center shadow-sm h-100 border-0 bg-light">
                <div className="card-body d-flex flex-column justify-content-center py-4">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <p className="display-5 text-primary m-0 fw-bold">0000</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center shadow-sm h-100 border-0 bg-light">
                <div className="card-body d-flex flex-column justify-content-center py-4">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <p className="display-5 text-danger m-0 fw-bold">45</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100 border-0 bg-light">
                <div className="card-body py-3">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <div style={{ height: "130px", position: "relative" }}>
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOX B: DYNAMIC SUB-PAGE PANEL (The absolute scroll zone) */}
        {/* 💡 By putting overflow: auto on this fully enclosed space, any wide table will scroll internally */}
        <div 
          className="flex-grow-1 p-4"
          style={{ 
            overflowY: "auto", 
            overflowX: "auto", 
            position: "relative"
          }}
        >
          {/* Inner Safety Shield: Stops wide column pages from gathering or compacting words into rows */}
          <div style={{ minWidth: "max-content", width: "100%" }}>
            {activePage === "provider" && <Provider />}
            {activePage === "batch" && <Batch />}
            {activePage === "account" && <Account />}
            {activePage === "claims" && <Claims />}
            {activePage === "claimstable" && (
              <div className="container-fluid p-0">
                <Claimstable />
              </div>
            )}
            {activePage === "extractclaims" && (
              <Extractclaims
                hcpcode={hcpcode}
                setHcpcode={setHcpcode}
                ticket={ticket}
                setTicket={setTicket}
                dateStart={dateStart}
                setDateStart={setDateStart}
                dateEnd={dateEnd}
                setDateEnd={setDateEnd}
                claims={claims}
                setClaims={setClaims}
              />
            )}
            {activePage === "underwriting" && <Utilization />}
            {activePage === "groupEnrolment" && <GroupEnrolment />}
            {activePage === "enrolment" && <Enrolment />}
            {activePage === "authorization" && <Authorization />}
            {activePage === "pendingauth" && <PendingAuth />}
          </div>
        </div>

      </div>
    </div>
  );
}
