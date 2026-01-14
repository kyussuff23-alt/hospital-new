import { useState } from "react";
import Login from "./login";
import Register from "./Register";

export default function AuthPage({ setIsAuthenticated }) {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="container mt-5">
      {isRegister ? (
        <Register
          onSwitchToLogin={() => setIsRegister(false)}
          setIsAuthenticated={setIsAuthenticated} // ✅ passed down for Supabase session updates
        />
      ) : (
        <Login
          onSwitchToRegister={() => setIsRegister(true)}
          setIsAuthenticated={setIsAuthenticated} // ✅ passed down for Supabase session updates
        />
      )}
    </div>
  );
}
