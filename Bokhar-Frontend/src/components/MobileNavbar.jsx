import { useState, useEffect } from "react";
import { User, ShoppingCart, MessageSquare, Home } from "lucide-react";
import AuthModal from "./auth/AuthModal";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function MobileNavbar() {
  const [openModal, setOpenModal] = useState(false);
  const [showLogo, setShowLogo] = useState(true); 
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    setShowLogo(true);
    
    const initTimer = setTimeout(() => {
      if (window.scrollY <= 50) {
        setShowLogo(false);
      }
    }, 2000);

    const handleScroll = () => {
      setShowLogo(window.scrollY > 80);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (loading) return null;

  const handleProfileClick = () => {
    if (user?.isAuthenticated) {
      navigate("/customer-dashboard");
    } else {
      setOpenModal(true);
    }
  };

  const isHomeActive = location.pathname === "/" || location.pathname === "/shop";

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 
                   bg-sky-50/85 dark:bg-[#262B40] backdrop-blur-xl 
                   border-t border-gray-200/50 dark:border-gray-700/50 
                   rounded-t-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] 
                   dark:shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)]
                   pb-[env(safe-area-inset-bottom)] transition-all duration-300"
      >
        <div dir="rtl" className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
          {/* خانه - با انیمیشن لوگو/آیکون */}
          <button
            onClick={() => {
              if (window.location.hash === "#/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate("/shop");
              }
            }}
            className={`
              relative flex flex-col items-center justify-center gap-1 
              w-16 h-14 rounded-2xl transition-all duration-300 ease-out
              ${isHomeActive 
                ? "text-sky-500 dark:text-gray-400 scale-105 bg-white/70 dark:bg-[#8AA1C4] shadow-sm" 
                : "text-gray-500 dark:text-gray-400 "
              }
            `}
            aria-label="خانه"
          >
            <div className={`relative w-6 h-6 flex items-center justify-center ${isHomeActive ? "drop-shadow-sm" : ""}`}>
              {/* تصویر Logo */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  showLogo ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
              >
                <img 
                  src="/Logo.png" 
                  alt="Logo" 
                  className="h-6 w-auto object-contain"
                />
              </div>

              {/* آیکون Home */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  !showLogo ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
              >
                <Home 
                  size={22} 
                  strokeWidth={2}
                  className={isHomeActive ? "text-sky-500 dark:text-white" : "text-current"}
                />
              </div>
            </div>
            <span className="text-[10px] font-medium tracking-tight dark:text-white">
              خانه
            </span>
          </button>

          {/* پیام‌ها */}
          <NavItem
            icon={<MessageSquare size={22} strokeWidth={2} />}
            label="پیام‌ها"
            onClick={() => navigate("/notifications")}
            active={location.pathname === "/notifications"}
          />

          {/* سبد خرید */}
          <NavItem
            icon={
              <div className="relative">
                <ShoppingCart size={22} strokeWidth={2} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </div>
            }
            label="سبد"
            onClick={() => navigate("/order")}
            active={location.pathname === "/order"}
          />

          {/* پروفایل */}
          <NavItem
            icon={<User size={22} strokeWidth={2} />}
            label={
              user?.isAuthenticated
                ? user.fullname || "پروفایل"
                : "ورود / ثبت نام"
            }
            onClick={handleProfileClick}
            active={location.pathname === "/customer-dashboard"}
          />
        </div>
      </nav>

      <AuthModal isOpen={openModal} onClose={() => setOpenModal(false)} />
    </>
  );
}

function NavItem({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1 
        w-16 h-14 rounded-2xl transition-all duration-300 ease-out
        ${active 
          ? "text-sky-500 dark:text-gray-100 scale-105 bg-white/70 dark:bg-[#8AA1C4] shadow-sm" 
          : "text-gray-500 dark:text-gray-400"
        }
      `}
      aria-label={label}
    >
      <div className={`${active ? "drop-shadow-sm" : ""} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-tight">
        {label}
      </span>
    </button>
  );
}
