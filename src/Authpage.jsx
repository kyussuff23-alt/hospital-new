import { useState } from "react";
import Login from "./login";
import Register from "./Register";

export default function Authpage({ setIsAuthenticated, setUserRole }) {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="container mt-5">
      {isRegister ? (
        <Register
          onSwitchToLogin={() => setIsRegister(false)}
          setIsAuthenticated={setIsAuthenticated} // ✅ update session
          setUserRole={setUserRole}               // ✅ update role after registration
        />
      ) : (
        <Login
          onSwitchToRegister={() => setIsRegister(true)}
          setIsAuthenticated={setIsAuthenticated} // ✅ update session
          setUserRole={setUserRole}               // ✅ update role after login
        />
      )}
    </div>
  );
}
