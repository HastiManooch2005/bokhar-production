
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CustomerDashboard from "../pages/CustomerDashboard";

export default function PrivateRoute() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="text-center mt-10">در حال بررسی وضعیت ورود...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <CustomerDashboard />;
}
