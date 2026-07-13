import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Provider from "./Provider";
import Batch from "./Batch";


import Account from "./Account";
import Claims from "./Claims";
import Claimstable from "./Claimstable";
import HospitalClaims from "./HospitalClaims";
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

 const [activePage, setActivePage] = useState(() => {
  return localStorage.getItem("activePage") || "provider";
});

  const [showMenu, setShowMenu] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  // ✅ Mobile state toggle tracking
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Extractclaims state lifted up
  const [hcpcode, setHcpcode] = useState("");
  const [ticket, setTicket] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [claims, setClaims] = useState([]);

 
 useEffect(() => {
  localStorage.setItem("activePage", activePage);
}, [activePage]);

 
 
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
          fetchPending();
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
        data:[351,278,451,405], // ✅ Preserved your custom array values cleanly
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };
   return (
    // Master Viewport Layout Wrapper
    <div className="d-flex flex-column flex-lg-row w-100 vh-100 overflow-hidden bg-light position-relative">
      
      {/* 📱 MOBILE TOP NAVIGATION ROW (Only visible on mobile screens via d-lg-none) */}
      <div className="d-lg-none w-100 bg-dark text-white p-3 d-flex justify-content-between align-items-center flex-shrink-0" style={{ zIndex: 1010 }}>
        <button
          className="btn btn-outline-light btn-sm d-flex align-items-center gap-2"
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <i className="bi bi-list fs-5"></i> Menu
        </button>
        <h6 className="m-0 text-capitalize fw-bold">{activePage}</h6>
      </div>

      {/* 📱 MOBILE BACKGROUND BACKDROP */}
      {isMobileSidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 d-lg-none" 
          style={{ zIndex: 1040 }}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 1. LEFT SIDEBAR */}
      <div
        className={`bg-dark text-white d-flex flex-column justify-content-between p-3 offcanvas-lg offcanvas-start ${isMobileSidebarOpen ? 'show' : ''}`}
        style={{
          width: "220px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          overflowY: "auto",
          zIndex: 1050,
          flexShrink: 0
        }}
      >
        <div>
          <div className="d-flex justify-content-between align-items-center text-start mb-4">
            <div className="text-start">
              <img
                src={logo}
                alt="NONSUCH Logo"
                style={{ height: "40px", width: "120px" }}
              />
              <h6 className="mt-2 text-white">Nonsuch Portal</h6>
            </div>
            {/* Mobile Sidebar Close Button */}
            <button 
              type="button" 
              className="btn-close btn-close-white d-lg-none" 
              aria-label="Close"
              onClick={() => setIsMobileSidebarOpen(false)}
            ></button>
          </div>
          
         <ul className="nav flex-column">
  {[
    { key: "provider", icon: "bi-people-fill", label: "Provider" },
    { key: "batch", icon: "bi-box-seam", label: "Batch" },
    { key: "account", icon: "bi-person-circle", label: "Account" },
    { key: "claims", icon: "bi-file-earmark-medical", label: "Claims" },
    { key: "claimstable", icon: "bi-table", label: "Claimstable" },
        { key: "hospitalclaims", icon: "bi-table", label: "HospitalClaims" },

    { key: "extractclaims", icon: "bi-search", label: "Extract Claims" },
    { key: "underwriting", icon: "bi-shield-check", label: "Underwriting" },
    { key: "groupEnrolment", icon: "bi-people", label: "Group Enrolment" },
    { key: "enrolment", icon: "bi-pencil-square", label: "Enrolment" },
    { key: "authorization", icon: "bi-check2-circle", label: "Authorization" },
  ]
    .filter(item => {
      if (userRole === "callcentre") {
        return ["provider","batch","account","authorization"].includes(item.key);
      }
      if (userRole === "admin") {
        return true; // show all
      }
      if (userRole === "enrolment") {
        return ["provider","batch","account","enrolment"].includes(item.key);
      }
      if (userRole === "account") {
        return ["provider","batch","account"].includes(item.key);
      }
      if (userRole === "claims") {
        return ["provider","batch","account","claimstable","hospitalclaims","extractclaims","claims"].includes(item.key);
      }
      return false;
    })
    .map((item) => (
      <li
        key={item.key}
        className="nav-item mb-2 p-2 rounded text-white"
        style={{ 
          cursor: "pointer", 
          transition: "0.3s",
          backgroundColor: activePage === item.key ? "#0d6efd" : "" 
        }}
        onClick={() => {
          setActivePage(item.key);
          setIsMobileSidebarOpen(false);
        }}
        onMouseEnter={(e) => activePage !== item.key && (e.currentTarget.style.backgroundColor = "#0d6efd")}
        onMouseLeave={(e) => activePage !== item.key && (e.currentTarget.style.backgroundColor = "")}
      >
        <i className={`${item.icon} me-2`}></i> {item.label}
      </li>
    ))}

  {/* PendingAuth is always visible for callcentre and admin */}
  {(userRole === "callcentre" || userRole === "admin") && (
    <li
      key="pendingauth"
      className="nav-item mb-2 p-2 rounded text-white"
      style={{ 
        cursor: "pointer", 
        transition: "0.3s",
        backgroundColor: activePage === "pendingauth" ? "#0d6efd" : ""
      }}
      onClick={() => {
        setActivePage("pendingauth");
        setIsMobileSidebarOpen(false);
      }}
      onMouseEnter={(e) => activePage !== "pendingauth" && (e.currentTarget.style.backgroundColor = "#0d6efd")}
      onMouseLeave={(e) => activePage !== "pendingauth" && (e.currentTarget.style.backgroundColor = "")}
    >
      <i className="bi-check2-circle me-2"></i> PendingAuth
      {pendingCount > 0 && (
        <span className="badge bg-danger ms-2">{pendingCount}</span>
      )}
    </li>
  )}
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
      <div 
        className="flex-grow-1 d-flex flex-column" 
        style={{ 
          marginLeft: window.innerWidth < 992 ? "0px" : "220px", 
          height: window.innerWidth < 992 ? "calc(100vh - 58px)" : "100vh", 
          minWidth: 0 
        }}
      >
        
        {/* BOX A: STATIC HEADER AND ANALYTICS ZONE */}
        {/* ⚠️ CORRECTION: Added Bootstrap's 'd-none d-lg-block' classes so the analytics section vanishes on phones but stays visible on desktop screen layouts */}
        <div className="d-none d-lg-block p-4 bg-white border-bottom flex-shrink-0">
          <div className="justify-content-between align-items-center mb-3">
            <h2 className="text-capitalize m-0 fw-bold text-dark">{activePage}</h2>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <div className="card text-center shadow-sm h-100 border-0 bg-light">
                <div className="card-body d-flex flex-column justify-content-center py-2">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <p className="display-5 text-primary m-0 fw-bold">0000</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center shadow-sm h-100 border-0 bg-light">
                <div className="card-body d-flex flex-column justify-content-center py-2">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <p className="display-5 text-danger m-0 fw-bold">45</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100 border-0 bg-light">
                <div className="card-body py-2">
                  <h6 className="text-muted mb-2">Analytics soon</h6>
                  <div style={{ height: "90px", position: "relative" }}>
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

        {/* BOX B: DYNAMIC SUB-PAGE PANEL (Takes full screen space on mobile phones) */}
        <div 
          className="flex-grow-1 p-3 p-lg-4"
          style={{ 
            overflowY: "auto", 
            overflowX: "auto", 
            position: "relative"
          }}
        >
        <div style={{ minWidth: "100%", width: "100%" }}>
  {activePage === "provider" && <Provider />}
  {activePage === "batch" && <Batch />}
  {activePage === "account" && <Account />}

  {(userRole === "claims" || userRole === "admin") && activePage === "claims" && <Claims />}
  {(userRole === "claims" || userRole === "admin") && activePage === "claimstable" && (
    <div className="container-fluid p-0">
      <Claimstable />
    </div>
  )}

    {(userRole === "claims" || userRole === "admin") && activePage === "hospitalclaims" && (
    <div className="container-fluid p-0">
      <HospitalClaims />
    </div>
  )}
 
 
  {(userRole === "claims" || userRole === "admin") && activePage === "extractclaims" && (
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

  {activePage === "underwriting" && userRole === "admin" && <Utilization />}
  {(userRole === "enrolment" || userRole === "admin") && activePage === "enrolment" && <Enrolment />}
  {userRole === "admin" && activePage === "groupEnrolment" && <GroupEnrolment />}
  {(userRole === "callcentre" || userRole === "admin") && activePage === "authorization" && <Authorization />}
  {(userRole === "callcentre" || userRole === "admin") && activePage === "pendingauth" && <PendingAuth />}
</div>


        </div>

      </div>
    </div>
  );
}
