import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthPage from "./Authpage";
import Dashboard from "./Dashboard";
import Batch from "./Batch";
import Account from "./Account";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContext";

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
