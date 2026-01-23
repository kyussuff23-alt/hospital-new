import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ isAuthenticated, userRole, allowedRoles, loading, children }) {
  // Show a loading state while role/auth is being resolved
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Redirect if role is not allowed
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Otherwise, render the protected children
  return children;
}
