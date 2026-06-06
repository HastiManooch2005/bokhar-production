import React, { useEffect, useState, useRef } from "react";
import RevenueChart from "./RevenueChart";
import KPICard from "./KPICard";
import TopServices from "./TopServices";
import Sidebar from "../Sidebar";
import { FiBarChart } from "react-icons/fi";
import axios from "axios";

function SegmentedToggle({ options, value, onChange }) {
  const idx = options.findIndex((o) => o.value === value);
  const segmentWidth = 100 / options.length;
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(null);

  const startDrag = () => setDragging(true);

  const moveDrag = (clientX) => {
    if (!dragging || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    x = Math.max(0, Math.min(100, x));
    setDragX(x);
  };

  const endDrag = () => {
    if (!dragging || dragX == null) {
      setDragging(false);
      return;
    }
    // محاسبه معکوس برای RTL: سمت راست صفحه = گزینه اول
    const rawSegment = Math.floor(dragX / segmentWidth);
    const segment = options.length - 1 - rawSegment;
    onChange(options[segment].value);
    setDragging(false);
    setDragX(null);
  };


  // محاسبه left معکوس برای RTL
  const left =
    dragX != null
      ? dragX - segmentWidth / 2
      : (options.length - 1 - idx) * segmentWidth;

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex bg-white dark:bg-white/40 border border-sky-200 backdrop-blur-lg rounded-full p-0.5 select-none overflow-hidden shadow-md cursor-pointer"
      onMouseDown={startDrag}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={startDrag}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      <div
        className="absolute top-0.5 bottom-0.5 border rounded-full shadow bg-white border-sky-200 dark:bg-purple-800 dark:border-indigo-300 pointer-events-none"
        style={{
          width: `${segmentWidth}%`,
          left: `calc(${left}% )`,
          transition: dragging ? "none" : "all 0.25s ease",
        }}
      />

      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 px-2 py-0.5 text-2xs font-medium transition cursor-pointer ${
            value === opt.value
              ? "text-sky-600 dark:text-gray-800"
              : "text-gray-700 dark:text-gray-300"
          }`}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const persianMonths = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  const monthMap = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12,
};

  const todayMonthIndex = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(
    persianMonths[todayMonthIndex],
  );
  const [viewType, setViewType] = useState("week");
  const [valueType, setValueType] = useState("revenue");
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [activeMenu, setActiveMenu] = useState("reports");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState(0);
  const [loading, setLoading] = useState(false);

  const dataForChart = React.useMemo(() => {
    if (viewType === "week") {
      return series.map((w) => ({
        week: w.week,
        value: valueType === "revenue" ? w.revenue : w.count,
      }));
    }
    const w = series[activeWeek];
    return w
      ? w.days.map((d) => ({
          day: d.day,
          value: valueType === "revenue" ? d.revenue : d.count,
        }))
      : [];
  }, [viewType, valueType, series, activeWeek]);

  const fmt = (n) => (n == null ? "-" : n.toLocaleString("fa-IR"));

useEffect(() => {
  const fetchChart = async () => {
    try {
      setLoading(true);

      const year = new Date().getFullYear();
      const month = monthMap[activeMonth];

      const endpoint =
        valueType === "revenue"
          ? `${import.meta.env.VITE_API_URL}/report/weekly/sales/${year}/${month}/`
          : `${import.meta.env.VITE_API_URL}/report/weekly/orders/${year}/${month}/`;

      const res = await axios.get(endpoint);

      const chartData = (res.data.labels || []).map((label, index) => ({
        week: label,
        value: res.data.values?.[index] ?? 0,
      }));

      setSeries(chartData);
    } catch (err) {
      console.error("Chart API Error:", err);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  fetchChart();
}, [activeMonth, valueType]);

useEffect(() => {
  const fetchTopServices = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/report/analytics/top-services/`
      );

      setTopServices(
        (res.data.results || []).map((item) => ({
          id: item.pricing_tab_id,
          name: item["pricing_tab__tab_name"],
          count: item.usage_count,
        }))
      );
    } catch (err) {
      console.error("Top Services API Error:", err);
      setTopServices([]);
    }
  };

  fetchTopServices();
}, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/report/total-orders/`,
        );

        setSummary({
          total_revenue: res.data.revenue,
          orders_count: res.data.orders,
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div dir="rtl" className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:mr-64">
        <h1 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          <FiBarChart className="text-2xl" />
          گزارش‌های مدیریتی
        </h1>

        {/* انتخاب ماه */}
        <div className="flex gap-2 overflow-x-auto mb-6">
          {persianMonths.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMonth(m)}
              className={`px-4 py-2 my-3 mx-1 rounded-full font-medium shrink-0 transition cursor-pointer ${
                activeMonth === m
                  ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border border-gray-300 dark:border-indigo-600 dark:text-white/90 shadow-md shadow-indigo-300 text-gray-800 scale-105"
                  : "bg-white/70 dark:bg-white/80 hover:bg-white dark:hover:bg-white/95 border border-gray-200 dark:border-sky-200 shadow-md text-gray-800 "
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <KPICard title="فروش کل" value={fmt(summary?.total_revenue)} />
          <KPICard title="تعداد سفارش‌ها" value={fmt(summary?.orders_count)} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-4 rounded-3xl bg-white/30 dark:bg-white/50 backdrop-blur-lg border border-sky-200/50 shadow-xl">
            {/* عنوان */}
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-900 w-full sm:w-auto text-center sm:text-start">
              نمودار فروش ({activeMonth})
            </h3>
            {/* Header + Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 w-full">
              {/* دکمه‌ها و Toggles */}
              <div className="flex flex-col sm:flex-row sm:gap-2 w-full sm:w-auto">
                {/* ردیف دکمه‌ها */}
                <div className="flex gap-2 justify-center sm:justify-start mb-2 sm:mb-0">
                  <button
                    onClick={() => setActiveWeek((w) => Math.max(0, w - 1))}
                    disabled={viewType === "week" || activeWeek === 0}
                    className="h-10 px-4 text-xs whitespace-nowrap rounded-2xl font-medium bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 shadow text-gray-800 dark:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer sm:h-9 sm:px-3.5 sm:text-sm lg:h-10 lg:px-4"
                  >
                    هفته قبل
                  </button>

                  <button
                    onClick={() =>
                      setActiveWeek((w) => Math.min(series.length - 1, w + 1))
                    }
                    disabled={
                      viewType === "week" || activeWeek === series.length - 1
                    }
                    className="h-10 px-4 text-xs whitespace-nowrap rounded-2xl font-medium bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 shadow text-gray-800 dark:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer sm:h-9 sm:px-3.5 sm:text-sm lg:h-10 lg:px-4"
                  >
                    هفته بعد
                  </button>
                </div>

                {/* ردیف Toggles */}
                <div className="flex gap-2 justify-center sm:justify-start">
                  <SegmentedToggle
                    options={[
                      { label: "هفته‌ای", value: "week" },
                      { label: "روزانه", value: "day" },
                    ]}
                    value={viewType}
                    onChange={setViewType}
                  />

                  <SegmentedToggle
                    options={[
                      { label: "قیمت", value: "revenue" },
                      { label: "تعداد", value: "count" },
                    ]}
                    value={valueType}
                    onChange={setValueType}
                  />
                </div>
              </div>
            </div>
            <RevenueChart
              data={dataForChart.map((i) =>
                viewType === "week"
                  ? { week: i.week, revenue: i.value }
                  
                  : { day: i.day, revenue: i.value },
              )}
              xKey={viewType === "week" ? "week" : "day"}
            />
          </div>

          <div className="p-4 rounded-3xl bg-white/30 dark:bg-white/50 backdrop-blur-lg border border-sky-200/50 shadow-xl">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-900">
              سرویس‌های پرفروش
            </h3>
            <TopServices list={topServices} />
          </div>
        </div>
      </main>
    </div>
  );
}
