import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthPage from "./Authpage";
import Dashboard from "./Dashboard";
import Batch from "./Batch";
import Account from "./Account";
import Claims from "./Claims";
import Claimstable from "./Claimstable";
import Extractclaims from "./Extractclaims";
import Utilization from "./Utilization";
import GroupEnrolment from "./GroupEnrolment";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContext";
import UpdateGroup from "./UpdateGroup";
import RegisterGroup from "./RegisterGroup";
import Enrolment from "./Enrolment";
import RegisterEnrollee from "./RegisterEnrollee";
import Authorization from "./Authorization";
import UpdateEnrollee from "./UpdateEnrollee";
import AddDependant from "./AddDependant";
import UpdateRequest from "./UpdateRequest";


function ProtectedRoute({ isAuthenticated, children }) {
 
 
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  
 
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

 
 
  // Inside App.jsx
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  // 1. CRITICAL: Stop the effect if the user is not authenticated yet
  if (!isAuthenticated || !user) return; 

  // Initial fetch (only fires if user is authenticated)
  const fetchPendingCount = async () => {
    const { count, error } = await supabase
      .from("authrequest")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (!error) setPendingCount(count || 0);
  };
  fetchPendingCount();

  // Realtime subscription (only initiates once auth token is attached)
  const channel = supabase
    .channel("authrequest_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "authrequest" }, (payload) => {
      console.log("Realtime change:", payload);
      if (payload.eventType === "INSERT" && payload.new.status === "pending") {
        setPendingCount((prev) => prev + 1);
      }
      if (payload.eventType === "UPDATE") {
        if (payload.old.status === "pending" && payload.new.status !== "pending") {
          setPendingCount((prev) => prev - 1);
        }
        if (payload.old.status !== "pending" && payload.new.status === "pending") {
          setPendingCount((prev) => prev + 1);
        }
      }
      if (payload.eventType === "DELETE" && payload.old.status === "pending") {
        setPendingCount((prev) => prev - 1);
      }
    })
    .subscribe((status) => console.log("Channel status:", status));

  return () => {
    supabase.removeChannel(channel);
  };
// 2. CRITICAL: Add isAuthenticated and user to the dependency array
}, [isAuthenticated, user]); 

 
 
 
 
  useEffect(() => {
  let roleFetched = false; // guard flag

  const fetchRole = async (userId) => {
    if (roleFetched || !userId) return; // prevent duplicate calls
    roleFetched = true;

    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!error && roleData) {
      setUserRole(roleData.role);
    }
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setUser(session?.user ?? null);

    if (session?.user) {
      await fetchRole(session.user.id);
    }
    setLoading(false);
  };

  checkSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
    setUser(session?.user ?? null);
    if (session?.user) {
      fetchRole(session.user.id);
    }
    setLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, userRole, setUserRole, user,pendingCount }}>
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Dashboard /></ProtectedRoute>} />
          <Route path="/batch" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Batch /></ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Claims /></ProtectedRoute>} />
          <Route path="/claimstable" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Claimstable /></ProtectedRoute>} />
          <Route path="/extractclaims" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Extractclaims /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Account /></ProtectedRoute>} />
          <Route path="/utilization" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Utilization /></ProtectedRoute>} />
          <Route path="/group-enrolment" element={<ProtectedRoute isAuthenticated={isAuthenticated}><GroupEnrolment /></ProtectedRoute>} />
          <Route path="/updategroup" element={<ProtectedRoute isAuthenticated={isAuthenticated}><UpdateGroup /></ProtectedRoute>} />
          <Route path="/registergroup" element={<ProtectedRoute isAuthenticated={isAuthenticated}><RegisterGroup /></ProtectedRoute>} />
          <Route path="/enrolment" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Enrolment /></ProtectedRoute>} />
          <Route path="/registerenrollee" element={<ProtectedRoute isAuthenticated={isAuthenticated}><RegisterEnrollee /></ProtectedRoute>} />
          <Route path="/updateenrollee" element={<ProtectedRoute isAuthenticated={isAuthenticated}><UpdateEnrollee /></ProtectedRoute>} />
          <Route path="/authorization" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Authorization /></ProtectedRoute>} />
          <Route path="/adddependant" element={<ProtectedRoute isAuthenticated={isAuthenticated}><AddDependant /></ProtectedRoute>} />
         <Route path="/updaterequest" element={<ProtectedRoute isAuthenticated={isAuthenticated}><UpdateRequest /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}


