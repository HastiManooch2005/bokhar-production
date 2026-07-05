import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import Search from "../../Search";
import {
  FiMessageSquare,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

function TicketCard({ ticket, onClick }) {
  const { title, user, status, createdAt } = ticket;

  const badgeStyle =
    status === "answered"
      ? "bg-emerald-200/70 text-emerald-800"
      : status === "pending"
      ? "bg-yellow-200/70 text-yellow-800"
      : "bg-rose-200/70 text-rose-800";

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
        <h2 className="font-bold text-slate-800 dark:text-gray-200">
          {title}
        </h2>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}
        >
          {status === "answered"
            ? "پاسخ داده شده"
            : status === "pending"
            ? "در انتظار پاسخ"
            : "بسته شده"}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
        <p>کاربر: {user}</p>
        <p>{createdAt}</p>
      </div>
    </div>
  );
}

const tabs = [
  {
    key: "all",
    label: "همه",
    icon: <FiMessageSquare />,
  },
  {
    key: "pending",
    label: "در انتظار پاسخ",
    icon: <FiClock />,
  },
  {
    key: "answered",
    label: "پاسخ داده شده",
    icon: <FiCheckCircle />,
  },
  {
    key: "closed",
    label: "بسته شده",
    icon: <FiAlertCircle />,
  },
];

export default function AdminMessage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("messages");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const tickets = [
    {
      id: 1,
      title: "مشکل در ثبت سفارش",
      user: "علی هاشمی",
      status: "pending",
      createdAt: "1405/04/12",
    },
    {
      id: 2,
      title: "پیگیری مرجوعی کالا",
      user: "محمد احمدی",
      status: "answered",
      createdAt: "1405/04/11",
    },
    {
      id: 3,
      title: "درخواست تغییر آدرس",
      user: "رضا کریمی",
      status: "closed",
      createdAt: "1405/04/10",
    },
  ];

  const filteredTickets = useMemo(() => {
    const query = search.toLowerCase();

    return tickets.filter((ticket) => {
      const matchTab =
        activeTab === "all" || ticket.status === activeTab;

      const matchSearch =
        ticket.title.toLowerCase().includes(query) ||
        ticket.user.toLowerCase().includes(query);

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
        <h1 className="flex items-center justify-center md:justify-start gap-2 text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-200">
          <FiMessageSquare className="text-xl sm:text-2xl" />
          مدیریت تیکت‌ها
        </h1>

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
          {filteredTickets.length === 0 ? (
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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}