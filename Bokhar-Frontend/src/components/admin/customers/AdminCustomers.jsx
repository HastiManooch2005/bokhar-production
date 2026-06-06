import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import { FiUser, FiUsers, FiStar } from "react-icons/fi";
import Search from "../../Search";

import { fetchCustomers } from "../../../context/AuthContext"; 

/* ================= HOOK ================= */

function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCustomers();
        
        // اطمینان از اینکه کامپوننت هنوز mount هست before setting state
        if (isMounted) {
          // اگر ساختار داده بکند با UI متفاوت است، اینجا تبدیل کن
          // مثال: اگر بکند به جای 'type' از 'status' استفاده می‌کند
          const formattedData = data.map(customer => ({
            id: customer.id,
            name: customer.name || customer.fullname || "نامشخص",
            phone: customer.phone,
            type: customer.type || customer.status || "inactive", // تطابق با ساختار بکند
            orders: customer.orders || customer.order_count || 0
          }));
          
          setCustomers(formattedData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          console.error("خطا در دریافت مشتریان:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    // cleanup function برای جلوگیری از memory leak
    return () => {
      isMounted = false;
    };
  }, []);

  return { customers, loading, error };
}

/* ================= CARD (بدون تغییر) ================= */

function CustomerCard({ customer, onClick }) {
  const { name, phone, type, orders } = customer;

  const badgeStyle =
    type === "vip"
      ? "bg-yellow-200/70 text-yellow-800"
      : type === "active"
      ? "bg-emerald-200/70 text-emerald-800"
      : "bg-rose-200/70 text-rose-800";

  return (
    <div
      onClick={onClick}
      className="
        p-6 rounded-2xl cursor-pointer
        bg-white/30 dark:bg-white/50 backdrop-blur-lg
        border border-sky-200/50
        shadow-xl transition-all
        hover:scale-[1.03] hover:bg-white/80
        active:scale-[0.98]
      "
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-gray-900">
          {name}
        </h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
          {type === "vip" ? "VIP" : type === "active" ? "فعال" : "غیرفعال"}
        </span>
      </div>

      <div className="flex justify-between text-sm text-slate-600 dark:text-gray-700">
        <span>{phone}</span>
        <span>سفارش‌ها: {orders}</span>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */

export default function AdminCustomers() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("customers");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const navigate = useNavigate();
  const { customers, loading, error } = useCustomers();

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return customers.filter((c) => {
      const matchTab = activeTab === "all" || c.type === activeTab;
      const matchSearch =
        c.name.toLowerCase().includes(query) || c.phone.includes(query);
      return matchTab && matchSearch;
    });
  }, [customers, search, activeTab]);

  return (
    <div dir="rtl" className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:mr-64 overflow-y-auto">
<h1 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold text-slate-800 dark:text-gray-900">
  <FiUsers className="text-2xl" />
  مشتریان
</h1>


        {/* Tabs + Search */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {[
              { key: "all", label: "همه", icon: <FiUsers /> },
              { key: "active", label: "فعال", icon: <FiUser /> },
              { key: "inactive", label: "غیرفعال", icon: <FiUser /> },
              { key: "vip", label: "VIP", icon: <FiStar /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition border shadow-md cursor-pointer
                  ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border-gray-300 dark:border-indigo-600 shadow-lg shadow-indigo-300 dark:shadow-indigo-500 scale-105 text-gray-800 dark:text-white/90"
                      : "bg-white dark:bg-white/80 hover:bg-sky-100 dark:hover:bg-white/95 border-gray-200 shadow-lg text-gray-800"
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full md:w-1/3">
            <Search
              value={search}
              onChange={setSearch}
              items={[]}
              onSelect={() => {}}
              renderItem={() => null}
              placeholder="جستجو بر اساس نام یا شماره..."
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            <span className="mr-3 text-slate-600">در حال بارگذاری...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-8 p-4 bg-red-100 border border-red-300 rounded-xl text-red-800 text-center">
            <p className="font-bold">خطا در دریافت اطلاعات</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && (
          <div className="mt-8">
            {filtered.length === 0 ? (
              <div className="text-center text-slate-400 text-lg py-12">
                مشتری‌ای یافت نشد
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((c) => (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    onClick={() =>
                      navigate(`/admin-dashboard/customers/${c.id}/transactions`)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
