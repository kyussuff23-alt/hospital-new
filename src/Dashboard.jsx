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

// Register ChartJS modules globally
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { user, userRole, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Navigation active layout tracker tracking parameters
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem("activePage") || "provider";
  });
  const [showMenu, setShowMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ✅ ANALYTICS HOOK STATES: Storage scoreboards tracking variables
  const [dailyRequestsCount, setDailyRequestsCount] = useState(0);
  const [monthlyRequestsCount, setMonthlyRequestsCount] = useState(0);
  const [dailyProcessedCount, setDailyProcessedCount] = useState(0);
  const [monthlyProcessedCount, setMonthlyProcessedCount] = useState(0);
  const [dailyCostTotal, setDailyCostTotal] = useState(0);
  const [monthlyCostTotal, setMonthlyCostTotal] = useState(0);

  // Chart state structures
  const [hospChartLabels, setHospChartLabels] = useState([]);
  const [hospChartValues, setHospChartValues] = useState([]);
    // Executive Timeframe Toggle variable layout selector slider

  // ✅ ADD THIS STATE: Controls the Underwriting deep-dive modal visibility
  const [showUnderwritingModal, setShowUnderwritingModal] = useState(false);


  // Extractclaims state parameters lifted up cleanly
  const [hcpcode, setHcpcode] = useState("");
  const [ticket, setTicket] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [claims, setClaims] = useState([]);

  // Executive Timeframe Toggle variable layout selector slider
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("monthly");

  // Keep track of active window context layouts
  useEffect(() => {
    localStorage.setItem("activePage", activePage);
  }, [activePage]);
  // Pending Claims Realtime Channel Counter
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

  // Analytics Reducer Loop Pipeline (API -> Tally -> State)
  useEffect(() => {
    const loadDashboardAnalytics = async () => {
      const { data, error } = await supabase
        .from("dashboard_analytics_base")
        .select("*");
        
      if (error) {
        console.error("Analytics View Fetch Error:", error.message);
        return;
      }
      
      if (data && data.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const currentMonthLabel = new Date().toLocaleString("en-US", { month: "short" });

        const analyticsSummary = data.reduce((acc, row) => {
          const isToday = row.daily_date === todayStr;
          const isThisMonth = row.monthly_label === currentMonthLabel;
          const isProcessed = row.status === "approved" || row.status === "processed";

          if (isToday) acc.dailyRequests += 1;
          if (isThisMonth) acc.monthlyRequests += 1;
          if (isToday && isProcessed) acc.dailyProcessed += 1;
          if (isThisMonth && isProcessed) acc.monthlyProcessed += 1;
          if (isToday && isProcessed) acc.dailyCost += Number(row.request_total_cost || 0);
          if (isThisMonth && isProcessed) acc.monthlyCost += Number(row.request_total_cost || 0);

          const hospital = row.hospname || "Unknown Hospital";
          acc.hospitalVolume[hospital] = (acc.hospitalVolume[hospital] || 0) + 1;
          return acc;
        }, { dailyRequests: 0, monthlyRequests: 0, dailyProcessed: 0, monthlyProcessed: 0, dailyCost: 0, monthlyCost: 0, hospitalVolume: {} });

        const sortedHospitals = Object.keys(analyticsSummary.hospitalVolume)
          .sort((a, b) => analyticsSummary.hospitalVolume[b] - analyticsSummary.hospitalVolume[a])
          .slice(0, 5);
        const matchingVolumes = sortedHospitals.map(h => analyticsSummary.hospitalVolume[h]);

        setDailyRequestsCount(analyticsSummary.dailyRequests);
        setMonthlyRequestsCount(analyticsSummary.monthlyRequests);
        setDailyProcessedCount(analyticsSummary.dailyProcessed);
        setMonthlyProcessedCount(analyticsSummary.monthlyProcessed);
        setDailyCostTotal(analyticsSummary.dailyCost);
        setMonthlyCostTotal(analyticsSummary.monthlyCost);
        setHospChartLabels(sortedHospitals);
        setHospChartValues(matchingVolumes);
      }
    };
    loadDashboardAnalytics();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate("/");
  }

  const handleProfileClick = () => setShowMenu(!showMenu);

  return (
    <div className="d-flex flex-column flex-lg-row w-100 vh-100 overflow-hidden bg-light position-relative">
      
      {/* 📱 MOBILE TOP NAVIGATION ROW */}
      <div className="d-lg-none w-100 bg-dark text-white p-3 d-flex justify-content-between align-items-center flex-shrink-0" style={{ zIndex: 1010 }}>
        <button className="btn btn-outline-light btn-sm d-flex align-items-center gap-2" type="button" onClick={() => setIsMobileSidebarOpen(true)}>
          <i className="bi bi-list fs-5"></i> Menu
        </button>
        <h6 className="m-0 text-capitalize fw-bold">{activePage}</h6>
      </div>

      {/* 📱 MOBILE BACKGROUND BACKDROP */}
      {isMobileSidebarOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 d-lg-none" style={{ zIndex: 1040 }} onClick={() => setIsMobileSidebarOpen(false)} />
      )}
      {/* 1. LEFT SIDEBAR PANEL */}
      <div className={`bg-dark text-white d-flex flex-column justify-content-between p-3 offcanvas-lg offcanvas-start ${isMobileSidebarOpen ? 'show' : ''}`} style={{ width: "220px", height: "100vh", position: "fixed", top: 0, left: 0, overflowY: "auto", zIndex: 1050, flexShrink: 0 }}>
        <div>
          <div className="d-flex justify-content-between align-items-center text-start mb-4">
            <div className="text-start">
              <img src={logo} alt="NONSUCH Logo" style={{ height: "40px", width: "120px" }} />
              <h6 className="mt-2 text-white">Nonsuch Portal</h6>
            </div>
            <button type="button" className="btn-close btn-close-white d-lg-none" aria-label="Close" onClick={() => setIsMobileSidebarOpen(false)}></button>
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
              if (userRole === "callcentre") return ["provider","batch","account","authorization"].includes(item.key);
              if (userRole === "admin") return true;
              if (userRole === "enrolment") return ["provider","batch","account","enrolment"].includes(item.key);
              if (userRole === "account") return ["provider","batch","account"].includes(item.key);
              if (userRole === "claims") return ["provider","batch","account","claimstable","hospitalclaims","extractclaims","claims"].includes(item.key);
              return false;
            })
            .map((item) => (
              <li key={item.key} className="nav-item mb-2 p-2 rounded text-white" style={{ cursor: "pointer", transition: "0.3s", backgroundColor: activePage === item.key ? "#0d6efd" : "" }} onClick={() => { setActivePage(item.key); setIsMobileSidebarOpen(false); }} onMouseEnter={(e) => activePage !== item.key && (e.currentTarget.style.backgroundColor = "#0d6efd")} onMouseLeave={(e) => activePage !== item.key && (e.currentTarget.style.backgroundColor = "")}>
                <i className={`${item.icon} me-2`}></i> {item.label}
              </li>
            ))}
            
            {(userRole === "callcentre" || userRole === "admin") && (
              <li key="pendingauth" className="nav-item mb-2 p-2 rounded text-white" style={{ cursor: "pointer", transition: "0.3s", backgroundColor: activePage === "pendingauth" ? "#0d6efd" : "" }} onClick={() => { setActivePage("pendingauth"); setIsMobileSidebarOpen(false); }} onMouseEnter={(e) => activePage !== "pendingauth" && (e.currentTarget.style.backgroundColor = "#0d6efd")} onMouseLeave={(e) => activePage !== "pendingauth" && (e.currentTarget.style.backgroundColor = "")}>
                <i className="bi-check2-circle me-2"></i> PendingAuth {pendingCount > 0 && <span className="badge bg-danger ms-2">{pendingCount}</span>}
              </li>
            )}
          </ul>
        </div>
        
        <div className="text-center mt-4">
          <img alt="Profile" className="rounded-circle border border-primary mb-2" style={{ width: "60px", height: "60px", cursor: "pointer" }} onClick={handleProfileClick} />
          {showMenu && (
            <div className="mt-2">
              <button className="btn btn-sm btn-danger w-100" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
      {/* 2. RIGHT HAND PARENT LAYOUT PANEL */}
      <div className="flex-grow-1 d-flex flex-column" style={{ marginLeft: window.innerWidth < 992 ? "0px" : "220px", height: window.innerWidth < 992 ? "calc(100vh - 58px)" : "100vh", minWidth: 0 }}>
        
        {/* BOX A: DESKTOP STATIC HEADER AND BEAUTIFIED ANALYTICS ZONE */}
       {/* BOX A: DESKTOP STATIC HEADER AND BEAUTIFIED ANALYTICS ZONE */}
<div className="d-none d-lg-block p-4 bg-white border-bottom flex-shrink-0">
  <div className="d-flex justify-content-between align-items-center mb-3">
    <div className="d-flex align-items-baseline gap-3">
      <h2 className="text-capitalize m-0 fw-bold text-dark">{activePage}</h2>
      {/* ✅ REAL ENGINEERING: Dynamic manager calendar label overlay */}
      <span className="badge bg-light text-secondary border rounded-pill px-3 py-2 fw-semibold shadow-sm">
        <i className="bi bi-calendar3 me-2 text-primary"></i>
        {analyticsTimeframe === "daily" ? "Today" : new Date().toLocaleString("en-NG", { month: "long", year: "numeric" })}
      </span>
    </div>
    
    {/* Pill Slider Timeframe Toggle (Kept exactly as you wrote it) */}
    <div className="btn-group btn-group-sm rounded-pill shadow-sm bg-light p-1 border">
      <button 
        type="button"
        className={`btn rounded-pill px-3 border-0 ${analyticsTimeframe === "daily" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
        onClick={() => setAnalyticsTimeframe("daily")}
      >
        Today
      </button>
      <button 
        type="button"
        className={`btn rounded-pill px-3 border-0 ${analyticsTimeframe === "monthly" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
        onClick={() => setAnalyticsTimeframe("monthly")}
      >
        Monthly Overview
      </button>
    </div>
  </div>

          <div className="row g-3">
            {/* Card 1: Total Request Traffic Card Component */}
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-3 bg-gradient bg-primary text-white h-100 overflow-hidden">
                <div className="card-body p-3 d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-white-50 small text-uppercase fw-bold tracking-wider">Total Request Volume</span>
                    <h3 className="display-6 fw-bold mt-1 mb-0">
                      {analyticsTimeframe === "daily" ? dailyRequestsCount : monthlyRequestsCount}
                    </h3>
                  </div>
                  <div className="mt-2 pt-2 border-top border-white-10 d-flex justify-content-between align-items-center">
                    <small className="text-white-50">Status: Live Syncing</small>
                    <i className="bi bi-arrow-up-right-circle text-white-50 fs-5"></i>
                  </div>
                </div>
              </div>
            </div>


            

            {/* Card 2: Processed claims tracker */}
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-3 bg-gradient bg-success text-white h-100 overflow-hidden">
                <div className="card-body p-3 d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-white-50 small text-uppercase fw-bold tracking-wider">Processed Volume</span>
                    <h3 className="display-6 fw-bold mt-1 mb-0">
                      {analyticsTimeframe === "daily" ? dailyProcessedCount : monthlyProcessedCount}
                    </h3>
                  </div>
                  <div className="mt-2 pt-2 border-top border-white-10 d-flex justify-content-between align-items-center">
                    <small className="text-white-50">Approved Claims</small>
                    <i className="bi bi-check-circle text-white-50 fs-5"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Claims Paid Value Metrics */}
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-3 bg-gradient bg-dark text-white h-100 overflow-hidden">
                <div className="card-body p-3 d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-white-50 small text-uppercase fw-bold tracking-wider">Total Claims Value</span>
                    <h4 className="fw-bold mt-2 mb-0 text-truncate text-warning" style={{ fontSize: "1.45rem" }}>
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
                        analyticsTimeframe === "daily" ? dailyCostTotal : monthlyCostTotal
                      )}
                    </h4>
                  </div>
                  <div className="mt-2 pt-2 border-top border-white-10 d-flex justify-content-between align-items-center">
                    <small className="text-white-50">Naira Currency Base</small>
                    <i className="bi bi-cash-stack text-white-50 fs-5"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Top Hospital Chart Area (Micro Layout format for executive readability) */}
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
                <div className="card-body p-2 d-flex flex-column justify-content-between">
                  <span className="text-muted small fw-bold px-1 d-block mb-1">Top Volumes by Hospital</span>
                  <div style={{ height: "68px", position: "relative" }}>
                    <Bar 
                      data={{
                        labels: hospChartLabels,
                        datasets: [{
                          label: "Requests submitted",
                          data: hospChartValues,
                          backgroundColor: "rgba(13, 110, 253, 0.8)",
                          borderRadius: 4
                        }]
                      }} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: { 
                          x: { display: false }, 
                          y: { display: false, beginAtZero: true } 
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* BOX B: DYNAMIC SUB-PAGE PANEL (Takes full screen space on mobile phones) */}
        <div className="flex-grow-1 p-3 p-lg-4" style={{ overflowY: "auto", overflowX: "auto", position: "relative" }}>
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
                hcpcode={hcpcode} setHcpcode={setHcpcode} 
                ticket={ticket} setTicket={setTicket} 
                dateStart={dateStart} setDateStart={setDateStart} 
                dateEnd={dateEnd} setDateEnd={setDateEnd} 
                claims={claims} setClaims={setClaims} 
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
