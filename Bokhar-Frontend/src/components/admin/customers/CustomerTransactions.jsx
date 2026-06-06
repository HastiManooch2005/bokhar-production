import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../Sidebar";
import { FiCalendar, FiShoppingBag, FiLoader, FiAlertCircle } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

async function fetchCustomerDetails(id) {
  const res = await fetch(`${API_BASE}/customers/${id}/`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("خطا در دریافت اطلاعات مشتری");
  return res.json();
}

async function fetchCustomerTransactions(id) {
  const res = await fetch(`${API_BASE}/customers/${id}/transactions/`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("خطا در دریافت تراکنش‌ها");
  return res.json();
}

export default function CustomerTransactions() {
  const { id } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("customers");

  // States for data
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Parallel fetching
        const [customerData, transactionsData] = await Promise.all([
          fetchCustomerDetails(id),
          fetchCustomerTransactions(id)
        ]);

        if (!isMounted) return;

        // فرمت کردن داده‌ها اگر ساختار API متفاوت باشد
        setCustomer({
          id: customerData.id,
          name: customerData.name || customerData.fullname,
          phone: customerData.phone,
          // سایر فیلدها در صورت نیاز
        });

        // تطابق ساختار تراکنش‌ها با UI
        // فرض: API لیست آیتم‌ها را در فیلد items یا order_items برمی‌گرداند
        const formattedTransactions = transactionsData.map(t => ({
          id: t.id,
          date: t.date || t.created_at || t.transaction_date,
          // اگر API آیتم‌ها را nested ندهد، ممکن است نیاز به درخواست جداگانه باشد
          items: (t.items || t.order_items || []).map(item => ({
            name: item.name || item.product_name,
            quantity: item.quantity || item.qty || 1,
            price: item.price || item.unit_price || 0
          }))
        }));

        setTransactions(formattedTransactions);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          console.error("Fetch error:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadData();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id]);

  // Calculations
  const getTransactionTotal = (t) =>
    t.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;

  const totalSum = useMemo(() => 
    transactions.reduce((sum, t) => sum + getTransactionTotal(t), 0),
  [transactions]);

  // Helpers
  const formatPrice = (price) => {
    if (!price && price !== 0) return "-";
    return `${Number(price).toLocaleString("fa-IR")} تومان`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    // اگر تاریخ میلادی باشد و بخواهید شمسی کنید، از کتابخانه‌ای مثل moment-jalaali یا date-fns استفاده کنید
    // اینجا ساده فرمت می‌کنیم
    return new Date(dateStr).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div dir="rtl" className="flex min-h-screen overflow-x-hidden bg-gray-50 dark:bg-slate-900">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 p-4 sm:p-6 md:mr-64 overflow-y-auto min-w-0">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <FiLoader className="animate-spin text-sky-500 text-4xl mb-4" />
            <p className="text-slate-600 dark:text-slate-300">در حال بارگذاری...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center max-w-md">
              <FiAlertCircle className="text-red-500 text-5xl mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">خطا در دریافت اطلاعات</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
              >
                تلاش مجدد
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && customer && (
          <>
            {/* Sticky Header */}
            <div className="sticky top-4 z-40 mb-6">
              <div className="rounded-2xl sm:rounded-3xl p-5 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 border border-sky-200 dark:border-sky-700 shadow-lg backdrop-blur-xl flex flex-col md:flex-row justify-between gap-4">
                <h1 className="text-xl sm:text-2xl font-extrabold text-sky-900 dark:text-sky-100 flex items-center gap-2">
                  <FiShoppingBag size={22} />
                  تراکنش‌های مشتری: {customer.name}
                  {customer.phone && (
                    <span className="text-sm font-normal text-sky-600 dark:text-sky-300 mr-2">
                      ({customer.phone})
                    </span>
                  )}
                </h1>

                <div className="rounded-xl px-5 py-3 font-extrabold whitespace-nowrap bg-white/80 dark:bg-gray-900/60 text-sky-700 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-sm">
                  مجموع کل: {formatPrice(totalSum)}
                </div>
              </div>
            </div>

            {/* Empty State */}
            {transactions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <FiShoppingBag className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">هیچ تراکنشی برای این مشتری یافت نشد</p>
              </div>
            ) : (
              /* Transactions List */
              <div className="space-y-6">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl sm:rounded-3xl p-5 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 border border-sky-200 dark:border-sky-700 shadow-lg backdrop-blur-xl dark:text-gray-300 transition-all hover:shadow-xl"
                  >
                    <div className="flex items-center gap-2 mb-3 text-sky-700 dark:text-sky-100 font-bold">
                      <FiCalendar size={18} />
                      <span>تاریخ: {formatDate(t.date)}</span>
                      <span className="mr-auto text-sm font-normal text-slate-500 dark:text-slate-400">
                        شماره فاکتور: #{t.id}
                      </span>
                    </div>

                    <div className="font-semibold mb-4 text-sky-700 dark:text-sky-100 bg-white/50 dark:bg-white/10 rounded-lg px-4 py-2 inline-block">
                      مبلغ کل این تراکنش: {formatPrice(getTransactionTotal(t))}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-sky-200 dark:border-sky-700 bg-white/40 dark:bg-white/5">
                      <table className="min-w-full text-right text-sm">
                        <thead>
                          <tr className="bg-sky-100/50 dark:bg-sky-900/50 text-gray-700 dark:text-gray-200">
                            <th className="p-3 font-bold">ردیف</th>
                            <th className="p-3 font-bold">نام کالا</th>
                            <th className="p-3 font-bold">تعداد</th>
                            <th className="p-3 font-bold">قیمت واحد</th>
                            <th className="p-3 font-bold">جمع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.items?.map((item, idx) => (
                            <tr
                              key={idx}
                              className="border-t border-sky-100 dark:border-sky-700 hover:bg-sky-100/50 dark:hover:bg-sky-800/50 transition"
                            >
                              <td className="p-3 text-slate-500">{idx + 1}</td>
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">{formatPrice(item.price)}</td>
                              <td className="p-3 font-semibold text-sky-700 dark:text-sky-300">
                                {formatPrice(item.price * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
