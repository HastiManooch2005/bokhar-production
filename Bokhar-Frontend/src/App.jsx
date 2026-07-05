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
import Support from "./components/customers/support/Support";
import CustomerTicket from "./components/customers/support/CustomerTicket";
import Devices from "./components/customers/Devices";

import Landing from "./pages/Landing";
import Shop from "./pages/Shop";
import Order from "./pages/Order";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import AdminOrders from "./components/admin/orders/AdminOrders";
import AdminCustomers from "./components/admin/customers/AdminCustomers";
import CustomerTransactions from "./components/admin/customers/CustomerTransactions";
import AdminMessage from "./components/admin/message/AdminMessage";
import Ticket from "./components/admin/message/Ticket";
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
  const rawHash = location.hash || window.location.hash || "";
  const hashPath = rawHash.replace(/^#/, "");
  setCurrentPath(hashPath || "/");
}, [location]);

// صفحه اصلی، پنل ادمین و چت تیکت نوبار ندارند
const normalizedPath = currentPath.replace(/^#/, "");
const hideNavbar =
  normalizedPath === "/" ||
  normalizedPath === "" ||
  normalizedPath.startsWith("/admin-dashboard") ||
  new RegExp("^/customer-dashboard/support/").test(normalizedPath) ||
  new RegExp("^customer-dashboard/support/").test(normalizedPath);
  
  return (
    <div
      className="bg-gradient-to-bl from-sky-200/80 via-pink-100/60 to-sky-200/80
                dark:bg-gradient-to-br dark:from-[#262B40] dark:via-none dark:to-[#0B248A]
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
        <Route path="/customer-dashboard/support/:id" element={<CustomerTicket />} />

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
        <Route path="/admin-dashboard/message" element={<AdminMessage />} />
        <Route path="/admin-dashboard/message/:id" element={<Ticket />} />
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