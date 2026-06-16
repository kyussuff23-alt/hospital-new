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

// ✅ FIXED 1: Your Protected Route now respects the loading state. 
// It will wait for Supabase to finish checking the session on a browser refresh.
function ProtectedRoute({ isAuthenticated, loading, children }) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-screen bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Validating Security Session...</span>
        </div>
      </div>
    );
  }

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

  // ✅ Auth session listener channel stream
  useEffect(() => {
    let roleFetched = false;

    const fetchRole = async (userId) => {
      if (roleFetched || !userId) return;
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id);
        }
      } catch (err) {
        console.error("Session verification failure:", err);
      } finally {
        setLoading(false); // Lower the loading flag no matter what
      }
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ FIXED 2: Removed the broken real-time listener block that was calling the undefined fetchRequests() function

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-screen bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Secure Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, userRole, setUserRole, user }}>
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          
          {/* ✅ FIXED 3: Passed the dynamic loading state prop into every single ProtectedRoute wrapper */}
          <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Dashboard /> </ProtectedRoute>} />
          <Route path="/batch" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Batch /> </ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Claims /> </ProtectedRoute>} />
          <Route path="/claimstable" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Claimstable /> </ProtectedRoute>} />
          <Route path="/extractclaims" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Extractclaims /> </ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Account /> </ProtectedRoute>} />
          <Route path="/utilization" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Utilization /> </ProtectedRoute>} />
          <Route path="/group-enrolment" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading} ><GroupEnrolment /></ProtectedRoute>} />
          <Route path="/updategroup" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <UpdateGroup /> </ProtectedRoute>} />
          <Route path="/registergroup" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <RegisterGroup /> </ProtectedRoute>} />
          <Route path="/enrolment" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Enrolment /> </ProtectedRoute>} />
          <Route path="/registerenrollee" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <RegisterEnrollee /> </ProtectedRoute>} />
          <Route path="/updateenrollee" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <UpdateEnrollee /> </ProtectedRoute>} />
          <Route path="/authorization" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <Authorization /> </ProtectedRoute>} />
          <Route path="/adddependant" element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}> <AddDependant /> </ProtectedRoute>} />

          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
// 💡 Note: Removed the duplicate, competing ProtectedRoute declaration that was sitting at the bottom of the file
