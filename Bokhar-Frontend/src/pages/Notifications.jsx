import { useEffect, useState } from "react";
import { Tag, Clock, Wallet } from "lucide-react";
import Reminders from "../components/messages/Reminders";
import Discounts from "../components/messages/Discounts";
import Transactions from "../components/messages/Transactions";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("reminders");
  const [reminders, setReminders] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchNotifications() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/`, {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  signal: controller.signal,
});
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server returned ${res.status}: ${text}`);
        }

        const data = await res.json();
        const results = data.results || {};

        setReminders(Array.isArray(results.reminders) ? results.reminders : []);
        setDiscounts(Array.isArray(results.discounts) ? results.discounts : []);
        setTransactions(
          Array.isArray(results.transactions) ? results.transactions : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("⚠️ Failed to load notifications:", err);
          setError("خطا در بارگذاری اعلان‌ها. لطفاً دوباره تلاش کنید.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
    return () => controller.abort();
  }, []);

  const unreadCount = reminders.filter((r) => !r.read).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto text-gray-800 dark:text-gray-200">
      <div className="bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 rounded-2xl sm:rounded-3xl shadow-lg p-4 mt-2 md:mt-16 sm:p-5 md:p-6 border border-sky-200 dark:border-sky-700 transition-colors">
        
        {/* Tabs */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mb-5">
          <PillButton
            active={activeTab === "reminders"}
            onClick={() => setActiveTab("reminders")}
            icon={<Clock size={18} />}
            label="یادآوری‌ها"
            badge={unreadCount}
          />
          <PillButton
            active={activeTab === "discounts"}
            onClick={() => setActiveTab("discounts")}
            icon={<Tag size={18} />}
            label="تخفیف‌ها"
            badge={discounts.length}
          />
          <PillButton
            active={activeTab === "transactions"}
            onClick={() => setActiveTab("transactions")}
            icon={<Wallet size={18} />}
            label="تراکنش‌ها"
            badge={transactions.length}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-400 dark:border-purple-500" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-medium mb-3">
            {error}
          </div>
        ) : (
          <>
            {activeTab === "reminders" && <Reminders reminders={reminders} />}
            {activeTab === "discounts" && <Discounts discounts={discounts} />}
            {activeTab === "transactions" && (
              <Transactions transactions={transactions} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- PillButton ----------------
function PillButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[100px] sm:min-w-[120px] flex justify-center items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border transition-colors focus:outline-none focus-visible:outline-none text-sm sm:text-base ${
        active
          ? "bg-gradient-to-r from-sky-400 to-sky-500 text-white border-transparent shadow-md  dark:from-purple-700 dark:to-purple-800"
          : "bg-white/80 text-gray-700 border-sky-300 hover:bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700 shadow-md"
      }`}
    >
      {icon}
      <span className="font-medium whitespace-nowrap">{label}</span>

      {badge > 0 && (
        <span
          className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full ${
            active
              ? "bg-white text-sky-500 dark:bg-gray-900 dark:text-purple-400"
              : "bg-sky-400 text-white dark:bg-purple-600"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
