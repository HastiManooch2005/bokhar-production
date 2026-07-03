import { useState, useMemo, useRef, useEffect } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  Check,
  Home,
  WashingMachine,
  X,
} from "lucide-react";

export default function ManageOrders({
  orders,
  cities,
  cityFilter,
  setCityFilter,
  toggleCheck,
  onRowClick,
}) {
  const [activeStatusTab, setActiveStatusTab] = useState("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  
  const [isOverflowing, setIsOverflowing] = useState(false);
  const tabsScrollRef = useRef(null);

  const tabDescriptions = {
    new: "سفارش‌های تازه ثبت‌شده که هنوز بررسی اولیه نشده و در انتظار پذیرش شما هستند.",
    inProgress: "سفارش‌های فعال و در دست اقدام که فرآیند آماده‌سازی یا شستشو هستند",
    done: "سفارش‌های تکمیل‌شده و آماده تحویل. موارد تأیید شده را انتخاب و ثبت کنید.",
    delivered: "سفارش‌هایی که با موفقیت به مشتری تحویل داده شده و فرآیند آنها به پایان رسیده است.",
    cancelled: "سفارش‌هایی که به هر دلیلی توسط مشتری لغو و از چرخه خارج شده‌اند.",
    returned: "سفارش‌هایی که پس از تحویل، توسط مشتری مرجوع یا استرداد شده‌اند.",
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (tabsScrollRef.current) {
        const { scrollWidth, clientWidth } = tabsScrollRef.current;
        setIsOverflowing(scrollWidth > clientWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    
    if (tabsScrollRef.current) {
      resizeObserver.observe(tabsScrollRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 100 : -100;
        el.scrollBy({
          left: delta,
          behavior: 'smooth'
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const tabs = [
    {
      id: "new",
      label: "جدید",
      icon: Package,
      colors: {
        active: "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-sky-700 dark:to-sky-800 shadow-sky-300 dark:shadow-sky-500 border-sky-300 dark:border-sky-600",
        hover: "hover:bg-sky-50 dark:hover:bg-sky-900/30",
      },
    },
    {
      id: "inProgress",
      label: "در حال انجام",
      icon: WashingMachine,
      colors: {
        active: "bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-700 dark:to-amber-800 shadow-amber-300 dark:shadow-amber-500 border-amber-300 dark:border-amber-600",
        hover: "hover:bg-amber-50 dark:hover:bg-amber-900/30",
      },
    },
    {
      id: "done",
      label: "انجام شده",
      icon: Truck,
      colors: {
        active: "bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-700 dark:to-emerald-800 shadow-emerald-300 dark:shadow-emerald-500 border-emerald-300 dark:border-emerald-600",
        hover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
      },
    },
    {
      id: "delivered",
      label: "تحویل داده شده",
      icon: Home,
      colors: {
        active: "bg-gradient-to-r from-violet-100 to-violet-200 dark:from-violet-700 dark:to-violet-800 shadow-violet-300 dark:shadow-violet-500 border-violet-300 dark:border-violet-600",
        hover: "hover:bg-violet-50 dark:hover:bg-violet-900/30",
      },
    },
    {
      id: "cancelled",
      label: "لغو شده",
      icon: XCircle,
      colors: {
        active: "bg-gradient-to-r from-rose-100 to-rose-200 dark:from-rose-700 dark:to-rose-800 shadow-rose-300 dark:shadow-rose-500 border-rose-300 dark:border-rose-600",
        hover: "hover:bg-rose-50 dark:hover:bg-rose-900/30",
      },
    },
    {
      id: "returned",
      label: "برگشت زده",
      icon: RotateCcw,
      colors: {
        active: "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-slate-300 dark:shadow-slate-500 border-slate-300 dark:border-slate-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-900/30",
      },
    },
  ];

  const processedOrders = useMemo(() => {
    let result = orders.filter((order) => order.status === activeStatusTab);

    if (searchQuery) {
      result = result.filter(
        (order) =>
          order.name?.includes(searchQuery) ||
          order.phone?.includes(searchQuery) ||
          order.address?.includes(searchQuery)
      );
    }

    if (cityFilter) {
      result = result.filter((order) => order.city === cityFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === "price") {
          return sortConfig.direction === "asc"
            ? a.price - b.price
            : b.price - a.price;
        }
        if (sortConfig.key === "deliveryDate") {
          return sortConfig.direction === "asc"
            ? new Date(a.deliveryDate) - new Date(b.deliveryDate)
            : new Date(b.deliveryDate) - new Date(a.deliveryDate);
        }
        return 0;
      });
    }

    return result;
  }, [orders, activeStatusTab, searchQuery, cityFilter, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getCount = (status) => orders.filter((o) => o.status === status).length;

  return (
    <div className="w-full">
      {/* تب‌ها */}
      <div className="relative mb-6">
        <div className="absolute left-0 top-0 bottom-4 w-12 z-10 pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-4 w-12 z-10 pointer-events-none sm:hidden" />
        
        <div 
          ref={tabsScrollRef}
          className={`flex gap-1.5 sm:gap-2 overflow-x-auto pb-4 pt-2 px-3 sm:px-2 
                     scroll-smooth flex-nowrap items-center
                     ${isOverflowing ? 'justify-start' : 'justify-center'}
                     scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 
                     scrollbar-track-transparent transition-all duration-300`}
          style={{ scrollbarWidth: 'thin' }}
        >
          {tabs.map((tab) => {
            const isActive = activeStatusTab === tab.id;
            const Icon = tab.icon;
            const count = getCount(tab.id);
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 
                           text-xs sm:text-sm rounded-full font-medium border 
                           transition-all duration-200 cursor-pointer 
                           whitespace-nowrap flex-shrink-0
                           ${isActive
                             ? `${tab.colors.active} scale-105 text-gray-800 dark:text-white/90 shadow-sm`
                             : `bg-white dark:bg-gray-800/80 ${tab.colors.hover} border-gray-200 dark:border-gray-600 shadow-sm text-gray-800 dark:text-gray-200`
                           }`}
              >
                <Icon size={16} className={isActive ? "opacity-100" : "opacity-70"} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`mr-0.5 min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                      ${isActive
                        ? "bg-white/30 text-current"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-1 mx-3 sm:mx-2 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {tabDescriptions[activeStatusTab]}
        </p>
      </div>

      {/* جستجو */}
      <div className="mb-6 px-2">
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            placeholder="جستجو در نام، شماره تماس یا آدرس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
          <Search
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* عنوان بخش */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({processedOrders.length} مورد)
          </span>
        </h3>
      </div>

      {/* جدول سفارشات */}
      <OrdersTable
        orders={processedOrders}
        toggleSort={toggleSort}
        toggleCheck={toggleCheck}
        activeTab={activeStatusTab}
        onRowClick={onRowClick}
      />
    </div>
  );
}

function OrdersTable({
  orders,
  toggleSort,
  toggleCheck,
  activeTab,
  onRowClick,
}) {
  const remainingDays = (date) => {
    const today = new Date();
    const delivery = new Date(date);
    const diff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const getActionButtons = (order) => {
    if (activeTab === "delivered" || activeTab === "cancelled") {
      return (
        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          اتمام یافته
        </span>
      );
    }

    if (activeTab === "done" && toggleCheck) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCheck(order.id);
          }}
          className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-colors
            ${order.isChecked 
              ? "bg-violet-100 text-violet-700 border-violet-500 hover:bg-violet-200" 
              : "bg-gray-100 text-gray-600 border-gray-400 hover:bg-gray-200"
            }`}
        >
          {order.isChecked ? (
            <>
               <Home size={14} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">تحویل داده شد</span>
              <span className="sm:hidden">تحویل</span>
            </>
          ) : (
            <>
              <Truck size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">آماده تحویل</span>
              <span className="sm:hidden">آماده</span>
            </>
          )}
        </button>
      );
    }

    if (activeTab === "returned" && toggleCheck) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCheck(order.id);
          }}
          className={`flex items-center gap-1 px-1.5 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-colors
            ${order.isChecked 
              ? "bg-green-100 text-green-700 border-green-500 hover:bg-green-200" 
              : "bg-slate-100 text-slate-700 border-slate-500 hover:bg-slate-200"
            }`}
        >
          {order.isChecked ? (
            <>
              <Check size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">تأیید برگشت</span>
              <span className="sm:hidden">تأیید</span>
            </>
          ) : (
            <>
              <RotateCcw size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">برگشت به درحال انجام</span>
              <span className="sm:hidden">بازگشت</span>
            </>
          )}
        </button>
      );
    }

    if (activeTab === "new" && toggleCheck) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCheck(order.id);
          }}
          className={`flex items-center gap-1 px-1.5 sm:px-1 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-colors
            ${order.isChecked 
              ? "bg-green-100 text-green-700 border-green-500 hover:bg-green-200" 
              : "bg-red-100 text-red-700 border-red-500 hover:bg-red-200"
            }`}
        >
          {order.isChecked ? (
            <>
              <Check size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">پذیرش شد</span>
              <span className="sm:hidden">پذیرش</span>
            </>
          ) : (
            <>
              <Clock size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">در انتظار تأیید</span>
              <span className="sm:hidden">انتظار</span>
            </>
          )}
        </button>
      );
    }

    if (activeTab === "inProgress" && toggleCheck) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCheck(order.id);
          }}
          className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-colors
            ${order.isChecked 
              ? "bg-green-100 text-green-700 border-green-500 hover:bg-green-200" 
              : "bg-amber-100 text-amber-700 border-amber-500 hover:bg-amber-200"
            }`}
        >
          {order.isChecked ? (
            <>
              <Check size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">خدمات انجام شد</span>
              <span className="sm:hidden">انجام شد</span>
            </>
          ) : (
            <>
              <Clock size={12} className="sm:w-4 sm:h-4 w-3 h-3" />
              <span className="hidden sm:inline">در انتظار خدمات</span>
              <span className="sm:hidden">در انتظار</span>
            </>
          )}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-white/50 dark:bg-[#262B40]/90 backdrop-blur-lg border border-sky-200/50 dark:border-gray-600/50 rounded-2xl mt-6 p-3 sm:p-6 shadow-xl">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-white/10 dark:border-gray-600/50 pb-2">
        سفارش‌ها
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-right">
          <thead className="text-black dark:text-gray-200 border-b border-white/10 dark:border-gray-600/50">
            <tr>
              <th className="p-2 sm:p-3 whitespace-nowrap">شماره</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">وضعیت</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">نام مشتری</th>
              <th
                className="p-2 sm:p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => toggleSort("deliveryDate")}
              >
                مهلت
              </th>
              <th className="p-2 sm:p-3 whitespace-nowrap">فاصله</th>
              <th
                className="hidden sm:table-cell p-2 sm:p-3 cursor-pointer select-none whitespace-nowrap"
                onClick={() => toggleSort("price")}
              >
                مبلغ
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => onRowClick(order)}
                className="hover:bg-white/80 dark:hover:bg-[#2d3350] dark:text-gray-200 transition border-b border-white/5 dark:border-gray-600/30 cursor-pointer"
              >
                <td className="p-2 sm:p-3">
                  <span
                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-xl font-bold inline-block text-xs sm:text-base ${
                      order.isChecked && activeTab !== "done"
                        ? "bg-green-100 border border-green-500 text-green-600"
                        : order.isChecked && activeTab === "done"
                        ? "bg-violet-100 border border-violet-500 text-violet-600"
                        : "bg-red-100 border border-red-500 text-red-600"
                    }`}
                  >
                    {order.id}
                  </span>
                </td>
                <td className="p-2 sm:p-3" onClick={(e) => e.stopPropagation()}>
                  {getActionButtons(order)}
                </td>
                <td className="p-2 sm:p-3 truncate max-w-[100px] sm:max-w-[200px]">
                  {order.name}
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap">
                  {remainingDays(order.deliveryDate)} روز
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap">
                  {order.distance ? `${order.distance} دقیقه` : '-'}
                </td>
                <td className="hidden sm:table-cell p-2 sm:p-3 whitespace-nowrap">
                  {order.price?.toLocaleString()} تومان
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}