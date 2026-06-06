import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";

import DesktopNavbar from "./components/DesktopNavbar";
import MobileNavbar from "./components/MobileNavbar";
import AuthModal from "./components/auth/AuthModal";

import CustomerDashboard from "./pages/CustomerDashboard";
import EditProfile from "./components/customers/Edit";
import WalletPage from "./components/customers/Wallet";
import OrderTracking from "./components/customers/OrderTracking";
import SecurityPrivacy from "./components/customers/privacy/SecurityPrivacy";
import Support from "./components/customers/Support";
import Devices from "./components/customers/Devices";

import Landing from "./pages/Landing";
import Shop from "./pages/Shop";
import Order from "./pages/Order";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import AdminOrders from "./components/admin/orders/AdminOrders";
import AdminCustomers from "./components/admin/customers/AdminCustomers";
import CustomerTransactions from "./components/admin/customers/CustomerTransactions";
import AdminReports from "./components/admin/reports/AdminReports";
import AboutDryCleaning from "./pages/AboutDryCleaning";
import AboutUs from "./pages/AboutUs"
// Context برای خدمات و تخفیف
import { ServicesProvider } from "./components/admin/services/ServicesContext";
import AdminServices from "./components/admin/services/AdminServices";
import AdminDiscount from "./components/admin/discount/AdminDiscount";
import { OrdersProvider } from "./context/OrdersContext";

function AppContent() {
  const [openModal, setOpenModal] = useState(false);
  const location = useLocation();

  // مسیر واقعی از location.hash استخراج می‌شود
  const [currentPath, setCurrentPath] = useState("");
  useEffect(() => {
    const hashPath = location.hash
      ? location.hash.replace("#", "")
      : window.location.hash.replace("#", "");
    setCurrentPath(hashPath);
  }, [location]);

  // مسیرهای /admin-dashboard و زیرمسیرها نوبار ندارند
  const hideNavbar =
    currentPath === "/" || currentPath.startsWith("/admin-dashboard");

  return (
    <div
      className="bg-gradient-to-bl from-sky-200/80 via-pink-100/60 to-sky-200/80
                    dark:from-sky-950 dark:via-purple-900/70 dark:to-sky-900
                    min-h-screen"
    >
      {/* Navbarها فقط اگر در مسیر مخفی نباشیم */}
      {!hideNavbar && (
        <>
          <DesktopNavbar openModal={openModal} setOpenModal={setOpenModal} />
          <MobileNavbar openModal={openModal} setOpenModal={setOpenModal} />
          <AuthModal open={openModal} onClose={() => setOpenModal(false)} />
        </>
      )}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/order" element={<Order />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/customer-dashboard/edit" element={<EditProfile />} />
        <Route path="/customer-dashboard/wallet" element={<WalletPage />} />
        <Route path="/customer-dashboard/devices" element={<Devices />} />
        <Route
          path="/customer-dashboard/orders-tracking"
          element={<OrderTracking />}
        />
        <Route
          path="/customer-dashboard/privacy"
          element={<SecurityPrivacy />}
        />
        <Route path="/customer-dashboard/support" element={<Support />} />

        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route
          path="/admin-dashboard/orders"
          element={
            <OrdersProvider>
              <AdminOrders />
            </OrdersProvider>
          }
        />
        <Route path="/admin-dashboard/customers" element={<AdminCustomers />} />
        <Route
          path="/admin-dashboard/customers/:id/transactions"
          element={<CustomerTransactions />}
        />
        <Route
          path="/admin-dashboard/services"
          element={
            <ServicesProvider>
              <AdminServices />
            </ServicesProvider>
          }
        />
        <Route
          path="/admin-dashboard/discounts"
          element={
            <ServicesProvider>
              <AdminDiscount />
            </ServicesProvider>
          }
        />
        <Route path="/admin-dashboard/reports" element={<AdminReports />} />
        <Route path="/aboutDryCleaning" element={<AboutDryCleaning />} />
        <Route path="/aboutUs" element={<AboutUs />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
