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

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const fetchRole = async (userId) => {
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

    if (session?.user) {
      await fetchRole(session.user.id);
    }
    setLoading(false); // ✅ clear loading after initial check
  };

  checkSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
    if (session?.user) {
      fetchRole(session.user.id);
    }
    setLoading(false); // ✅ clear loading here too
  });

  return () => subscription.unsubscribe();
}, []);


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, userRole, setUserRole }}>
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
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
