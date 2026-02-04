import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthPage from "./Authpage";
import Dashboard from "./Dashboard";
import Batch from "./Batch";
import Account from "./Account";
import Utilization from "./Utilization";
import GroupEnrolment from "./GroupEnrolment";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContext";
import UpdateGroup from "./UpdateGroup";
import RegisterGroup from "./RegisterGroup";
import Enrolment from "./Enrolment";
import RegisterEnrollee from "./RegisterEnrollee";
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
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      if (session?.user) {
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (!error && roleData) {
          setUserRole(roleData.role);
        }
      }

      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);

      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserRole(data.role);
          });
      }
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
      {/* Public AuthPage */}
      <Route
        path="/"
        element={
          <AuthPage
            setIsAuthenticated={setIsAuthenticated}
            setUserRole={setUserRole}
          />
        }
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Batch */}
      <Route
        path="/batch"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Batch />
          </ProtectedRoute>
        }
      />

      {/* Protected Account */}
      <Route
        path="/account"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Account />
          </ProtectedRoute>
        }
      />

      {/* ✅ Protected Utilization */}
      <Route
        path="/utilization"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Utilization />
          </ProtectedRoute>
        }
      />

      {/* ✅ Protected Group Enrolment */}
      <Route
        path="/group-enrolment"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <GroupEnrolment />
          </ProtectedRoute>
        }
      />

      
      {/* ✅ Protected Update Group */}
      <Route
        path="/updategroup"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <UpdateGroup />
          </ProtectedRoute>
        }
      />
      
      
      {/* ✅ Protected Register Group */}
      <Route
        path="/registergroup"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <RegisterGroup />
          </ProtectedRoute>
        }
      />
      
       {/* ✅ Protected Register Group */}
      <Route
        path="/enrolment"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Enrolment />
          </ProtectedRoute>
        }
      />
      
          {/* ✅ Protected Register Group */}
      <Route
        path="/registerenrollee"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <RegisterEnrollee />
          </ProtectedRoute>
        }
      />
      
          {/* ✅ Protected Register Group */}
      <Route
        path="/updateenrollee"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <UpdateEnrollee />
          </ProtectedRoute>
        }
      />
      
      
          {/* ✅ Protected Register Group */}
      <Route
        path="/adddependant"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AddDependant />
          </ProtectedRoute>
        }
      />
     
     
      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  </Router>
</AuthContext.Provider>
  );
}
