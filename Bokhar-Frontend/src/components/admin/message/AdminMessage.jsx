import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import Search from "../../Search";
import {
  FiMessageSquare,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";
import { getAdminTickets, closeTicketAdmin } from "../../../api/ticketApi";

function TicketCard({ ticket, onClick, onClose }) {
  const { subject, user_full_name, status, created_at, message_count } = ticket;

  const badgeStyle =
    status === "answered"
      ? "bg-emerald-200/70 text-emerald-800"
      : status === "open"
      ? "bg-yellow-200/70 text-yellow-800"
      : "bg-rose-200/70 text-rose-800";

  const statusLabel =
    status === "answered"
      ? "پاسخ داده شده"
      : status === "open"
      ? "در انتظار پاسخ"
      : "بسته شده";

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString("fa-IR")
    : "";

  return (
    <div
      onClick={onClick}
      className="
        p-6 rounded-2xl cursor-pointer
        bg-white/30 dark:bg-[#262B40]/90 backdrop-blur-lg
        border border-sky-200/50 dark:border-gray-600/50
        shadow-xl transition-all
        hover:scale-[1.03]
        hover:bg-white/80 dark:hover:bg-[#2d3350]
        active:scale-[0.98]
      "
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-slate-800 dark:text-gray-200 truncate">
          {subject}
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
        <p>کاربر: {user_full_name || "ناشناس"}</p>
        <div className="flex items-center justify-between">
          <p>{formattedDate}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {message_count || 0} پیام
            </span>
            {status !== "closed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.();
                }}
                className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition font-medium"
              >
                بستن تیکت
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const tabs = [
  { key: "all", label: "همه", icon: <FiMessageSquare /> },
  { key: "open", label: "در انتظار پاسخ", icon: <FiClock /> },
  { key: "answered", label: "پاسخ داده شده", icon: <FiCheckCircle /> },
  { key: "closed", label: "بسته شده", icon: <FiAlertCircle /> },
];

export default function AdminMessage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("messages");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab !== "all") params.status = activeTab;
      if (search.trim()) params.search = search.trim();

      const data = await getAdminTickets(params);
      setTickets(data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      if (err.status === 403) {
        setError("شما دسترسی به این بخش را ندارید");
      } else {
        setError("خطا در دریافت تیکت‌ها. لطفا دوباره تلاش کنید.");
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const closeTicket = async (id) => {
    try {
      await closeTicketAdmin(id);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "closed" } : t))
      );
    } catch (err) {
      console.error("Error closing ticket:", err);
    }
  };

  const filteredTickets = useMemo(() => {
    const query = search.toLowerCase();
    return tickets.filter((ticket) => {
      const matchTab = activeTab === "all" || ticket.status === activeTab;
      const matchSearch =
        !query ||
        (ticket.subject && ticket.subject.toLowerCase().includes(query)) ||
        (ticket.user_full_name && ticket.user_full_name.toLowerCase().includes(query));
      return matchTab && matchSearch;
    });
  }, [tickets, search, activeTab]);

  return (
    <div dir="rtl" className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 md:mr-64 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-200">
            <FiMessageSquare className="text-xl sm:text-2xl" />
            مدیریت تیکت‌ها
          </h1>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="بروزرسانی"
          >
            <FiRefreshCw className={`text-lg ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-shrink-0
                  flex items-center justify-center gap-1
                  px-3 py-2 rounded-2xl font-medium transition
                  border shadow-md cursor-pointer
                  ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] border-gray-300 dark:border-gray-600 shadow-lg scale-105 text-gray-800 dark:text-white"
                      : "bg-white dark:bg-[#262B40] hover:bg-sky-100 dark:hover:bg-[#2d3350] border-gray-200 dark:border-gray-600 shadow-lg text-gray-800 dark:text-gray-200"
                  }
                `}
              >
                {tab.icon}
                <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="w-full md:w-1/3">
            <Search
              value={search}
              onChange={setSearch}
              items={[]}
              onSelect={() => {}}
              renderItem={() => null}
              placeholder="جستجو در تیکت‌ها..."
            />
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          {loading && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-gray-500">
              <FiLoader className="text-4xl mb-3 animate-spin" />
              <p className="text-sm">در حال بارگذاری...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-rose-500">
              <FiAlertCircle className="text-4xl mb-3" />
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchTickets}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 transition"
              >
                تلاش مجدد
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-gray-500 text-base sm:text-lg py-12">
              تیکتی یافت نشد
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigate(`/admin-dashboard/message/${ticket.id}`)}
                  onClose={() => closeTicket(ticket.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}