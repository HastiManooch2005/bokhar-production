import React, { useEffect, useState, useRef } from "react";
import RevenueChart from "./RevenueChart";
import KPICard from "./KPICard";
import TopServices from "./TopServices";
import Sidebar from "../Sidebar";
import { FiBarChart } from "react-icons/fi";
import axios from "axios";

// ─── API Setup ──────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── SegmentedToggle ────────────────────────────────────────────
function SegmentedToggle({ options, value, onChange }) {
  const idx = options.findIndex((o) => o.value === value);
  const segmentWidth = 100 / options.length;
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
    const rawSegment = Math.floor(dragX / segmentWidth);
    const segment = options.length - 1 - rawSegment;
    onChange(options[segment].value);
    setDragging(false);
    setDragX(null);
  };

  const left =
    dragX != null
      ? dragX - segmentWidth / 2
      : (options.length - 1 - idx) * segmentWidth;

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex bg-white dark:bg-[#262B40] border border-sky-200 dark:border-gray-600 backdrop-blur-lg rounded-full p-0.5 select-none overflow-hidden shadow-md cursor-pointer"
      onMouseDown={startDrag}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={startDrag}
      onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
      onTouchEnd={endDrag}
    >
      <div
        className="absolute top-0.5 bottom-0.5 border rounded-full shadow bg-white border-sky-200 dark:bg-[#8AA1C4] dark:border-gray-400 pointer-events-none"
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
              ? "text-sky-600 dark:text-white"
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

// ─── AdminReports ────────────────────────────────────────────────
export default function AdminReports() {
  const persianMonths = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
  ];
  const monthMap = {
    فروردین: 1, اردیبهشت: 2, خرداد: 3, تیر: 4, مرداد: 5, شهریور: 6,
    مهر: 7, آبان: 8, آذر: 9, دی: 10, بهمن: 11, اسفند: 12,
  };

  const todayMonthIndex = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(persianMonths[todayMonthIndex]);
  const [viewType, setViewType] = useState("week");
  const [valueType, setValueType] = useState("revenue");
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [activeMenu, setActiveMenu] = useState("reports");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiErrors, setApiErrors] = useState({});

  // داده نمودار — هفته‌ای یا روزانه
  const dataForChart = React.useMemo(() => {
    if (viewType === "week") {
      return series.map((item) => ({
        week: item.week,
        revenue: item.value,
      }));
    }
    // روزانه: تقسیم هفتگی به روزها (تا endpoint روزانه اضافه شود)
    const w = series[activeWeek];
    return w
      ? [
          { day: "شنبه", revenue: Math.round(w.value * 0.15) },
          { day: "یکشنبه", revenue: Math.round(w.value * 0.12) },
          { day: "دوشنبه", revenue: Math.round(w.value * 0.18) },
          { day: "سه‌شنبه", revenue: Math.round(w.value * 0.20) },
          { day: "چهارشنبه", revenue: Math.round(w.value * 0.15) },
          { day: "پنج‌شنبه", revenue: Math.round(w.value * 0.12) },
          { day: "جمعه", revenue: Math.round(w.value * 0.08) },
        ]
      : [];
  }, [viewType, series, activeWeek]);

  const fmt = (n) => (n == null ? "—" : n.toLocaleString("fa-IR"));

  // ── دریافت داده نمودار ────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchChart = async () => {
      try {
        setLoading(true);
        setError(null);
        setApiErrors((prev) => ({ ...prev, chart: null }));

        const year = new Date().getFullYear();
        const month = monthMap[activeMonth];

        const endpoint =
          valueType === "revenue"
            ? `/report/weekly/sales/${year}/${month}/`
            : `/report/weekly/orders/${year}/${month}/`;

        const res = await api.get(endpoint, { signal: controller.signal });

        const chartData = (res.data.labels || []).map((label, index) => ({
          week: label,
          value: res.data.values?.[index] ?? 0,
        }));

        setSeries(chartData);
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("Chart API Error:", err);
        const status = err.response?.status;
        const msg = status === 404 
          ? "API یافت نشد — لطفاً URL بک‌اند را بررسی کنید" 
          : "خطا در دریافت داده نمودار";
        setApiErrors((prev) => ({ ...prev, chart: msg }));
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
    return () => controller.abort();
  }, [activeMonth, valueType]);

  // ── دریافت سرویس‌های پرفروش ───────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchTopServices = async () => {
      try {
        setApiErrors((prev) => ({ ...prev, topServices: null }));
        const res = await api.get("/report/analytics/top-services/", {
          signal: controller.signal,
        });

        setTopServices(
          (res.data.results || []).map((item) => ({
            id: item.pricing_tab_id,
            name: item.pricing_tab__tab_name || "—",
            count: item.usage_count || 0,
          }))
        );
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("Top Services API Error:", err);
        const status = err.response?.status;
        const msg = status === 404
          ? "API سرویس‌ها یافت نشد"
          : "خطا در دریافت سرویس‌ها";
        setApiErrors((prev) => ({ ...prev, topServices: msg }));
        setTopServices([]);
      }
    };

    fetchTopServices();
    return () => controller.abort();
  }, []);

  // ── دریافت خلاصه KPI ─────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchSummary = async () => {
      try {
        setApiErrors((prev) => ({ ...prev, summary: null }));
        const res = await api.get("/report/total-orders/", {
          signal: controller.signal,
        });

        setSummary({
          total_revenue: res.data.revenue,
          orders_count: res.data.orders,
        });
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("Summary API Error:", err);
        const status = err.response?.status;
        const msg = status === 404
          ? "API خلاصه یافت نشد"
          : "خطا در دریافت خلاصه";
        setApiErrors((prev) => ({ ...prev, summary: msg }));
      }
    };

    fetchSummary();
    return () => controller.abort();
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
        <h1 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold text-gray-800 dark:text-gray-200 mb-8">
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
                  ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] border border-gray-300 dark:border-gray-600 shadow-md text-gray-800 dark:text-white scale-105"
                  : "bg-white/70 dark:bg-[#262B40] hover:bg-white dark:hover:bg-[#2d3350] border border-gray-200 dark:border-gray-600 shadow-md text-gray-800 dark:text-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <KPICard 
            title="فروش کل" 
            value={fmt(summary?.total_revenue)} 
          />
          <KPICard 
            title="تعداد سفارش‌ها" 
            value={fmt(summary?.orders_count)} 
          />
        </div>
        {apiErrors.summary && (
          <div className="text-xs text-red-400 mb-4 text-center">
            {apiErrors.summary}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-4 rounded-3xl bg-white/30 dark:bg-[#262B40]/90 backdrop-blur-lg border border-sky-200/50 dark:border-gray-600/50 shadow-xl">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200 w-full sm:w-auto text-center sm:text-start">
              نمودار فروش ({activeMonth})
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 w-full">
              <div className="flex flex-col sm:flex-row sm:gap-2 w-full sm:w-auto">
                {/* دکمه‌های هفته قبل/بعد (فقط در حالت روزانه) */}
                <div className="flex gap-2 justify-center sm:justify-start mb-2 sm:mb-0">
                  <button
                    onClick={() => setActiveWeek((w) => Math.max(0, w - 1))}
                    disabled={viewType === "week" || activeWeek === 0}
                    className="h-10 px-4 text-xs whitespace-nowrap rounded-2xl font-medium bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] shadow text-gray-800 dark:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer sm:h-9 sm:px-3.5 sm:text-sm lg:h-10 lg:px-4"
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
                    className="h-10 px-4 text-xs whitespace-nowrap rounded-2xl font-medium bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] shadow text-gray-800 dark:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer sm:h-9 sm:px-3.5 sm:text-sm lg:h-10 lg:px-4"
                  >
                    هفته بعد
                  </button>
                </div>

                {/* Toggles */}
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

            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : apiErrors.chart ? (
              <div className="flex flex-col items-center justify-center h-80 text-red-500 gap-3">
                <span>{apiErrors.chart}</span>
                <span className="text-xs text-gray-500">
                  بررسی کنید: آیا Django روشن است؟ URL درست است؟
                </span>
              </div>
            ) : (
              <RevenueChart
                data={dataForChart}
                xKey={viewType === "week" ? "week" : "day"}
              />
            )}
          </div>

          <div className="p-4 rounded-3xl bg-white/30 dark:bg-[#262B40]/90 backdrop-blur-lg border border-sky-200/50 dark:border-gray-600/50 shadow-xl">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">
              سرویس‌های پرفروش
            </h3>
            {apiErrors.topServices ? (
              <div className="text-sm text-red-400 text-center py-8">
                {apiErrors.topServices}
              </div>
            ) : (
              <TopServices list={topServices} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}